import { useEffect, useState } from 'react';

const RETRY_DELAY_MS = 3000;
// Sans aucun message pendant ce délai (le serveur en envoie toutes les 5 s), la connexion est
// considérée comme morte : on la ferme pour en ouvrir une nouvelle.
const SILENCE_TIMEOUT_MS = 15000;
const MAX_CHAT_MESSAGES = 100;

function removeChatMessages(messages, { id, userId }) {
    return messages.filter(m => (id ? m.id !== id : m.userId !== userId));
}

// Aucune valeur inventée : tout est vide tant que le serveur n'a rien envoyé.
export const EMPTY_TELEMETRY = {
    obsConnected: false,
    obsError: null,
    twitchError: null,
    twitchSource: 'public',
    twitchEvents: null,
    chatConnected: false,
    chatError: null,
    fps: { status: 'off', error: null, process: null, detail: null },
    streamer: {},
    metrics: {},
    history: {}
};

// File d'attente des alertes : alerte affichée, alertes en attente, types en pause.
export const EMPTY_ALERT_QUEUE = { current: null, pending: [], paused: [] };

// Connexion WebSocket au serveur HUD, avec reconnexion automatique.
export function useBackend() {
    const [config, setConfig] = useState(null);
    const [telemetry, setTelemetry] = useState(EMPTY_TELEMETRY);
    const [twitchAuth, setTwitchAuth] = useState(null);
    const [alertQueue, setAlertQueue] = useState(EMPTY_ALERT_QUEUE);
    const [chat, setChat] = useState([]);
    const [runtime, setRuntime] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let socket = null;
        let retryTimer = null;
        let silenceTimer = null;
        let disposed = false;
        let appVersion = null;

        // Connexion perdue (fermée, ou silencieuse) : nouvelle tentative après un court délai,
        // et ainsi de suite tant que le serveur reste injoignable.
        const lost = current => {
            if (disposed || current !== socket) return;
            socket = null;
            clearTimeout(silenceTimer);
            // Serveur coupé : on vide les métriques pour ne rien afficher de périmé.
            setConnected(false);
            setTelemetry(EMPTY_TELEMETRY);
            setAlertQueue(EMPTY_ALERT_QUEUE);
            retryTimer = setTimeout(connect, RETRY_DELAY_MS);
        };

        // Relancé à chaque message. À l'échéance, la connexion est abandonnée sans attendre
        // son événement de fermeture, qui peut tarder longtemps sur une connexion morte.
        const watchSilence = current => {
            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                current.onclose = null;
                current.close();
                lost(current);
            }, SILENCE_TIMEOUT_MS);
        };

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const current = new WebSocket(`${protocol}//${window.location.host}/ws`);
            socket = current;
            watchSilence(current);

            current.onopen = () => setConnected(true);
            current.onmessage = event => {
                watchSilence(current);
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case 'INIT':
                        // Application mise à jour pendant la coupure : la page recharge le nouveau code.
                        if (appVersion && msg.runtime?.version && msg.runtime.version !== appVersion) {
                            window.location.reload();
                            return;
                        }
                        appVersion = msg.runtime?.version ?? appVersion;
                        setConfig(msg.config);
                        setTelemetry(msg.telemetry ?? EMPTY_TELEMETRY);
                        setTwitchAuth(msg.twitchAuth);
                        // Messages d'avant la connexion : leur âge part de leur heure d'envoi.
                        setChat((msg.chat ?? []).map(m => ({ ...m, receivedAt: m.at })));
                        setAlertQueue(msg.alertQueue ?? EMPTY_ALERT_QUEUE);
                        setRuntime(msg.runtime);
                        break;
                    case 'TELEMETRY_UPDATE':
                        setTelemetry(msg.data ?? EMPTY_TELEMETRY);
                        break;
                    case 'CONFIG_UPDATE':
                        setConfig(msg.data);
                        break;
                    case 'TWITCH_AUTH_UPDATE':
                        setTwitchAuth(msg.data);
                        break;
                    case 'CHAT_MESSAGE':
                        setChat(prev => [...prev, { ...msg.data, receivedAt: Date.now() }].slice(-MAX_CHAT_MESSAGES));
                        break;
                    case 'CHAT_DELETE':
                        setChat(prev => removeChatMessages(prev, msg.data));
                        break;
                    case 'CHAT_CLEAR':
                        setChat([]);
                        break;
                    case 'ALERT_QUEUE':
                        setAlertQueue(msg.data);
                        break;
                    default:
                        break;
                }
            };
            current.onclose = () => lost(current);
        };

        connect();
        return () => {
            disposed = true;
            clearTimeout(retryTimer);
            clearTimeout(silenceTimer);
            socket?.close();
        };
    }, []);

    return { config, telemetry, twitchAuth, alertQueue, chat, runtime, connected };
}
