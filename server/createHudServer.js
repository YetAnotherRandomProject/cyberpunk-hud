import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ConfigStore } from './config/ConfigStore.js';
import { TelemetryState } from './telemetry/TelemetryState.js';
import { ObsSource } from './telemetry/ObsSource.js';
import { SystemSource } from './telemetry/system/SystemSource.js';
import { FrameRateSource } from './telemetry/system/FrameRateSource.js';
import { TwitchAuth } from './telemetry/twitch/TwitchAuth.js';
import { TwitchSource } from './telemetry/twitch/TwitchSource.js';
import { RecentEvents } from './telemetry/twitch/RecentEvents.js';
import { ChatSource } from './chat/ChatSource.js';
import { JsonCache } from './cache/JsonCache.js';
import { MediaCache } from './cache/MediaCache.js';
import { Broadcaster } from './realtime/Broadcaster.js';
import { createApp } from './http/createApp.js';
import { listenWithFallback } from './http/listen.js';

const HOST = '127.0.0.1';
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
    const obsSource = new ObsSource(telemetry);
    const systemSource = new SystemSource(telemetry);
    const frameRateSource = new FrameRateSource(telemetry);
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

    // Envoie une alerte aux overlays, sauf si ce type est désactivé (`force` pour les tests).
    function emitAlert(alert, { force = false } = {}) {
        const { alerts } = configStore.get();
        const enabled = {
            follow: alerts.followEnabled,
            raid: alerts.raidEnabled,
            sub: alerts.subEnabled,
            giftsub: alerts.giftSubEnabled,
            cheer: alerts.cheerEnabled && alert.bits >= alerts.cheerMinBits
        }[alert.kind];
        if (!enabled && !force) return;
        broadcaster?.broadcast('ALERT', { id: randomUUID(), ...alert });
    }

    const httpServer = http.createServer(createApp({
        clientDir, mediaCache, configStore, twitchAuth, frameRateSource, emitAlert, onRestartRequest
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

    const runtime = () => ({ port, canRestart: Boolean(onRestartRequest) });

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
            runtime: runtime()
        }));
        telemetry.on('change', snapshot => broadcaster.broadcast('TELEMETRY_UPDATE', snapshot));
        twitchAuth.on('change', status => broadcaster.broadcast('TWITCH_AUTH_UPDATE', status));
        chatSource.on('message', message => {
            prefetchMessageMedia(message);
            broadcaster.broadcast('CHAT_MESSAGE', message);
        });
        chatSource.on('delete', target => broadcaster.broadcast('CHAT_DELETE', target));
        chatSource.on('clear', () => broadcaster.broadcast('CHAT_CLEAR', null));
        configStore.on('change', config => {
            applyConfig(config);
            broadcaster.broadcast('CONFIG_UPDATE', config);
        });

        applyConfig(configStore.get());
        return port;
    }

    async function stop() {
        twitchSource.stop();
        chatSource.stop();
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
