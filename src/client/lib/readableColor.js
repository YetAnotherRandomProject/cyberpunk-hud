// Éclaircit les couleurs de pseudo trop sombres pour rester lisibles sur le fond du HUD.
export function readableColor(hex) {
    const n = Number.parseInt(String(hex).replace('#', ''), 16);
    if (Number.isNaN(n)) return hex;

    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    if (luminance >= 0.45) return hex;

    const mix = 0.45;
    const [r, g, b] = rgb.map(c => Math.round(c + (255 - c) * mix));
    return `rgb(${r}, ${g}, ${b})`;
}
