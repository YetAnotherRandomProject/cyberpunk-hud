const API_URL = 'https://api.twitch.tv/helix';

/**
 * Client de l'API officielle Twitch (Helix).
 * `tokens` fournit le jeton : AppTokenProvider (infos publiques) ou
 * TwitchAuth (compte connecté : followers et EventSub en plus).
 */
export class HelixClient {
    #clientId;
    #tokens;

    constructor(clientId, tokens) {
        this.#clientId = clientId;
        this.#tokens = tokens;
    }

    async getUser(login) {
        const { data: [user] } = await this.#request('GET', '/users', { login });
        return user ?? null;
    }

    async fetchChannel(login) {
        const user = await this.getUser(login);
        if (!user) return null;

        const [channels, streams] = await Promise.all([
            this.#request('GET', '/channels', { broadcaster_id: user.id }),
            this.#request('GET', '/streams', { user_id: user.id })
        ]);
        const channel = channels.data[0];
        const stream = streams.data[0];

        return {
            id: user.id,
            displayName: user.display_name,
            title: channel?.title || null,
            category: channel?.game_name || null,
            language: channel?.broadcaster_language?.toUpperCase() || null,
            broadcasterType: user.broadcaster_type || null,
            followers: null,
            stream: stream
                ? { viewers: stream.viewer_count, startedAt: Date.parse(stream.started_at) }
                : null
        };
    }

    // Total des followers et dernier follower (le détail exige d'être le streameur ou un modérateur).
    async fetchFollowers(broadcasterId) {
        const json = await this.#request('GET', '/channels/followers', { broadcaster_id: broadcasterId, first: 1 });
        const latest = json.data?.[0];
        return {
            total: json.total ?? null,
            latest: latest ? { name: latest.user_name, at: Date.parse(latest.followed_at) } : null
        };
    }

    // Badges globaux puis badges de la chaîne (qui remplacent les globaux de même clé).
    async fetchBadges(broadcasterId) {
        const [global, channel] = await Promise.all([
            this.#request('GET', '/chat/badges/global'),
            this.#request('GET', '/chat/badges', { broadcaster_id: broadcasterId })
        ]);
        const badges = new Map();
        for (const set of [...global.data, ...channel.data]) {
            for (const version of set.versions) {
                badges.set(`${set.set_id}/${version.id}`, { title: version.title, url: version.image_url_2x });
            }
        }
        return badges;
    }

    createEventSubSubscription(type, version, condition, sessionId) {
        return this.#request('POST', '/eventsub/subscriptions', null, {
            type,
            version,
            condition,
            transport: { method: 'websocket', session_id: sessionId }
        });
    }

    async #request(method, path, params, body, retryOnAuthError = true) {
        const token = await this.#tokens.getToken();
        const query = params ? `?${new URLSearchParams(params)}` : '';
        const res = await fetch(`${API_URL}${path}${query}`, {
            method,
            headers: {
                'Client-Id': this.#clientId,
                Authorization: `Bearer ${token}`,
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(8000)
        });
        if (res.status === 401 && retryOnAuthError) {
            // Jeton révoqué ou expiré plus tôt que prévu : on en redemande un.
            this.#tokens.invalidate();
            return this.#request(method, path, params, body, false);
        }
        if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.message || `API Twitch HTTP ${res.status}`);
        }
        return res.json();
    }
}
