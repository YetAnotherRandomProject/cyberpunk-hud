import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Sons possibles : un par type d'alerte, le resub pouvant avoir le sien.
export const SOUND_KINDS = ['follow', 'raid', 'sub', 'resub', 'giftsub', 'cheer'];
export const MAX_SOUND_BYTES = 10 * 1024 * 1024;

const EXTENSIONS = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', webm: 'audio/webm', flac: 'audio/flac' };
// Nom d'un fichier enregistré par l'application : « follow-<uuid>.mp3 ».
const STORED_NAME = new RegExp(`^(${SOUND_KINDS.join('|')})-[0-9a-f-]{36}\\.(${Object.keys(EXTENSIONS).join('|')})$`);

export const isStoredSoundName = name => STORED_NAME.test(String(name));

export function soundExtension(fileName) {
    const ext = path.extname(String(fileName)).slice(1).toLowerCase();
    if (!EXTENSIONS[ext]) {
        throw new Error(`Format non pris en charge : utilisez ${Object.keys(EXTENSIONS).join(', ')}.`);
    }
    return ext;
}

/** Fichiers audio des alertes, dans un dossier dédié du profil de l'application. */
export class SoundStore {
    #dir;

    constructor(dir) {
        this.#dir = dir;
    }

    get dir() {
        return this.#dir;
    }

    // Enregistre un son et retourne le nom de fichier attribué.
    save(kind, bytes, originalName) {
        if (!SOUND_KINDS.includes(kind)) throw new Error('Type d\'alerte inconnu');
        if (bytes.length === 0) throw new Error('Fichier vide');
        if (bytes.length > MAX_SOUND_BYTES) throw new Error('Fichier trop lourd (10 Mo maximum)');
        const file = `${kind}-${randomUUID()}.${soundExtension(originalName)}`;
        fs.mkdirSync(this.#dir, { recursive: true });
        fs.writeFileSync(path.join(this.#dir, file), bytes);
        return file;
    }

    read(file) {
        if (!isStoredSoundName(file)) return null;
        try {
            return fs.readFileSync(path.join(this.#dir, file));
        } catch {
            return null;
        }
    }

    // Supprime les fichiers que la configuration ne référence plus.
    prune(keepFiles) {
        const keep = new Set(keepFiles.filter(Boolean));
        let entries = [];
        try {
            entries = fs.readdirSync(this.#dir);
        } catch {
            return;
        }
        for (const file of entries) {
            if (isStoredSoundName(file) && !keep.has(file)) fs.rmSync(path.join(this.#dir, file), { force: true });
        }
    }
}
