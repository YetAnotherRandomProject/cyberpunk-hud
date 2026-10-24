import { EventEmitter } from 'node:events';

// Métriques pour lesquelles une baisse est une bonne nouvelle (flèche verte).
const LOWER_IS_BETTER = new Set(['CPU', 'RAM', 'DRP', 'FRM']);
// Nombre de valeurs réelles conservées par métrique pour les courbes.
const HISTORY_LENGTH = 30;

// État télémétrique strict : tout reste à null tant qu'aucune vraie donnée n'est récupérée.
// Les sources modifient l'état puis appellent commit() pour diffuser un instantané.
export class TelemetryState extends EventEmitter {
    obs = { connected: false, error: null, scene: null, uptimeSeconds: null };
    twitch = {
        source: 'public',
        error: null,
        name: null,
        title: null,
        category: null,
        language: null,
        broadcasterType: null,
        isLive: false,
        startedAt: null,
        lastFollower: null,
        eventSub: null
    };
    chat = { connected: false, error: null };
    // Derniers événements de la chaîne reçus en direct (voir RecentEvents).
    recent = { sub: null, giftsub: null, cheer: null, raid: null };
    // Mesure des FPS du jeu. status : 'off' | 'waiting' | 'running' | 'error'
    fps = { status: 'off', error: null, process: null, detail: null };
    metrics = {};
    // Historique des valeurs reçues, gardé côté serveur pour qu'un overlay rechargé
    // dans OBS affiche immédiatement ses courbes.
    history = {};

    setMetric(key, rawValue, unit = '', decimals = 1) {
        const n = Number(rawValue);
        if (rawValue === null || rawValue === undefined || !Number.isFinite(n)) {
            this.removeMetrics(key);
            return;
        }

        const value = decimals === 0 ? Math.round(n) : Number(n.toFixed(decimals));
        const existing = this.metrics[key];
        let diff = existing?.diff ?? null;
        let up = existing?.up ?? true;

        if (existing) {
            const delta = value - existing.value;
            if (Math.abs(delta) > 0.005) {
                const formatted = decimals === 0 ? Math.round(delta) : delta.toFixed(decimals);
                diff = `${delta > 0 ? '+' : ''}${formatted}${unit}`;
                up = LOWER_IS_BETTER.has(key) ? delta <= 0 : delta >= 0;
            }
        }

        this.metrics[key] = { value, unit, diff, up };
        this.history[key] = [...(this.history[key] ?? []), value].slice(-HISTORY_LENGTH);
    }

    // Une métrique qui disparaît perd aussi son historique (pas de courbe figée périmée).
    removeMetrics(...keys) {
        keys.forEach(key => {
            delete this.metrics[key];
            delete this.history[key];
        });
    }

    commit() {
        this.emit('change', this.snapshot());
    }

    snapshot() {
        const twitchUptime = this.twitch.startedAt
            ? Math.floor((Date.now() - this.twitch.startedAt) / 1000)
            : null;

        return {
            obsConnected: this.obs.connected,
            obsError: this.obs.error,
            twitchError: this.twitch.error,
            twitchSource: this.twitch.source,
            twitchEvents: this.twitch.eventSub,
            chatConnected: this.chat.connected,
            chatError: this.chat.error,
            fps: { ...this.fps },
            streamer: {
                name: this.twitch.name,
                category: this.twitch.category,
                title: this.twitch.title,
                language: this.twitch.language,
                broadcasterType: this.twitch.broadcasterType,
                isLive: this.twitch.isLive,
                lastFollower: this.twitch.lastFollower,
                lastSub: this.recent.sub,
                lastGiftSub: this.recent.giftsub,
                lastCheer: this.recent.cheer,
                lastRaid: this.recent.raid,
                scene: this.obs.scene,
                uptimeSeconds: this.obs.uptimeSeconds ?? twitchUptime
            },
            metrics: { ...this.metrics },
            history: { ...this.history }
        };
    }
}
