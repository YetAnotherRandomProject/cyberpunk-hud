import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { parseIrcLine } from './ircParser.js';

const IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const RECONNECT_DELAY_MS = 5000;

/**
 * Lecture anonyme du tchat d'une chaîne (pseudo « justinfan », aucune connexion
 * requise). Émet 'line' (message IRC découpé) et 'status' ({ connected, error }).
 */
export class TwitchIrcClient extends EventEmitter {
    #channel;
    #socket = null;
    #retryTimer = null;
    #stopped = true;

    constructor(channel) {
        super();
        this.#channel = channel;
    }

    start() {
        this.#stopped = false;
        const socket = new WebSocket(IRC_URL);
        this.#socket = socket;

        socket.on('open', () => {
            const nick = `justinfan${Math.floor(10000 + Math.random() * 80000)}`;
            socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            socket.send('PASS SCHMOOPIIE');
            socket.send(`NICK ${nick}`);
            socket.send(`JOIN #${this.#channel}`);
        });
        socket.on('message', raw => {
            for (const line of raw.toString().split('\r\n')) {
                if (line) this.#onLine(socket, parseIrcLine(line));
            }
        });
        socket.on('close', () => {
            if (socket !== this.#socket) return;
            this.#socket = null;
            if (this.#stopped) return;
            this.emit('status', { connected: false, error: 'Tchat déconnecté, reconnexion…' });
            this.#retryTimer = setTimeout(() => this.start(), RECONNECT_DELAY_MS);
        });
        socket.on('error', () => {}); // suivi d'un 'close'
    }

    stop() {
        this.#stopped = true;
        clearTimeout(this.#retryTimer);
        const socket = this.#socket;
        this.#socket = null;
        socket?.close();
    }

    #onLine(socket, message) {
        switch (message.command) {
            case 'PING':
                socket.send(`PONG :${message.params[0] ?? 'tmi.twitch.tv'}`);
                return;
            case 'RECONNECT':
                // Maintenance côté Twitch : on ferme, la reconnexion automatique prend le relais.
                socket.close();
                return;
            case 'ROOMSTATE':
                this.emit('status', { connected: true, error: null });
                break;
            case 'NOTICE':
                if (message.tags['msg-id'] === 'msg_channel_suspended') {
                    this.emit('status', { connected: false, error: 'Chaîne suspendue ou introuvable' });
                }
                break;
            default:
                break;
        }
        this.emit('line', message);
    }
}
