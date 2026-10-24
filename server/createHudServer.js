import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigStore } from './config/ConfigStore.js';
import { TelemetryState } from './telemetry/TelemetryState.js';
import { ObsSource } from './telemetry/ObsSource.js';
import { SystemSource } from './telemetry/system/SystemSource.js';
import { FrameRateSource } from './telemetry/system/FrameRateSource.js';
import { TwitchAuth } from './telemetry/twitch/TwitchAuth.js';
import { TwitchSource } from './telemetry/twitch/TwitchSource.js';
import { RecentEvents } from './telemetry/twitch/RecentEvents.js';
import { ALERT_KINDS, AlertQueue } from './alerts/AlertQueue.js';
import { SoundStore } from './alerts/SoundStore.js';
import { soundFor } from './alerts/alertSound.js';
import { ChatSource } from './chat/ChatSource.js';
import { JsonCache } from './cache/JsonCache.js';
import { MediaCache } from './cache/MediaCache.js';
import { Broadcaster } from './realtime/Broadcaster.js';
import { createApp } from './http/createApp.js';
import { listenWithFallback } from './http/listen.js';

const HOST = '127.0.0.1';
// Version de l'application : une page ouverte avant une mise à jour se recharge en la voyant changer.
const APP_VERSION = JSON.parse(fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf-8'
)).version;
// Marge pour le démarrage de la lecture du son dans l'overlay.
const SOUND_START_MARGIN_MS = 300;

// Timing d'une alerte : la bannière reste affichée la durée réglée (displayMs), et l'alerte
// occupe la file jusqu'à la fin de son son s'il est plus long (durationMs) : l'alerte suivante
// ne démarre qu'une fois l'affichage et le son terminés.
// Mode d'un type d'alerte (onglet Alertes) : 'active', 'paused' ou 'off'.
const ALERT_MODES = ['active', 'paused', 'off'];
function alertMode(kind, alerts) {
    const mode = alerts.modes[kind];
    return ALERT_MODES.includes(mode) ? mode : 'active';
}

function alertTiming(alert, alerts) {
    const displayMs = Math.max(2, alerts.durationSec) * 1000;
    const sound = soundFor(alert, alerts.sounds);
    const soundMs = sound?.durationMs > 0 ? sound.durationMs + SOUND_START_MARGIN_MS : 0;
    return { displayMs, durationMs: Math.max(displayMs, soundMs) };
}
const BADGES_TTL_MS = 6 * 60 * 60_000;

/**
 * Assemble le serveur HUD complet. Utilisé à la fois par l'application Electron
 * et par le lancement en ligne de commande (server/standalone.js).
 *
 * @param {object} options
 * @param {string} options.dataDir    Dossier où sont stockés config.json et la connexion Twitch
 * @param {string} options.clientDir  Dossier de l'interface React compilée
 * @param {() => void} [options.onRestartRequest]  Fourni si l'hôte sait redémarrer l'app
 */
