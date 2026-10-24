// Schéma de référence de la configuration : toute clé absente d'ici est ignorée,
// et toute valeur du mauvais type retombe sur la valeur par défaut.
export const defaultConfig = {
    server: {
        port: 3000
    },
    obs: {
        enabled: true,
        url: 'ws://127.0.0.1:4455',
        password: '',
        pollIntervalSec: 2
    },
    twitch: {
        enabled: true,
        channel: '',
        // Facultatifs : avec les deux, l'API officielle Helix remplace l'API publique.
        clientId: '',
        clientSecret: '',
        pollIntervalSec: 8
    },
    system: {
        pollIntervalSec: 2,
        fpsEnabled: true,
        // 'auto' : jeu en plein écran détecté automatiquement ; 'process' : exécutable choisi.
        fpsMode: 'auto',
        fpsProcess: ''
    },
    hud: {
        brandName: 'arasaka',
        vendorName: 'KIROSHI',
        serialNumber: 'NC 4584 0252 6584 0415',
        clearanceLevel: 'LEVEL_04_EXEC',
        connectionId: '555.441.26',
        yearPrefix: '2077',
        cardFlipIntervalSec: 10,
        tickerDurationSec: 20
    },
    chat: {
        enabled: true,
        maxMessages: 8,
        // Durée d'affichage d'un message ; 0 = il reste jusqu'à être poussé par les suivants.
        lifetimeSec: 30,
        // Direction dans laquelle le cadre s'agrandit : 'up' (Y = bas du cadre) ou 'down' (Y = haut).
        growDirection: 'up',
        fontSize: 18,
        width: 420,
        showBadges: true,
        emotes7tv: true,
        emotesBttv: true,
        emotesFfz: true,
        hideCommands: true,
        hiddenUsers: 'nightbot, streamelements, moobot'
    },
    alerts: {
        followEnabled: true,
        raidEnabled: true,
        subEnabled: true,
        giftSubEnabled: true,
        cheerEnabled: true,
        // Les cheers de moins de bits que ce seuil ne déclenchent pas d'alerte.
        cheerMinBits: 1,
        durationSec: 7
    },
    theme: {
        primary: '#4deeea',
        highlight: '#b8ffff',
        positive: '#26ff68',
        negative: '#ff334b'
    },
    widgets: {
        topLeftBrand: { enabled: true, x: 44, y: 24, scale: 1, tilt: 8 },
        topCenterTelemetry: { enabled: true, x: 690, y: 38, scale: 1, tilt: 0 },
        bottomLeftModule: { enabled: true, x: 44, y: 825, scale: 1, tilt: 12 },
        bottomRightTicker: { enabled: true, x: 1410, y: 940, scale: 1, tilt: -12 },
        lastSub: { enabled: true, x: 1560, y: 30, scale: 1, tilt: -8 },
        lastGiftSub: { enabled: true, x: 1560, y: 108, scale: 1, tilt: -8 },
        lastCheer: { enabled: true, x: 1560, y: 186, scale: 1, tilt: -8 },
        lastRaid: { enabled: true, x: 1560, y: 264, scale: 1, tilt: -8 },
        lastFollower: { enabled: false, x: 1560, y: 342, scale: 1, tilt: -8 },
        chatBox: { enabled: true, x: 1470, y: 780, scale: 1, tilt: -6 },
        alertBanner: { enabled: true, x: 660, y: 400, scale: 1, tilt: 0 }
    }
};
