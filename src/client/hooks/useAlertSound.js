import { useEffect } from 'react';

// Au-delà, l'alerte était déjà affichée avant le chargement de la page : pas de son rejoué.
const MAX_START_DELAY_MS = 1500;

export const soundKeyFor = alert => (alert.kind === 'sub' && alert.months > 1 ? 'resub' : alert.kind);

/**
 * Joue le son associé au type de l'alerte affichée (le resub retombe sur le son du sub).
 * Le son s'arrête si l'alerte est retirée ou passée avant la fin.
 */
export function useAlertSound(alert, sounds) {
    useEffect(() => {
        if (!alert || !sounds || Date.now() - alert.shownAt > MAX_START_DELAY_MS) return undefined;
        const key = soundKeyFor(alert);
        const sound = sounds[key]?.file ? sounds[key] : (key === 'resub' ? sounds.sub : null);
        if (!sound?.file) return undefined;

        const audio = new Audio(`/sounds/${encodeURIComponent(sound.file)}`);
        audio.volume = Math.min(1, Math.max(0, sound.volume));
        audio.play().catch(() => {}); // lecture bloquée hors d'OBS sans interaction : rien à faire
        return () => audio.pause();
        // Uniquement à chaque nouvelle alerte, pas à chaque changement de réglage.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alert?.id]);
}
