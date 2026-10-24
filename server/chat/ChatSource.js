import { EventEmitter } from 'node:events';
import { TwitchIrcClient } from './TwitchIrcClient.js';
import { buildChatMessage } from './buildChatMessage.js';
import { loadThirdPartyEmotes } from './thirdPartyEmotes.js';

// Messages gardés côté serveur pour qu'un overlay rechargé retrouve le tchat récent.
const HISTORY_SIZE = 50;
// Badges et emotes tierces sont revérifiés régulièrement (le cache évite les requêtes inutiles).
const CATALOG_REFRESH_MS = 30 * 60_000;

const enabledProviders = settings => ({
    sevenTv: settings.emotes7tv,
    bttv: settings.emotesBttv,
    ffz: settings.emotesFfz
});

/**
 * Tchat de la chaîne : messages avec emotes (Twitch, 7TV, BTTV, FFZ) et badges, et suppression des messages
 * modérés (ban, timeout, message effacé).
 *
 * Émet 'message' (msg), 'delete' ({ id } ou { userId }) et 'clear'.
 * `loadBadges(login)` retourne une Map "set/version" → { title, url } ;
 * `cache` (JsonCache) conserve les listes d'emotes 7TV/BTTV/FFZ.
 */
export class ChatSource extends EventEmitter {
    #state;
    #loadBadges;
    #cache;
    #settings = null;
    #login = null;
    #irc = null;
    #roomId = null;
    #badges = new Map();
    #emotes = new Map();
    #catalogTimer = null;
    #messages = [];

    constructor(state, loadBadges, cache) {
        super();
        this.#state = state;
        this.#loadBadges = loadBadges;
        this.#cache = cache;
    }

    configure(settings, channel) {
        const providersChanged = JSON.stringify(enabledProviders(settings))
            !== JSON.stringify(this.#settings && enabledProviders(this.#settings));
        this.#settings = settings;
        const login = settings.enabled ? channel.trim().toLowerCase() : '';
        if (login === this.#login) {
            if (providersChanged) this.#refreshEmotes();
            return;
        }

        this.stop();
        this.#login = login;
        this.#messages = [];
        this.emit('clear');

        if (!login) {
            this.#setStatus({ connected: false, error: null });
            return;
        }

        this.#irc = new TwitchIrcClient(login);
        this.#irc.on('line', line => this.#onLine(line));
        this.#irc.on('status', status => this.#setStatus(status));
        this.#irc.start();

        this.#refreshBadges();
        this.#catalogTimer = setInterval(() => {
            this.#refreshBadges();
            this.#refreshEmotes();
        }, CATALOG_REFRESH_MS);
    }

    stop() {
        this.#irc?.stop();
        this.#irc = null;
        clearInterval(this.#catalogTimer);
        this.#login = null;
        this.#roomId = null;
        this.#emotes = new Map();
    }

    recentMessages() {
        return this.#messages;
    }

    async #refreshBadges() {
        const login = this.#login;
        try {
            const badges = await this.#loadBadges(login);
            if (login === this.#login) this.#badges = badges;
        } catch (err) {
            console.warn('[TCHAT] Badges indisponibles :', err.message);
        }
    }

    async #refreshEmotes() {
        const roomId = this.#roomId;
        if (!roomId) return;
        const emotes = await loadThirdPartyEmotes(roomId, enabledProviders(this.#settings), this.#cache);
        if (roomId === this.#roomId) this.#emotes = emotes;
    }

    #onLine(line) {
        switch (line.command) {
            case 'ROOMSTATE': {
                // L'id Twitch de la chaîne, nécessaire aux API 7TV/BTTV/FFZ.
                const roomId = line.tags['room-id'];
                if (roomId && roomId !== this.#roomId) {
                    this.#roomId = roomId;
                    this.#refreshEmotes();
                }
                break;
            }
            case 'PRIVMSG':
            case 'USERNOTICE': {
                const message = buildChatMessage(line, this.#badges, this.#emotes);
                if (this.#isHidden(message)) return;
                this.#messages = [...this.#messages, message].slice(-HISTORY_SIZE);
                this.emit('message', message);
                break;
            }
            case 'CLEARCHAT': {
                const userId = line.tags['target-user-id'];
                if (userId) {
                    // Ban ou timeout : on retire tous les messages de ce viewer.
                    this.#messages = this.#messages.filter(m => m.userId !== userId);
                    this.emit('delete', { userId });
                } else {
                    this.#messages = [];
                    this.emit('clear');
                }
                break;
            }
            case 'CLEARMSG': {
                const id = line.tags['target-msg-id'];
                this.#messages = this.#messages.filter(m => m.id !== id);
                this.emit('delete', { id });
                break;
            }
            default:
                break;
        }
    }

    #isHidden(message) {
        const { hiddenUsers, hideCommands } = this.#settings;
        const hidden = hiddenUsers.split(',').map(name => name.trim().toLowerCase()).filter(Boolean);
        if (hidden.includes(message.login.toLowerCase())) return true;

        const firstText = message.parts[0]?.type === 'text' ? message.parts[0].text.trimStart() : '';
        return hideCommands && message.kind === 'message' && firstText.startsWith('!');
    }

    #setStatus(status) {
        this.#state.chat = status;
        this.#state.commit();
    }
}
