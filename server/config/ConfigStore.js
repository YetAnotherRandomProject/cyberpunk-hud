import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { defaultConfig } from './defaults.js';
import { conformTo, deepMerge } from '../utils/objects.js';
import { migrateConfig } from './migrations.js';

// Configuration persistée dans un fichier JSON. Émet 'change' (next, prev) à chaque mise à jour.
export class ConfigStore extends EventEmitter {
    #filePath;
    #config;

    constructor(filePath) {
        super();
        this.#filePath = filePath;
        this.#config = this.#load();
    }

    get() {
        return this.#config;
    }

    update(patch) {
        const prev = this.#config;
        const next = conformTo(defaultConfig, deepMerge(prev, patch));
        this.#config = next;
        this.#write(next);
        this.emit('change', next, prev);
        return next;
    }

    #load() {
        if (fs.existsSync(this.#filePath)) {
            try {
                return conformTo(defaultConfig, migrateConfig(JSON.parse(fs.readFileSync(this.#filePath, 'utf-8'))));
            } catch (err) {
                console.warn(`[CONFIG] Fichier illisible (${err.message}), valeurs par défaut utilisées.`);
            }
        }
        const fresh = conformTo(defaultConfig, {});
        this.#write(fresh);
        return fresh;
    }

    #write(config) {
        fs.mkdirSync(path.dirname(this.#filePath), { recursive: true });
        const tmpPath = `${this.#filePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
        fs.renameSync(tmpPath, this.#filePath);
    }
}
