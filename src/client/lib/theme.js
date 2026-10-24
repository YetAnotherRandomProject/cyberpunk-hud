function hexToRgb(hex) {
    const clean = String(hex).replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const n = Number.parseInt(full, 16);
    if (full.length !== 6 || Number.isNaN(n)) return '77, 238, 234';
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// Variables CSS de l'overlay calculées depuis les couleurs du thème.
// Les composantes RVB permettent d'écrire rgba(var(--hud-primary-rgb), 0.3) dans les feuilles de style.
export function themeVariables(theme) {
    return {
        '--hud-primary': theme.primary,
        '--hud-primary-rgb': hexToRgb(theme.primary),
        '--hud-highlight': theme.highlight,
        '--hud-highlight-rgb': hexToRgb(theme.highlight),
        '--hud-positive': theme.positive,
        '--hud-positive-rgb': hexToRgb(theme.positive),
        '--hud-negative': theme.negative,
        '--hud-negative-rgb': hexToRgb(theme.negative)
    };
}

export function withAlpha(hex, alpha) {
    return `rgba(${hexToRgb(hex)}, ${alpha})`;
}
