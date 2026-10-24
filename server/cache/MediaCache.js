import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readJsonFile, writeJsonFile } from '../utils/jsonFile.js';
import { detectImageType } from './imageType.js';

// Seuls les CDN d'emotes et de badges peuvent être mis en cache (pas de proxy ouvert).
const ALLOWED_HOSTS = new Set([
    'static-cdn.jtvnw.net',
    'cdn.7tv.app',
    'cdn.betterttv.net',
    'cdn.frankerfacez.com'
]);
const DOWNLOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

export function isAllowedMediaUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.host);
    } catch {
        return false;
    }
}

/**
 * Images d'emotes et de badges téléchargées une seule fois puis servies
 * depuis le disque. Le contenu d'une URL de ces CDN ne change pas, le cache
 * n'expire donc jamais. Seules des images valides (format vérifié sur leur
 * contenu) sont enregistrées et servies.
 */
export class MediaCache {
    #dir;
    #inFlight = new Map();

    constructor(dir) {
        this.#dir = dir;
    }

    // Retourne { filePath, contentType } pour l'URL d'origine, en la téléchargeant si besoin.
    async get(url) {
        if (!isAllowedMediaUrl(url)) throw new Error('URL non autorisée');

        const key = createHash('sha1').update(url).digest('hex');
        const cached = this.#readCached(key);
        if (cached) return cached;

        if (!this.#inFlight.has(key)) {
            this.#inFlight.set(key, this.#download(url, key).finally(() => this.#inFlight.delete(key)));
        }
        return this.#inFlight.get(key);
    }

    #readCached(key) {
        const meta = readJsonFile(path.join(this.#dir, `${key}.json`), null);
        if (!meta?.file) return null;
        const filePath = path.join(this.#dir, meta.file);
        try {
            if (fs.statSync(filePath).size > 0) return { filePath, contentType: meta.contentType };
        } catch {
            // Fichier disparu : il sera retéléchargé.
        }
        return null;
    }

    async #download(url, key) {
        let lastError = null;
        for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
            try {
                return await this.#downloadOnce(url, key);
            } catch (err) {
                lastError = err;
                if (attempt < DOWNLOAD_ATTEMPTS) await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
            }
        }
        throw lastError;
    }

    async #downloadOnce(url, key) {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buffer = Buffer.from(await res.arrayBuffer());
        const image = detectImageType(buffer);
        if (!image) throw new Error('Contenu reçu qui n\'est pas une image');

        // Le dossier peut avoir été vidé entre-temps : on le recrée à chaque écriture.
        fs.mkdirSync(this.#dir, { recursive: true });
        const file = `${key}.${image.ext}`;
        const filePath = path.join(this.#dir, file);
        fs.writeFileSync(filePath, buffer);
        // Métadonnées écrites en dernier : leur présence garantit que l'image est complète.
        writeJsonFile(path.join(this.#dir, `${key}.json`), { url, file, contentType: image.type });
        return { filePath, contentType: image.type };
    }
}
