import { useEffect, useState } from 'react';

const RETRY_DELAY_MS = 3000;
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
        let disposed = false;

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

            socket.onopen = () => setConnected(true);
            socket.onmessage = event => {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case 'INIT':
                        setConfig(msg.config);
                        setTelemetry(msg.telemetry);
                        setTwitchAuth(msg.twitchAuth);
                        // Messages d'avant la connexion : leur âge part de leur heure d'envoi.
                        setChat((msg.chat ?? []).map(m => ({ ...m, receivedAt: m.at })));
                        setAlertQueue(msg.alertQueue ?? EMPTY_ALERT_QUEUE);
                        setRuntime(msg.runtime);
                        break;
                    case 'TELEMETRY_UPDATE':
                        setTelemetry(msg.data);
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
            socket.onclose = () => {
                if (disposed) return;
                // Serveur coupé : on vide les métriques pour ne rien afficher de périmé.
                setConnected(false);
                setTelemetry(EMPTY_TELEMETRY);
                setAlertQueue(EMPTY_ALERT_QUEUE);
                retryTimer = setTimeout(connect, RETRY_DELAY_MS);
            };
        };

        connect();
        return () => {
            disposed = true;
            clearTimeout(retryTimer);
            socket?.close();
        };
    }, []);

    return { config, telemetry, twitchAuth, alertQueue, chat, runtime, connected };
}
