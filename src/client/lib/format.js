const pad = n => String(n).padStart(2, '0');

export function formatUptime(totalSeconds) {
    const hrs = pad(Math.floor(totalSeconds / 3600));
    const mins = pad(Math.floor((totalSeconds % 3600) / 60));
    const secs = pad(totalSeconds % 60);
    return `${hrs}H ${mins}M ${secs}S`;
}

export function formatHudClock(date, yearPrefix) {
    const day = `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    return `${yearPrefix}.${day} // ${time}`;
}

export const upper = (text, maxLength = Infinity) => String(text).toUpperCase().slice(0, maxLength);

/**
 * Remplit un modèle de texte : {clé} est remplacée par values[clé] (vide si absente),
 * et {s} par « S » quand `count` dépasse 1 (pluriel du nombre principal).
 */
export function fillTemplate(template, values = {}, count = 1) {
    return String(template ?? '').replace(/\{(\w+)\}/g, (match, key) => {
        if (key === 's') return count > 1 ? 'S' : '';
        return values[key] ?? '';
    });
}
