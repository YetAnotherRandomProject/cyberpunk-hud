import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import {
    ERROR_ACCESS_DENIED, foregroundWindow, performanceFrequency, processImageName, stopTraceSession
} from './win32.mjs';

const SESSION_NAME = 'CyberpunkHUD-FPS';
const RETRY_DELAY_MS = 30_000;
// Le thread lit des fichiers du disque : hors de l'archive asar une fois l'application empaquetée.
// Là, aucun package.json ne déclare "type": "module" : d'où l'extension .mjs du worker et de win32.
const WORKER_PATH = fileURLToPath(new URL('./presentWorker.mjs', import.meta.url))
    .replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
// En dessous, la mesure d'un échantillon n'est pas fiable (application qui ne redessine qu'au besoin).
const MIN_FRAMES = 3;
// Ne sont jamais choisis automatiquement : bureau, compositeur, et le HUD lui-même.
const IGNORED_PROCESSES = new Set(['dwm.exe', 'explorer.exe', path.basename(process.execPath).toLowerCase()]);
const API_LABELS = { dxgi: 'DirectX 10/11/12', d3d9: 'Direct3D 9', kernel: 'Vulkan / OpenGL' };

const normalizeProcess = name => String(name ?? '').trim().toLowerCase().replace(/\.exe$/, '');

/**
 * FPS réels d'un jeu, mesurés directement par l'application grâce à ETW (Event Tracing
 * for Windows) : chaque image présentée par DirectX, Direct3D 9, Vulkan ou OpenGL y est signalée.
 * Deux modes :
 *  - 'auto'    : l'application au premier plan en plein écran (exclusif ou sans bordure)
 *  - 'process' : l'exécutable choisi dans les réglages (ex. Cyberpunk2077.exe)
 *
 * Windows réserve ETW aux administrateurs et au groupe « Utilisateurs du journal de performances ».
 */
export class FrameRateSource {
    #state;
    #settings = null;
    #worker = null;
    #retryTimer = null;
    #sampleTimer = null;
    #frequency = 0;
    // pid → Map(« api:id » → { count, first, last }) depuis le dernier échantillon
    #window = new Map();
    #names = new Map();
    #target = null;

    constructor(state) {
        this.#state = state;
    }

