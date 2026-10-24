// Son joué pour une alerte : celui de son type, le resub retombant sur le son du sub.
// Même règle côté overlay (src/client/hooks/useAlertSound.js).
export function soundFor(alert, sounds) {
    const key = alert.kind === 'sub' && alert.months > 1 ? 'resub' : alert.kind;
    if (sounds[key]?.file) return sounds[key];
    if (key === 'resub' && sounds.sub?.file) return sounds.sub;
    return null;
}
