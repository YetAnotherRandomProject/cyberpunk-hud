// Réglages qui ne doivent jamais quitter le PC : identifiants de l'application Twitch
// et mot de passe du WebSocket d'OBS.
const SECRET_PATHS = [
    ['twitch', 'clientId'],
    ['twitch', 'clientSecret'],
    ['obs', 'password']
];

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
