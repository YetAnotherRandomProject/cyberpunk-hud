import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { exportConfig, importPatch } from './exportConfig.js';
import { MAX_SOUND_BYTES, isStoredSoundName } from '../alerts/SoundStore.js';

const CONFIG_ENTRY = 'config.json';
const SOUNDS_DIR = 'sounds/';
const isZip = bytes => bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b; // « PK »

/**
 * Archive .zip partageable : config.json (sans secrets, voir exportConfig) et les sons
 * des alertes dans sounds/. Un son introuvable sur le disque est retiré de la config exportée.
 */
export function buildArchive(config, soundStore) {
    const exported = exportConfig(config);
    const entries = {};
    for (const sound of Object.values(exported.config.alerts.sounds)) {
        const bytes = sound.file ? soundStore.read(sound.file) : null;
        if (bytes) entries[`${SOUNDS_DIR}${sound.file}`] = [bytes, { level: 0 }]; // audio déjà compressé
        else Object.assign(sound, { file: '', name: '', durationMs: 0 });
    }
    entries[CONFIG_ENTRY] = strToU8(JSON.stringify(exported, null, 2));
    return zipSync(entries, { level: 6 });
}

/**
 * Applique un export (.zip, ou .json des versions précédentes sans les sons).
 * Les secrets et le port gardent leur valeur locale ; avec un .json, les sons aussi.
 * Retourne la nouvelle configuration.
 */
export function importArchive(bytes, { configStore, soundStore }) {
    let file;
    let sounds = null;
    try {
        if (isZip(bytes)) {
            const entries = unzipSync(bytes, {
                filter: entry => entry.name === CONFIG_ENTRY
                    || (entry.name.startsWith(SOUNDS_DIR) && entry.originalSize <= MAX_SOUND_BYTES)
            });
            if (!entries[CONFIG_ENTRY]) throw new Error('config.json absent');
            file = JSON.parse(strFromU8(entries[CONFIG_ENTRY]));
            sounds = entries;
        } else {
            file = JSON.parse(Buffer.from(bytes).toString('utf-8'));
        }
    } catch {
        throw new Error('Fichier illisible : choisissez un export Cyberpunk HUD (.zip ou .json).');
    }

    const patch = importPatch(file);
    if (patch.alerts?.sounds) {
        if (!sounds) {
            delete patch.alerts.sounds;
        } else {
            for (const [kind, sound] of Object.entries(patch.alerts.sounds)) {
                const data = isStoredSoundName(sound?.file) ? sounds[`${SOUNDS_DIR}${sound.file}`] : null;
                // Chaque son importé reçoit un nouveau nom : rien n'écrase un fichier existant.
                patch.alerts.sounds[kind] = data
                    ? { ...sound, file: soundStore.save(kind, data, sound.file) }
                    : { ...sound, file: '', name: '', durationMs: 0 };
            }
        }
    }

    const next = configStore.update(patch);
    soundStore.prune(Object.values(next.alerts.sounds).map(sound => sound.file));
    return next;
}
