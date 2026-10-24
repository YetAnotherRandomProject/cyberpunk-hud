import { readJsonFile, writeJsonFile } from '../../utils/jsonFile.js';

const EMPTY = { sub: null, giftsub: null, cheer: null, raid: null };

/**
 * Derniers sub, subs offerts, cheer et raid reçus en direct (EventSub). Twitch ne permet
 * pas de les relire après coup : ils sont gardés sur disque pour survivre à un redémarrage,
 * et oubliés quand la chaîne suivie change.
 */
export class RecentEvents {
    #filePath;
    #state;
    #channel = null;

    constructor(filePath, state) {
        this.#filePath = filePath;
        this.#state = state;
        const saved = readJsonFile(filePath, null);
        if (saved?.channel) {
            this.#channel = saved.channel;
            state.recent = { ...EMPTY, ...saved.events };
        }
    }

    setChannel(channel) {
        const login = channel.trim().toLowerCase();
        if (login === this.#channel) return;
        this.#channel = login;
        this.#state.recent = { ...EMPTY };
        this.#save();
        this.#state.commit();
    }

    record(alert) {
        const at = Date.now();
        const event = {
            sub: () => ({ name: alert.user, months: alert.months, tier: alert.tier, at }),
            giftsub: () => ({ name: alert.user, count: alert.count, tier: alert.tier, at }),
            cheer: () => ({ name: alert.user, bits: alert.bits, at }),
            raid: () => ({ name: alert.user, viewers: alert.viewers, at })
        }[alert.kind]?.();
        if (!event) return;

        this.#state.recent = { ...this.#state.recent, [alert.kind]: event };
        this.#save();
        this.#state.commit();
    }

    #save() {
        writeJsonFile(this.#filePath, { channel: this.#channel, events: this.#state.recent });
    }
}
