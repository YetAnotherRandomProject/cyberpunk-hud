import express from 'express';
import { defaultConfig } from '../config/defaults.js';
import { exportConfig } from '../config/exportConfig.js';
import { listOpenWindows } from '../telemetry/system/windows.js';

const TEST_ALERTS = {
    follow: { kind: 'follow', user: 'V' },
    raid: { kind: 'raid', user: 'JohnnySilverhand', viewers: 2077 },
    sub: { kind: 'sub', user: 'Panam', tier: 1, months: 1, message: null },
    resub: { kind: 'sub', user: 'Judy', tier: 2, months: 14, message: 'Toujours là, choom.' },
    giftsub: { kind: 'giftsub', user: 'RogueAmendiares', tier: 1, count: 5, total: 77 },
    cheer: { kind: 'cheer', user: 'Takemura', bits: 1000, message: 'Pour Arasaka.' }
};

export function createApiRouter({ configStore, twitchAuth, frameRateSource, emitAlert, onRestartRequest }) {
    const router = express.Router();

    router.get('/config', (req, res) => res.json(configStore.get()));

    router.get('/config/defaults', (req, res) => res.json(defaultConfig));

    // Téléchargement de la configuration de l'overlay, sans Client ID, secret ni mot de passe OBS.
    router.get('/config/export', (req, res) => {
        const date = new Date().toISOString().slice(0, 10);
        res.attachment(`cyberpunk-hud-overlay-${date}.json`);
        res.type('application/json').send(JSON.stringify(exportConfig(configStore.get()), null, 2));
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
        emitAlert(alert, { force: true });
        res.json({ status: 'sent' });
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
