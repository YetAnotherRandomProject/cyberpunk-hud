import path from 'node:path';
import { readJsonFile, writeJsonFile } from '../utils/jsonFile.js';

/**
 * Cache de réponses JSON, en mémoire et sur disque (survit aux redémarrages).
 * Une entrée plus vieille que son TTL est rechargée ; si le rechargement échoue,
 * l'ancienne valeur est servie plutôt que rien.
 */
export class JsonCache {
    #dir;
    #memory = new Map();
    #inFlight = new Map();

    constructor(dir) {
        this.#dir = dir;
    }

    async get(key, ttlMs, loader) {
        const entry = this.#read(key);
        if (entry && Date.now() - entry.savedAt < ttlMs) return entry.value;

        // Une seule requête à la fois par clé, même si plusieurs appels arrivent ensemble.
        if (this.#inFlight.has(key)) return this.#inFlight.get(key);
        const pending = (async () => {
            try {
                const value = await loader();
                this.#write(key, value);
                return value;
            } catch (err) {
                if (entry) return entry.value;
                throw err;
            } finally {
                this.#inFlight.delete(key);
            }
        })();
        this.#inFlight.set(key, pending);
        return pending;
    }

    #read(key) {
        if (!this.#memory.has(key)) {
            const stored = readJsonFile(this.#filePath(key), null);
            if (stored) this.#memory.set(key, stored);
        }
        return this.#memory.get(key) ?? null;
    }

    #write(key, value) {
        const entry = { savedAt: Date.now(), value };
        this.#memory.set(key, entry);
        writeJsonFile(this.#filePath(key), entry);
    }

    #filePath(key) {
        return path.join(this.#dir, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`);
    }
}
