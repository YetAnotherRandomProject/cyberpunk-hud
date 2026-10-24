import { EventEmitter } from 'node:events';
import WebSocket from 'ws';

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
const RECONNECT_DELAY_MS = 5000;
// Marge ajoutée au délai de keepalive annoncé par Twitch avant de considérer la connexion perdue.
const WATCHDOG_MARGIN_MS = 5000;

/**
 * Réception des événements Twitch en temps réel (EventSub par WebSocket).
 * `subscribe(sessionId)` crée les abonnements après chaque message de bienvenue.
 *
 * Émet 'notification' (type, event) et 'status' ({ connected, error }).
 */
export class EventSubClient extends EventEmitter {
    #subscribe;
    #socket = null;
    #keepaliveMs = 10_000;
    #watchdog = null;
    #retryTimer = null;
    #stopped = true;

    constructor(subscribe) {
        super();
        this.#subscribe = subscribe;
    }

    start() {
        this.#stopped = false;
        this.#socket = this.#open(EVENTSUB_URL);
    }

    stop() {
        this.#stopped = true;
        clearTimeout(this.#watchdog);
        clearTimeout(this.#retryTimer);
        const socket = this.#socket;
        this.#socket = null;
        socket?.close();
    }

    #open(url) {
        const socket = new WebSocket(url);
        socket.on('message', raw => this.#onMessage(socket, JSON.parse(raw)));
        socket.on('close', () => {
            if (socket === this.#socket) this.#onLost();
        });
        socket.on('error', () => {}); // suivi d'un 'close'
        return socket;
    }

    #onMessage(socket, { metadata, payload }) {
        switch (metadata.message_type) {
            case 'session_welcome':
                this.#keepaliveMs = (payload.session.keepalive_timeout_seconds ?? 10) * 1000;
                if (socket !== this.#socket) {
                    // Bienvenue sur l'URL de reconnexion : les abonnements sont conservés par Twitch.
                    const previous = this.#socket;
                    this.#socket = socket;
                    previous?.close();
                } else {
                    this.#subscribe(payload.session.id)
                        .then(() => this.emit('status', { connected: true, error: null }))
                        .catch(err => this.emit('status', { connected: true, error: err.message }));
                }
                break;
            case 'notification':
                this.emit('notification', payload.subscription.type, payload.event);
                break;
            case 'session_reconnect':
                // On garde l'ancienne connexion jusqu'au message de bienvenue de la nouvelle.
                this.#open(payload.session.reconnect_url);
                return;
            case 'revocation':
                this.emit('status', { connected: true, error: `Abonnement ${payload.subscription.type} révoqué` });
                break;
            default:
                break; // session_keepalive
        }
        if (socket === this.#socket) this.#armWatchdog();
    }

    #armWatchdog() {
        clearTimeout(this.#watchdog);
        this.#watchdog = setTimeout(() => this.#socket?.terminate(), this.#keepaliveMs + WATCHDOG_MARGIN_MS);
    }

    #onLost() {
        clearTimeout(this.#watchdog);
        this.#socket = null;
        if (this.#stopped) return;
        this.emit('status', { connected: false, error: 'Connexion aux événements Twitch perdue, reconnexion…' });
        this.#retryTimer = setTimeout(() => this.start(), RECONNECT_DELAY_MS);
    }
}