export function createHudServer({ dataDir, clientDir, onRestartRequest = null }) {
    const configStore = new ConfigStore(path.join(dataDir, 'config.json'));
    const twitchAuth = new TwitchAuth(path.join(dataDir, 'twitch-auth.json'));
    const telemetry = new TelemetryState();
    const obsSource = new ObsSource(telemetry, () => port);
    const systemSource = new SystemSource(telemetry);
    const frameRateSource = new FrameRateSource(telemetry);
    const soundStore = new SoundStore(path.join(dataDir, 'sounds'));
    const alertQueue = new AlertQueue(
        alert => alertTiming(alert, configStore.get().alerts),
        kind => alertMode(kind, configStore.get().alerts) === 'paused'
    );
    const recentEvents = new RecentEvents(path.join(dataDir, 'recent-events.json'), telemetry);
    // Les vrais événements mettent à jour les widgets « dernier… », même si leur alerte est désactivée.
    const twitchSource = new TwitchSource(telemetry, twitchAuth, alert => {
        recentEvents.record(alert);
        emitAlert(alert);
    });
    // Surtout pas « cache » : sous Windows (insensible à la casse) ce serait le dossier
    // « Cache » de Chromium dans le profil Electron, qu'il vide à sa guise.
    const cacheDir = path.join(dataDir, 'hud-cache');
    const jsonCache = new JsonCache(path.join(cacheDir, 'lists'));
    const mediaCache = new MediaCache(path.join(cacheDir, 'media'));

    // Les Map ne se sérialisent pas en JSON : le cache stocke la liste des entrées.
    const loadBadges = async login => new Map(await jsonCache.get(
        `badges-${login}`,
        BADGES_TTL_MS,
        async () => [...await twitchSource.fetchBadges(login)]
    ));
    const chatSource = new ChatSource(telemetry, loadBadges, jsonCache);

    let broadcaster = null;
    let port = null;

    // Met une alerte (réelle ou de test) dans la file, comme toutes les autres : elle est envoyée
    // à tous les overlays, OBS compris, et reste en attente si son type est en pause.
    // Un type désactivé, et les cheers sous le minimum de bits, sont ignorés.
    function emitAlert(alert) {
        const { alerts } = configStore.get();
        if (alertMode(alert.kind, alerts) === 'off') return;
        if (alert.kind === 'cheer' && alert.bits < alerts.cheerMinBits) return;
        alertQueue.push(alert);
    }

    const httpServer = http.createServer(createApp({
        clientDir, mediaCache, configStore, twitchAuth, frameRateSource, alertQueue, soundStore, emitAlert, onRestartRequest
    }));

    // Lance tout de suite le téléchargement des images encore inconnues du message :
    // elles sont souvent déjà en cache quand l'overlay les demande.
    function prefetchMessageMedia(message) {
        const urls = [
            ...message.badges.map(badge => badge.url),
            ...message.parts.filter(part => part.type === 'emote')
                .flatMap(part => [part.url, ...(part.overlays ?? []).map(overlay => overlay.url)])
        ];
        for (const url of new Set(urls)) mediaCache.get(url).catch(() => {});
    }

    const runtime = () => ({ port, version: APP_VERSION, canRestart: Boolean(onRestartRequest) });

    function applyConfig(config) {
        obsSource.configure(config.obs);
        systemSource.configure(config.system);
        frameRateSource.configure(config.system);
        twitchAuth.setClient(config.twitch.clientId.trim(), config.twitch.clientSecret.trim());
        twitchSource.configure(config.twitch);
        recentEvents.setChannel(config.twitch.channel);
        chatSource.configure(config.chat, config.twitch.channel);
    }

    async function start() {
        port = await listenWithFallback(httpServer, configStore.get().server.port, HOST);

        broadcaster = new Broadcaster(httpServer, () => ({
            config: configStore.get(),
            telemetry: telemetry.snapshot(),
            twitchAuth: twitchAuth.status(),
            chat: chatSource.recentMessages(),
            alertQueue: alertQueue.state(),
            runtime: runtime()
        }));
        alertQueue.on('change', state => broadcaster.broadcast('ALERT_QUEUE', state));
        telemetry.on('change', snapshot => broadcaster.broadcast('TELEMETRY_UPDATE', snapshot));
        twitchAuth.on('change', status => broadcaster.broadcast('TWITCH_AUTH_UPDATE', status));
        chatSource.on('message', message => {
            prefetchMessageMedia(message);
            broadcaster.broadcast('CHAT_MESSAGE', message);
        });
        chatSource.on('delete', target => broadcaster.broadcast('CHAT_DELETE', target));
        chatSource.on('clear', () => broadcaster.broadcast('CHAT_CLEAR', null));
        configStore.on('change', (config, prev) => {
            applyConfig(config);
            // Type qui vient d'être désactivé : ses alertes en attente sont purgées
            // (celle éventuellement à l'écran termine son affichage).
            for (const kind of ALERT_KINDS) {
                const nowOff = alertMode(kind, config.alerts) === 'off';
                if (nowOff && alertMode(kind, prev.alerts) !== 'off') alertQueue.clear(kind);
            }
            alertQueue.refresh();
            broadcaster.broadcast('CONFIG_UPDATE', config);
        });

        applyConfig(configStore.get());
        return port;
    }

    async function stop() {
        twitchSource.stop();
        chatSource.stop();
        alertQueue.stop();
        systemSource.stop();
        frameRateSource.stop();
        twitchAuth.cancel();
        await obsSource.stop();
        await broadcaster?.close();
        await new Promise(resolve => httpServer.close(() => resolve()));
    }

    return {
        start,
        stop,
        url: (pathname = '/') => `http://${HOST}:${port}${pathname}`
    };
}
