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
        durationSec: 7,
        // Son joué par l'overlay pour chaque type (fichier envoyé par l'utilisateur, dossier sounds).
        // Le resub retombe sur le son du sub s'il n'a pas le sien. durationMs est mesurée par
        // le panneau de réglages : l'alerte suivante attend la fin du son.
        sounds: {
            follow: { file: '', name: '', volume: 0.8, durationMs: 0 },
            raid: { file: '', name: '', volume: 0.8, durationMs: 0 },
            sub: { file: '', name: '', volume: 0.8, durationMs: 0 },
            resub: { file: '', name: '', volume: 0.8, durationMs: 0 },
            giftsub: { file: '', name: '', volume: 0.8, durationMs: 0 },
            cheer: { file: '', name: '', volume: 0.8, durationMs: 0 }
        }
    },
    // Textes affichés par chaque élément de l'overlay. Entre accolades, les variables
    // remplacées à l'affichage ; {s} vaut « S » quand le nombre principal dépasse 1.
    texts: {
        topCenterTelemetry: { statusLabel: 'SYSTEM STATUS:', online: 'OPTIMAL', offline: 'STANDBY' },
        bottomLeftModule: {
            connection: 'CONNECTION',
            operative: 'OPERATIVE',
            uptime: 'UPTIME',
            activity: 'ACTIVITY',
            scene: 'OBS_SCENE',
            rank: 'RANK',
            language: 'LANG',
            obsLink: 'OBS_LINK',
            gameLink: 'GAME_LINK',
            clearance: 'CLEARANCE',
            linkActive: 'ACTIVE',
            linkOffline: 'OFFLINE',
            plotTitle: 'REALTIME_PLOT'
        },
        bottomRightTicker: { connection: 'CONNECTION', waiting: 'AWAITING TELEMETRY LINK...' },
        chatBox: { title: 'NET_CHANNEL // LIVE FEED' },
        lastSub: { label: 'LAST_SUB // IMPLANT', detail: '{months} MOIS CUMULÉ{s} // T{tier}' },
        lastGiftSub: { label: 'LAST_GIFT // TRANSFER', detail: '{count} SUB{s} OFFERT{s} // T{tier}', anonymous: 'ANONYME' },
        lastCheer: { label: 'LAST_BITS // EDDIES', detail: '{bits} BIT{s}', anonymous: 'ANONYME' },
        lastRaid: { label: 'LAST_RAID // BREACH', detail: '{viewers} NETRUNNER{s}' },
        lastFollower: { label: 'LAST_FOLLOW // LINK' },
        alertBanner: {
            followTag: 'NEW LINK ESTABLISHED',
            followDetail: 'A REJOINT LE RÉSEAU // FOLLOW',
            raidTag: 'BREACH DETECTED // INCOMING RAID',
            raidDetail: '{viewers} NETRUNNER{s} EN APPROCHE',
            subTag: 'NEW IMPLANT INSTALLED // SUB T{tier}',
            subDetail: 'REJOINT LA CORPO // SUB',
            resubTag: 'IMPLANT UPGRADE // RESUB T{tier}',
            resubDetail: '{months} MOIS DE SERVICE CHEZ ARASAKA',
            giftTag: 'EDDIES TRANSFER // GIFT SUB T{tier}',
            giftDetail: 'OFFRE {count} SUB{s} AU RÉSEAU',
            cheerTag: 'EDDIES INCOMING // CHEER',
            cheerDetail: '{bits} BIT{s} TRANSFÉRÉ{s}',
            anonymous: 'NETRUNNER ANONYME'
        }
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
