import fs from 'node:fs';
import path from 'node:path';

export function readJsonFile(filePath, fallback = null) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return fallback;
    }
}

// Écriture atomique : un crash pendant l'écriture ne laisse jamais un fichier tronqué.
export function writeJsonFile(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
}
