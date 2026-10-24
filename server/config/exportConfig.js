// Réglages qui ne doivent jamais quitter le PC : identifiants de l'application Twitch
// et mot de passe du WebSocket d'OBS.
const SECRET_PATHS = [
    ['twitch', 'clientId'],
    ['twitch', 'clientSecret'],
    ['obs', 'password']
];

// Réglages propres à ce PC, jamais remplacés par un import (le port du serveur HUD).
const LOCAL_SECTIONS = ['server'];

export const EXPORT_FORMAT = 'cyberpunk-hud-config';

/**
 * Copie partageable de la configuration de l'overlay, sans aucun secret.
 * Les clés retirées reprennent leur valeur locale (ou par défaut) à l'import.
 */
export function exportConfig(config) {
    const copy = structuredClone(config);
    for (const [section, key] of SECRET_PATHS) delete copy[section]?.[key];
    return {
        format: EXPORT_FORMAT,
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        config: copy
    };
}

/**
 * Réglages à appliquer depuis un fichier d'export. Les secrets et les réglages propres
 * à ce PC en sont retirés (même si le fichier en contient) : fusionnés à la config
 * actuelle, ils gardent leur valeur locale.
 */
export function importPatch(file) {
    if (file?.format !== EXPORT_FORMAT || typeof file.config !== 'object' || file.config === null) {
        throw new Error('Ce fichier n\'est pas un export de configuration Cyberpunk HUD.');
    }
    if (file.formatVersion > 1) {
        throw new Error('Ce fichier vient d\'une version plus récente de Cyberpunk HUD : mettez l\'application à jour.');
    }
    const patch = structuredClone(file.config);
    for (const [section, key] of SECRET_PATHS) delete patch[section]?.[key];
    for (const section of LOCAL_SECTIONS) delete patch[section];
    return patch;
}
