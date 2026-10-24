const TIMEOUT_MS = 8000;

/**
 * Durée d'un fichier audio en millisecondes, lue dans ses métadonnées par le navigateur.
 * Retourne 0 si elle est inconnue (format illisible, flux sans durée, délai dépassé).
 */
export function measureAudioDuration(src) {
    return new Promise(resolve => {
        const audio = new Audio();
        const done = ms => {
            clearTimeout(timer);
            audio.removeAttribute('src');
            resolve(ms);
        };
        const timer = setTimeout(() => done(0), TIMEOUT_MS);
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
        audio.onerror = () => done(0);
        audio.src = src;
    });
}

export async function measureFileDuration(file) {
    const url = URL.createObjectURL(file);
    try {
        return await measureAudioDuration(url);
    } finally {
        URL.revokeObjectURL(url);
    }
}
