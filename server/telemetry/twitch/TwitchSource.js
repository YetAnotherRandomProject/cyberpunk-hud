import { fetchPublicBadges, fetchPublicChannel, fetchPublicFollowerCount } from './publicClient.js';
import { HelixClient } from './HelixClient.js';
import { AppTokenProvider } from './AppTokenProvider.js';
import { EventSubClient } from './EventSubClient.js';
import { StreamSession } from './StreamSession.js';

const TWITCH_METRICS = ['VWR', 'PEAK', 'AVG', 'FLW', 'NEW'];

/**
 * Lit les infos d'une chaîne Twitch selon le mode disponible :
 *  - 'user'   : compte connecté → API officielle, dernier follower, alertes en direct (EventSub)
 *  - 'helix'  : Client ID + secret → API officielle avec un jeton d'application
 *  - 'public' : aucune clé → API publique du site Twitch
 *
 * `onAlert(alert)` est appelé à chaque événement reçu :
 *  - { kind: 'follow', user }
 *  - { kind: 'raid', user, viewers }
 *  - { kind: 'sub', user, tier, months, message }        (nouveau sub ou resub)
 *  - { kind: 'giftsub', user, tier, count, total }       (user null si anonyme)
 *  - { kind: 'cheer', user, bits, message }              (user null si anonyme)
 */
export class TwitchSource {
    #state;
    #auth;
    #onAlert;
    #settings = null;
    #helix = null;
    #eventSub = null;
    #session = new StreamSession();
    #timer = null;

