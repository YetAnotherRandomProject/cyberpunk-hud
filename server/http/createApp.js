import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createApiRouter } from './apiRouter.js';
import { isAllowedMediaUrl } from '../cache/MediaCache.js';
import { isStoredSoundName } from '../alerts/SoundStore.js';

export function createApp({ clientDir, mediaCache, ...apiDeps }) {
    const app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(apiDeps));
    app.use('/api', (err, req, res, next) => {
        if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Fichier trop lourd' });
        next(err);
    });

    // Sons des alertes envoyés par l'utilisateur : seuls les noms générés par SoundStore sont servis.
    app.get('/sounds/:file', (req, res) => {
        const { file } = req.params;
        if (!isStoredSoundName(file)) return res.sendStatus(404);
        res.sendFile(path.join(apiDeps.soundStore.dir, file), { maxAge: '1y', immutable: true }, err => {
            if (err && !res.headersSent) res.sendStatus(404);
        });
    });

    // Images d'emotes et de badges servies depuis le cache disque (/media?u=<url d'origine>).
    app.get('/media', async (req, res) => {
        const url = String(req.query.u ?? '');
        if (!isAllowedMediaUrl(url)) return res.sendStatus(404);
        try {
            const { filePath, contentType } = await mediaCache.get(url);
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            res.type(contentType).sendFile(filePath);
        } catch (err) {
            // Téléchargement impossible côté serveur : la page tente le CDN directement.
            console.warn('[MEDIA] Cache impossible pour', url, ':', err.message);
            res.set('Cache-Control', 'no-store');
            res.redirect(302, url);
        }
    });

    const indexHtml = path.join(clientDir, 'index.html');
    app.use(express.static(clientDir));
    // Routage côté client : /overlay et / servent la même application React.
    app.get('*', (req, res) => {
        if (!fs.existsSync(indexHtml)) {
            return res.status(503).send('Interface non compilée : lancez "npm run build".');
        }
        res.sendFile(indexHtml);
    });

    return app;
}
