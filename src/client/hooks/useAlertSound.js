import { useEffect } from 'react';

// Au-delà, l'alerte était déjà affichée avant le chargement de la page : pas de son rejoué.
const MAX_START_DELAY_MS = 1500;

// Même règle que le serveur (server/alerts/alertSound.js), qui attend la fin du son
// avant l'alerte suivante : le resub retombe sur le son du sub.
function soundFor(alert, sounds) {
    const key = alert.kind === 'sub' && alert.months > 1 ? 'resub' : alert.kind;
    if (sounds[key]?.file) return sounds[key];
    if (key === 'resub' && sounds.sub?.file) return sounds.sub;
    return null;
}

/**
 * Joue le son associé au type de l'alerte affichée (le resub retombe sur le son du sub).
 * Le son s'arrête si l'alerte est retirée ou passée avant la fin.
 */
export function useAlertSound(alert, sounds) {
    useEffect(() => {
        if (!alert || !sounds || Date.now() - alert.shownAt > MAX_START_DELAY_MS) return undefined;
        const sound = soundFor(alert, sounds);
        if (!sound) return undefined;

        const audio = new Audio(`/sounds/${encodeURIComponent(sound.file)}`);
        audio.volume = Math.min(1, Math.max(0, sound.volume));
        audio.play().catch(() => {}); // lecture bloquée hors d'OBS sans interaction : rien à faire
        return () => audio.pause();
        // Uniquement à chaque nouvelle alerte, pas à chaque changement de réglage.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alert?.id]);
}
