import { isPlainObject } from '../utils/objects.js';

// Anciens interrupteurs on/off des alertes (jusqu'à la v2.0.11), devenus alerts.modes.
const LEGACY_ALERT_SWITCHES = {
    followEnabled: 'follow',
    raidEnabled: 'raid',
    subEnabled: 'sub',
    giftSubEnabled: 'giftsub',
    cheerEnabled: 'cheer'
};

/**
 * Convertit une config (fichier, ou export à importer) écrite par une version précédente.
 * À appliquer avant conformTo, qui ignore les clés inconnues. Ne modifie pas l'objet reçu.
 */
export function migrateConfig(raw) {
    if (!isPlainObject(raw?.alerts)) return raw;
    const alerts = { ...raw.alerts };
    const modes = isPlainObject(alerts.modes) ? { ...alerts.modes } : {};
    for (const [legacyKey, kind] of Object.entries(LEGACY_ALERT_SWITCHES)) {
        if (typeof alerts[legacyKey] === 'boolean' && !(kind in modes)) {
            // Un interrupteur coupé ne laissait passer aucune alerte : « désactivé ».
            modes[kind] = alerts[legacyKey] ? 'active' : 'off';
        }
        delete alerts[legacyKey];
    }
    alerts.modes = modes;
    return { ...raw, alerts };
}
