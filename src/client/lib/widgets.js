// Éléments du HUD et réglages de chacun, affichés dans le panneau « Élément » des réglages.
// Un champ vise un chemin de la config : ['hud', clé] (partagé entre éléments) ou ['texts', id, clé].
const hud = (key, label, hint) => ({ path: ['hud', key], label, hint });
const number = (key, label, min, max) => ({ path: ['hud', key], label, type: 'number', min, max });
const textsOf = id => (key, label, hint) => ({ path: ['texts', id, key], label, hint });

const VARS = vars => `Variables : ${vars} — {s} ajoute « S » au pluriel.`;

function widget(id, label, buildFields = () => [], note = null) {
    return { id, label, fields: buildFields(textsOf(id)), note };
}

export const WIDGETS = [
    widget('topLeftBrand', 'Logo', () => [hud('brandName', 'Marque')]),
    widget('topCenterTelemetry', 'Barre de statut', t => [
        t('statusLabel', 'Libellé du statut'),
        t('online', 'Statut en ligne'),
        t('offline', 'Statut hors ligne'),
        hud('serialNumber', 'Numéro de série'),
        hud('vendorName', 'Fabricant'),
        hud('yearPrefix', 'Année de l\'horloge', 'Remplace l\'année réelle (ex : 2077).')
    ]),
    widget('bottomLeftModule', 'Carte streameur', t => [
        t('connection', 'Libellé de connexion'),
        hud('connectionId', 'ID de connexion', 'Partagé avec le ticker boursier.'),
        hud('clearanceLevel', 'Niveau d\'accès'),
        t('operative', 'Libellé du pseudo'),
        t('uptime', 'Libellé de la durée'),
        t('activity', 'Libellé de la catégorie'),
        t('scene', 'Libellé de la scène OBS'),
        t('rank', 'Libellé du statut Twitch'),
        t('language', 'Libellé de la langue'),
        t('obsLink', 'Libellé du lien OBS'),
        t('linkActive', 'OBS connecté'),
        t('linkOffline', 'OBS déconnecté'),
        t('gameLink', 'Libellé du jeu'),
        t('clearance', 'Libellé du niveau d\'accès'),
        t('plotTitle', 'Titre des courbes (page 2)'),
        number('cardFlipIntervalSec', 'Alternance des pages (s)', 3, 120)
    ]),
    widget('bottomRightTicker', 'Ticker boursier', t => [
        t('connection', 'Libellé de connexion'),
        hud('connectionId', 'ID de connexion', 'Partagé avec la carte streameur.'),
        t('waiting', 'Texte sans télémétrie'),
        number('tickerDurationSec', 'Durée d\'un défilement (s)', 5, 120)
    ]),
    widget('lastSub', 'Dernier sub', t => [
        t('label', 'Titre'),
        t('detail', 'Détail', VARS('{months} {tier}'))
    ]),
    widget('lastGiftSub', 'Derniers subs offerts', t => [
        t('label', 'Titre'),
        t('detail', 'Détail', VARS('{count} {tier}')),
        t('anonymous', 'Donateur anonyme')
    ]),
    widget('lastCheer', 'Derniers bits', t => [
        t('label', 'Titre'),
        t('detail', 'Détail', VARS('{bits}')),
        t('anonymous', 'Donateur anonyme')
    ]),
    widget('lastRaid', 'Dernier raid', t => [
        t('label', 'Titre'),
        t('detail', 'Détail', VARS('{viewers}'))
    ]),
    widget('lastFollower', 'Dernier follower', t => [t('label', 'Titre')]),
    widget('chatBox', 'Tchat', t => [t('title', 'Titre du cadre')],
        'Taille, nombre de messages et filtres : onglet Tchat.'),
    widget('alertBanner', 'Alertes', t => [
        t('followTag', 'Follow — bandeau'),
        t('followDetail', 'Follow — détail', VARS('{user}')),
        t('raidTag', 'Raid — bandeau'),
        t('raidDetail', 'Raid — détail', VARS('{user} {viewers}')),
        t('subTag', 'Nouveau sub — bandeau', VARS('{tier}')),
        t('subDetail', 'Nouveau sub — détail', VARS('{user} {tier}')),
        t('resubTag', 'Resub — bandeau', VARS('{tier} {months}')),
        t('resubDetail', 'Resub — détail', VARS('{user} {months} {tier}')),
        t('giftTag', 'Subs offerts — bandeau', VARS('{tier} {count}')),
        t('giftDetail', 'Subs offerts — détail', VARS('{user} {count} {total} {tier}')),
        t('cheerTag', 'Bits — bandeau', VARS('{bits}')),
        t('cheerDetail', 'Bits — détail', VARS('{user} {bits}')),
        t('anonymous', 'Donateur anonyme')
    ], 'Types d\'alertes actifs et durée : onglet Alertes.')
];

export const WIDGETS_BY_ID = Object.fromEntries(WIDGETS.map(w => [w.id, w]));

export const getIn = (object, path) => path.reduce((value, key) => value?.[key], object);