    constructor(state, auth, onAlert) {
        this.#state = state;
        this.#auth = auth;
        this.#onAlert = onAlert;
        let wasConnected = auth.isConnected;
        auth.on('change', () => {
            if (auth.isConnected === wasConnected) return;
            wasConnected = auth.isConnected;
            if (this.#settings) this.#rebuild();
        });
    }

    configure(settings) {
        const unchanged = this.#timer && JSON.stringify(settings) === JSON.stringify(this.#settings);
        if (unchanged) return;
        this.#settings = { ...settings };
        this.#rebuild();
    }

    // Badges du tchat, via l'API officielle si elle est disponible.
    async fetchBadges(login) {
        if (!this.#helix) return fetchPublicBadges(login);
        const user = await this.#helix.getUser(login);
        if (!user) throw new Error(`Chaîne « ${login} » introuvable`);
        return this.#helix.fetchBadges(user.id);
    }

    stop() {
        clearInterval(this.#timer);
        this.#timer = null;
        this.#eventSub?.stop();
        this.#eventSub = null;
    }

    #rebuild() {
        this.stop();
        const { enabled, channel, pollIntervalSec } = this.#settings;
        const clientId = this.#settings.clientId.trim();
        const clientSecret = this.#settings.clientSecret.trim();
        const twitch = this.#state.twitch;

        if (this.#auth.isConnected) {
            this.#helix = new HelixClient(clientId, this.#auth);
            twitch.source = 'user';
        } else if (clientId && clientSecret) {
            this.#helix = new HelixClient(clientId, new AppTokenProvider(clientId, clientSecret));
            twitch.source = 'helix';
        } else {
            this.#helix = null;
            twitch.source = 'public';
        }

        twitch.lastFollower = null;
        twitch.eventSub = null;
        if (twitch.source === 'user' && enabled && channel.trim()) this.#startEventSub();

        this.#timer = setInterval(() => this.#poll(), Math.max(3, pollIntervalSec) * 1000);
        this.#poll();
    }

    #startEventSub() {
        const login = this.#settings.channel.trim().toLowerCase();
        const eventSub = new EventSubClient(sessionId => this.#subscribe(sessionId, login));
        eventSub.on('notification', (type, event) => this.#onNotification(type, event));
        eventSub.on('status', status => {
            this.#state.twitch.eventSub = status;
            this.#state.commit();
        });
        eventSub.start();
        this.#eventSub = eventSub;
    }

    async #subscribe(sessionId, login) {
        const broadcaster = await this.#helix.getUser(login);
        if (!broadcaster) throw new Error(`Chaîne « ${login} » introuvable`);

        const id = broadcaster.id;
        const create = (type, version, condition) =>
            this.#helix.createEventSubSubscription(type, version, condition, sessionId);

        const [follow, raid] = await Promise.allSettled([
            create('channel.follow', '2', { broadcaster_user_id: id, moderator_user_id: this.#auth.userId }),
            create('channel.raid', '1', { to_broadcaster_user_id: id })
        ]);
        if (follow.status === 'rejected') {
            throw new Error('Alertes follow indisponibles : le compte connecté doit être le streameur ou un modérateur de la chaîne.');
        }
        if (raid.status === 'rejected') throw raid.reason;

        // Subs et bits ne sont lisibles qu'avec le compte du streameur lui-même.
        if (id !== this.#auth.userId) {
            throw new Error('Follows et raids actifs. Subs et bits : connectez le compte du streameur (un modérateur ne suffit pas).');
        }
        if (this.#auth.missingScopes.length > 0) {
            throw new Error('Follows et raids actifs. Subs et bits : déconnectez puis reconnectez le compte pour accorder les nouvelles autorisations.');
        }
        const results = await Promise.allSettled([
            create('channel.subscribe', '1', { broadcaster_user_id: id }),
            create('channel.subscription.message', '1', { broadcaster_user_id: id }),
            create('channel.subscription.gift', '1', { broadcaster_user_id: id }),
            create('channel.cheer', '1', { broadcaster_user_id: id })
        ]);
        const failed = results.find(result => result.status === 'rejected');
        if (failed) throw new Error(`Subs / bits partiellement indisponibles : ${failed.reason.message}`);
    }

    #onNotification(type, event) {
        switch (type) {
            case 'channel.follow':
                this.#state.twitch.lastFollower = { name: event.user_name, at: Date.parse(event.followed_at) || Date.now() };
                this.#state.commit();
                this.#onAlert({ kind: 'follow', user: event.user_name });
                break;
            case 'channel.raid':
                this.#onAlert({ kind: 'raid', user: event.from_broadcaster_user_name, viewers: event.viewers });
                break;
            case 'channel.subscribe':
                // Chaque sub offert arrive aussi ici, un par destinataire :
                // l'alerte groupée vient de channel.subscription.gift.
                if (event.is_gift) break;
                this.#onAlert({ kind: 'sub', user: event.user_name, tier: tierLevel(event.tier), months: 1, message: null });
                break;
            case 'channel.subscription.message':
                this.#onAlert({
                    kind: 'sub',
                    user: event.user_name,
                    tier: tierLevel(event.tier),
                    months: event.cumulative_months ?? 1,
                    message: event.message?.text || null
                });
                break;
            case 'channel.subscription.gift':
                this.#onAlert({
                    kind: 'giftsub',
                    user: event.is_anonymous ? null : event.user_name,
                    tier: tierLevel(event.tier),
                    count: event.total ?? 1,
                    total: event.cumulative_total ?? null
                });
                break;
            case 'channel.cheer':
                this.#onAlert({
                    kind: 'cheer',
                    user: event.is_anonymous ? null : event.user_name,
                    bits: event.bits,
                    message: event.message || null
                });
                break;
            default:
                break;
        }
    }

    async #fetchChannel(login) {
        if (!this.#helix) return fetchPublicChannel(login);

        const channel = await this.#helix.fetchChannel(login);
        if (!channel) return null;

        if (this.#state.twitch.source === 'user') {
            const followers = await this.#helix.fetchFollowers(channel.id).catch(() => null);
            channel.followers = followers?.total ?? null;
            channel.lastFollower = followers?.latest ?? null;
        } else {
            // Les followers ne sont pas accessibles avec un jeton d'application : complément best-effort.
            channel.followers = await fetchPublicFollowerCount(login).catch(() => null);
        }
        return channel;
    }

    async #poll() {
        const { enabled, channel } = this.#settings;
        const login = channel.trim().toLowerCase();
        const twitch = this.#state.twitch;

        if (!enabled || !login) {
            this.#clear(null);
            twitch.name = null;
            this.#state.commit();
            return;
        }

        try {
            const data = await this.#fetchChannel(login);
            if (data) {
                this.#apply(data);
            } else {
                this.#clear(`Chaîne « ${channel} » introuvable`);
                twitch.name = channel;
            }
        } catch (err) {
            this.#clear(`Twitch injoignable : ${err.message}`);
        }
        this.#state.commit();
    }

    #apply(data) {
        const state = this.#state;
        Object.assign(state.twitch, {
            error: null,
            name: data.displayName,
            title: data.title,
            category: data.category,
            language: data.language,
            broadcasterType: data.broadcasterType,
            isLive: Boolean(data.stream),
            startedAt: data.stream?.startedAt ?? null
        });
        if (data.lastFollower) state.twitch.lastFollower = data.lastFollower;

        state.setMetric('FLW', data.followers, '', 0);

        const session = this.#session.update(data.stream, data.followers);
        if (session) {
            state.setMetric('VWR', data.stream.viewers, '', 0);
            state.setMetric('PEAK', session.peakViewers, '', 0);
            state.setMetric('AVG', session.averageViewers, '', 0);
            state.setMetric('NEW', session.followersGained, '', 0);
        } else {
            state.removeMetrics('VWR', 'PEAK', 'AVG', 'NEW');
        }
    }

    #clear(error) {
        Object.assign(this.#state.twitch, {
            error, title: null, category: null, language: null, broadcasterType: null, isLive: false, startedAt: null
        });
        this.#session.update(null, null);
        this.#state.removeMetrics(...TWITCH_METRICS);
    }
}

// Twitch code les paliers « 1000 », « 2000 », « 3000 ».
function tierLevel(tier) {
    return Math.max(1, Math.round(Number(tier) / 1000) || 1);
}
