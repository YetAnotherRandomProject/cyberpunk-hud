import OBSWebSocket from 'obs-websocket-js';

// CPU / RAM viennent du PC entier (SystemSource) et les FPS du jeu (FrameRateSource).
const OBS_METRICS = ['FRM', 'BIT', 'DRP'];
const RECONNECT_DELAY_MS = 8000;

// Connexion à OBS WebSocket v5 et lecture périodique des statistiques réelles.
export class ObsSource {
    #obs = new OBSWebSocket();
    #state;
    #settings = { enabled: false, url: '', password: '', pollIntervalSec: 2 };
    #connected = false;
    #connecting = false;
    #pollTimer = null;
    #reconnectTimer = null;
    #lastBytes = null;

    constructor(state) {
        this.#state = state;
        this.#obs.on('ConnectionClosed', () => {
            if (this.#connected) this.#markDisconnected(null);
            this.#scheduleReconnect();
        });
        this.#obs.on('CurrentProgramSceneChanged', ({ sceneName }) => {
            this.#state.obs.scene = sceneName || null;
            this.#state.commit();
        });
    }

    configure(settings) {
        const prev = this.#settings;
        this.#settings = { ...settings };

        if (prev.pollIntervalSec !== settings.pollIntervalSec || !this.#pollTimer) {
            clearInterval(this.#pollTimer);
            this.#pollTimer = setInterval(() => this.#poll(), Math.max(1, settings.pollIntervalSec) * 1000);
        }

        const connectionChanged = prev.enabled !== settings.enabled
            || prev.url !== settings.url
            || prev.password !== settings.password;
        if (connectionChanged) this.#reconnectNow();
    }

    async stop() {
        clearInterval(this.#pollTimer);
        clearTimeout(this.#reconnectTimer);
        this.#pollTimer = null;
        this.#settings = { ...this.#settings, enabled: false };
        await this.#obs.disconnect().catch(() => {});
    }

    async #reconnectNow() {
        clearTimeout(this.#reconnectTimer);
        if (this.#connected) {
            this.#markDisconnected(null);
            await this.#obs.disconnect().catch(() => {});
        }
        if (!this.#settings.enabled) {
            this.#state.obs.error = null;
            this.#state.commit();
            return;
        }
        await this.#connect();
    }

    #scheduleReconnect() {
        clearTimeout(this.#reconnectTimer);
        if (!this.#settings.enabled) return;
        this.#reconnectTimer = setTimeout(() => this.#connect(), RECONNECT_DELAY_MS);
    }

    async #connect() {
        if (this.#connected || this.#connecting || !this.#settings.enabled) return;
        this.#connecting = true;
        const { url, password } = this.#settings;

        try {
            await this.#obs.connect(url, password || undefined);
            this.#connected = true;
            this.#state.obs.connected = true;
            this.#state.obs.error = null;
            console.log('[OBS] Connecté à', url);

            const { currentProgramSceneName } = await this.#obs.call('GetCurrentProgramScene');
            this.#state.obs.scene = currentProgramSceneName || null;
        } catch (err) {
            this.#markDisconnected(describeError(err));
            this.#scheduleReconnect();
        } finally {
            this.#connecting = false;
            this.#state.commit();
        }
    }

    #markDisconnected(error) {
        this.#connected = false;
        this.#lastBytes = null;
        Object.assign(this.#state.obs, { connected: false, error, scene: null, uptimeSeconds: null });
        this.#state.removeMetrics(...OBS_METRICS);
    }

    async #poll() {
        if (!this.#connected) return;
        const state = this.#state;

        try {
            const stats = await this.#obs.call('GetStats');
            state.setMetric('FRM', stats.averageFrameRenderTime, 'ms', 2);

            const stream = await this.#obs.call('GetStreamStatus');
            if (stream.outputActive) {
                state.obs.uptimeSeconds = Math.floor(stream.outputDuration / 1000);
                this.#updateBitrate(stream.outputBytes);

                if (stream.outputTotalFrames > 0) {
                    state.setMetric('DRP', (stream.outputSkippedFrames / stream.outputTotalFrames) * 100, '%', 1);
                } else {
                    state.removeMetrics('DRP');
                }
            } else {
                // Pas de stream actif dans OBS : ni bitrate, ni drops, ni uptime OBS.
                state.obs.uptimeSeconds = null;
                this.#lastBytes = null;
                state.removeMetrics('BIT', 'DRP');
            }
        } catch (err) {
            this.#markDisconnected(describeError(err));
            this.#obs.disconnect().catch(() => {});
        }
        state.commit();
    }

    #updateBitrate(outputBytes) {
        const now = Date.now();
        const last = this.#lastBytes;
        if (last && outputBytes >= last.bytes) {
            const elapsedSec = (now - last.at) / 1000;
            if (elapsedSec > 0) {
                const kbps = ((outputBytes - last.bytes) * 8) / 1000 / elapsedSec;
                this.#state.setMetric('BIT', kbps, 'kb/s', 0);
            }
        }
        this.#lastBytes = { bytes: outputBytes, at: now };
    }
}

function describeError(err) {
    // 4009 = mot de passe refusé par OBS
    if (err?.code === 4009) return 'Mot de passe OBS incorrect';
    return err?.message || 'Connexion impossible';
}