    configure(settings) {
        const prev = this.#settings;
        this.#settings = { ...settings };

        if (!this.#sampleTimer || prev.pollIntervalSec !== settings.pollIntervalSec) {
            clearInterval(this.#sampleTimer);
            this.#sampleTimer = setInterval(() => this.#sample(), Math.max(1, settings.pollIntervalSec) * 1000);
        }
        if (!prev || prev.fpsEnabled !== settings.fpsEnabled) {
            this.restart();
        } else if (prev.fpsMode !== settings.fpsMode || prev.fpsProcess !== settings.fpsProcess) {
            this.#target = null;
        }
    }

    restart() {
        this.#stopWorker();
        this.#start();
    }

    stop() {
        clearInterval(this.#sampleTimer);
        this.#sampleTimer = null;
        this.#stopWorker();
    }

    #setStatus(status, error = null) {
        Object.assign(this.#state.fps, { status, error, process: null, detail: null });
        this.#state.removeMetrics('FPS');
        this.#state.commit();
    }

    #start() {
        if (!this.#settings.fpsEnabled) return this.#setStatus('off');
        if (process.platform !== 'win32') return this.#setStatus('error', 'Mesure des FPS disponible uniquement sous Windows');

        try {
            this.#frequency = performanceFrequency();
        } catch (err) {
            return this.#setStatus('error', err.message);
        }
        this.#window.clear();
        this.#target = null;

        const worker = new Worker(WORKER_PATH, { workerData: { sessionName: SESSION_NAME } });
        this.#worker = worker;
        worker.on('message', msg => this.#onMessage(worker, msg));
        worker.on('error', err => this.#onFailure(worker, null, err.message));
        worker.on('exit', () => this.#onFailure(worker, null, 'La lecture des événements s\'est arrêtée'));
        this.#setStatus('waiting');
    }

    #stopWorker() {
        clearTimeout(this.#retryTimer);
        const worker = this.#worker;
        this.#worker = null;
        if (!worker) return;
        // Arrêter la session débloque ProcessTrace() : le thread se termine de lui-même.
        try {
            stopTraceSession(SESSION_NAME);
        } catch {
            // session déjà fermée
        }
        setTimeout(() => worker.terminate(), 2000).unref();
    }

    #onMessage(worker, msg) {
        if (worker !== this.#worker) return;
        switch (msg.type) {
            case 'batch':
                this.#merge(msg.rows);
                break;
            case 'warning':
                console.warn('[FPS]', msg.message);
                break;
            case 'error':
                this.#onFailure(worker, msg.code, msg.message);
                break;
            case 'ended':
                this.#onFailure(worker, null, 'La session de mesure a été fermée');
                break;
            default:
                break;
        }
    }

    #onFailure(worker, code, message) {
        if (worker !== this.#worker) return;
        this.#worker = null;
        worker.terminate();

        if (code === ERROR_ACCESS_DENIED) {
            // Inutile de réessayer : il faut changer les droits puis relancer.
            this.#setStatus('error', 'Droits insuffisants : lancez le HUD en administrateur, ou ajoutez votre compte '
                + 'au groupe « Utilisateurs du journal de performances » puis rouvrez la session Windows.');
            return;
        }
        this.#setStatus('error', message);
        this.#retryTimer = setTimeout(() => this.#start(), RETRY_DELAY_MS);
    }

    #merge(rows) {
        for (const [pid, key, count, first, last] of rows) {
            let series = this.#window.get(pid);
            if (!series) this.#window.set(pid, series = new Map());
            const entry = series.get(key);
            if (entry) {
                entry.count += count;
                entry.first = Math.min(entry.first, first);
                entry.last = Math.max(entry.last, last);
            } else {
                series.set(key, { count, first, last });
            }
        }
    }

    // Images par seconde de chaque processus qui présente, d'après ses événements les plus précis.
    #measure() {
        const result = new Map();
        for (const [pid, series] of this.#window) {
            // Une même image est signalée par l'API graphique et par le noyau : on retient une seule source,
            // DXGI en priorité, et pour chaque source l'événement le plus fréquent.
            for (const api of ['dxgi', 'd3d9', 'kernel']) {
                const best = [...series]
                    .filter(([key]) => key.startsWith(`${api}:`))
                    .map(([, entry]) => entry)
                    .sort((a, b) => b.count - a.count)[0];
                if (!best) continue;
                const seconds = (best.last - best.first) / this.#frequency;
                if (best.count >= MIN_FRAMES && seconds > 0) result.set(pid, { fps: (best.count - 1) / seconds, api });
                break;
            }
        }
        this.#window.clear();
        return result;
    }

    #nameOf(pid) {
        if (!this.#names.has(pid)) this.#names.set(pid, processImageName(pid));
        return this.#names.get(pid);
    }

    #sample() {
        if (!this.#worker) return;
        const presenting = this.#measure();
        // Les pid sont réutilisés par Windows : on oublie ceux qui ne présentent plus.
        for (const pid of this.#names.keys()) {
            if (!presenting.has(pid)) this.#names.delete(pid);
        }

        const target = this.#pickTarget(presenting);
        const fps = this.#state.fps;
        if (!target) {
            this.#target = null;
            this.#state.removeMetrics('FPS');
            Object.assign(fps, { status: 'waiting', error: null, process: null, detail: null });
        } else {
            this.#target = target.pid;
            this.#state.setMetric('FPS', target.fps, '', 0);
            const mode = target.exclusive ? 'plein écran exclusif' : target.fullscreen ? 'plein écran' : null;
            Object.assign(fps, {
                status: 'running',
                error: null,
                process: this.#nameOf(target.pid),
                detail: [API_LABELS[target.api], mode].filter(Boolean).join(' · ')
            });
        }
        this.#state.commit();
    }

    #pickTarget(presenting) {
        const withPid = pid => ({ pid, ...presenting.get(pid) });

        if (this.#settings.fpsMode === 'process') {
            const wanted = normalizeProcess(this.#settings.fpsProcess);
            if (!wanted) return null;
            // Plusieurs processus du même nom (lanceur + jeu) : celui qui affiche le plus d'images.
            return [...presenting.keys()]
                .filter(pid => normalizeProcess(this.#nameOf(pid)) === wanted)
                .map(withPid)
                .sort((a, b) => b.fps - a.fps)[0] ?? null;
        }

        let foreground = null;
        try {
            foreground = foregroundWindow();
        } catch {
            // bureau sécurisé (UAC, verrouillage) : pas de fenêtre accessible
        }
        const foregroundName = foreground?.fullscreen ? this.#nameOf(foreground.pid) : null;
        if (foregroundName && !IGNORED_PROCESSES.has(foregroundName.toLowerCase())) {
            // Les navigateurs et applications Electron dessinent depuis un processus GPU séparé
            // qui porte le même nom d'exécutable que la fenêtre.
            const match = [...presenting.keys()]
                .filter(pid => pid === foreground.pid || this.#nameOf(pid) === foregroundName)
                .map(withPid)
                .sort((a, b) => (b.pid === foreground.pid) - (a.pid === foreground.pid) || b.fps - a.fps)[0];
            if (match) return { ...match, fullscreen: true, exclusive: foreground.exclusive };
        }
        // Le jeu suivi reste mesuré quand il passe en arrière-plan (alt-tab vers OBS…) tant qu'il affiche des images.
        if (this.#target !== null && presenting.has(this.#target)) return withPid(this.#target);
        return null;
    }
}
