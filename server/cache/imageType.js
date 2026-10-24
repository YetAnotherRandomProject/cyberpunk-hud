// Reconnaît le format d'une image à ses premiers octets (« magic bytes »),
// sans faire confiance à l'en-tête Content-Type ni à l'extension.
const SIGNATURES = [
    { type: 'image/png', ext: 'png', test: b => b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' },
    { type: 'image/gif', ext: 'gif', test: b => b.toString('ascii', 0, 4) === 'GIF8' },
    { type: 'image/jpeg', ext: 'jpg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    { type: 'image/webp', ext: 'webp', test: b => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
    { type: 'image/avif', ext: 'avif', test: b => b.toString('ascii', 4, 8) === 'ftyp' && b.toString('ascii', 8, 12).startsWith('avi') }
];

// Retourne { type, ext } si le contenu est une image reconnue, sinon null.
export function detectImageType(buffer) {
    if (!buffer || buffer.length < 12) return null;
    const match = SIGNATURES.find(signature => signature.test(buffer));
    return match ? { type: match.type, ext: match.ext } : null;
}
