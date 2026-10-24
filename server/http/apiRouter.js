import express from 'express';
import { defaultConfig } from '../config/defaults.js';
import { buildArchive, importArchive } from '../config/configArchive.js';
import { ALERT_KINDS } from '../alerts/AlertQueue.js';
import { MAX_SOUND_BYTES, SOUND_KINDS } from '../alerts/SoundStore.js';
import { listOpenWindows } from '../telemetry/system/windows.js';

const TEST_ALERTS = {
    follow: { kind: 'follow', user: 'V' },
    raid: { kind: 'raid', user: 'JohnnySilverhand', viewers: 2077 },
    sub: { kind: 'sub', user: 'Panam', tier: 1, months: 1, message: null },
    resub: { kind: 'sub', user: 'Judy', tier: 2, months: 14, message: 'Toujours là, choom.' },
    giftsub: { kind: 'giftsub', user: 'RogueAmendiares', tier: 1, count: 5, total: 77 },
    cheer: { kind: 'cheer', user: 'Takemura', bits: 1000, message: 'Pour Arasaka.' }
};

export function createApiRouter({ configStore, twitchAuth, frameRateSource, alertQueue, soundStore, emitAlert, onRestartRequest }) {
    const router = express.Router();

    router.get('/config', (req, res) => res.json(configStore.get()));

    router.get('/config/defaults', (req, res) => res.json(defaultConfig));

    // Archive .zip de l'overlay (config sans Client ID, secret ni mot de passe OBS, et sons des alertes).
    router.get('/config/export', (req, res) => {
        const date = new Date().toISOString().slice(0, 10);
        res.attachment(`cyberpunk-hud-overlay-${date}.zip`);
        res.type('application/zip').send(Buffer.from(buildArchive(configStore.get(), soundStore)));
    });

    // Applique une archive (ou un ancien export .json) en conservant les secrets et le port locaux.
    // Le fichier arrive brut (application/octet-stream).
    router.post('/config/import', express.raw({ type: () => true, limit: '80mb' }), (req, res) => {
        try {
            // Envoyé en application/json, le corps a déjà été lu par express.json.
            const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? null));
            res.json(importArchive(bytes, { configStore, soundStore }));
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    router.put('/config', (req, res) => {
        res.json(configStore.update(req.body ?? {}));
    });

    router.get('/twitch/auth', (req, res) => res.json(twitchAuth.status()));

    router.post('/twitch/auth/start', async (req, res) => {
        try {
            await twitchAuth.startDeviceFlow();
            res.json(twitchAuth.status());
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/twitch/auth/cancel', (req, res) => {
        twitchAuth.cancel();
        res.json(twitchAuth.status());
    });

    router.post('/twitch/auth/logout', async (req, res) => {
        await twitchAuth.logout();
        res.json(twitchAuth.status());
    });

    router.post('/alerts/test', (req, res) => {
        const alert = TEST_ALERTS[req.body?.kind];
        if (!alert) return res.status(400).json({ error: 'Type d\'alerte inconnu' });
        emitAlert({ ...alert, test: true }, { force: true });
        res.json({ status: 'sent' });
    });

    // --- File d'attente des alertes (l'état complet est diffusé par WebSocket : ALERT_QUEUE)
    router.delete('/alerts/queue/:id', (req, res) => {
        alertQueue.remove(req.params.id);
        res.json(alertQueue.state());
    });

    // Vide les alertes en attente : toutes, ou d'un type (?kind=follow).
    router.delete('/alerts/queue', (req, res) => {
        const kind = req.query.kind ? String(req.query.kind) : null;
        if (kind && !ALERT_KINDS.includes(kind)) return res.status(400).json({ error: 'Type d\'alerte inconnu' });
        alertQueue.clear(kind);
        res.json(alertQueue.state());
    });

    router.post('/alerts/skip', (req, res) => {
        alertQueue.skip();
        res.json(alertQueue.state());
    });

    router.post('/alerts/pause', (req, res) => {
        const { kind, paused } = req.body ?? {};
        if (!ALERT_KINDS.includes(kind)) return res.status(400).json({ error: 'Type d\'alerte inconnu' });
        alertQueue.setPaused(kind, Boolean(paused));
        res.json(alertQueue.state());
    });

    // --- Sons des alertes : fichier brut, nom d'origine dans l'en-tête X-File-Name et durée
    // mesurée par le navigateur dans X-Duration-Ms (0 si inconnue : le panneau la mesurera).
    router.put('/sounds/:kind', express.raw({ type: () => true, limit: MAX_SOUND_BYTES }), (req, res) => {
        const { kind } = req.params;
        if (!SOUND_KINDS.includes(kind)) return res.status(400).json({ error: 'Type d\'alerte inconnu' });
        try {
            const name = decodeURIComponent(String(req.get('X-File-Name') ?? ''));
            const measured = Math.round(Number(req.get('X-Duration-Ms')));
            const durationMs = Number.isFinite(measured) && measured > 0 ? measured : 0;
            const file = soundStore.save(kind, req.body, name);
            const current = configStore.get().alerts.sounds[kind];
            const next = configStore.update({ alerts: { sounds: { [kind]: { ...current, file, name, durationMs } } } });
            soundStore.prune(Object.values(next.alerts.sounds).map(sound => sound.file));
            res.json(next);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/sounds/:kind', (req, res) => {
        const { kind } = req.params;
        if (!SOUND_KINDS.includes(kind)) return res.status(400).json({ error: 'Type d\'alerte inconnu' });
        const current = configStore.get().alerts.sounds[kind];
        const next = configStore.update({ alerts: { sounds: { [kind]: { ...current, file: '', name: '', durationMs: 0 } } } });
        soundStore.prune(Object.values(next.alerts.sounds).map(sound => sound.file));
        res.json(next);
    });

    router.get('/system/windows', async (req, res) => {
        try {
            res.json(await listOpenWindows());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/system/fps/restart', (req, res) => {
        frameRateSource.restart();
        res.json({ status: 'restarted' });
    });

    router.post('/restart', (req, res) => {
        if (!onRestartRequest) {
            return res.status(501).json({ error: 'Redémarrez le serveur manuellement.' });
        }
        res.json({ status: 'restarting' });
        setTimeout(onRestartRequest, 200);
    });

    return router;
}
