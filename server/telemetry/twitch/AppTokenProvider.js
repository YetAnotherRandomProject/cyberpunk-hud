import { postOAuth } from './oauth.js';

const TOKEN_MARGIN_MS = 60_000;

// Jeton d'application (client credentials) : infos publiques seulement, pas d'EventSub WebSocket.
export class AppTokenProvider {
    #clientId;
    #clientSecret;
    #token = null;

    constructor(clientId, clientSecret) {
        this.#clientId = clientId;
        this.#clientSecret = clientSecret;
    }

    async getToken() {
        if (this.#token && this.#token.expiresAt - TOKEN_MARGIN_MS > Date.now()) {
            return this.#token.value;
        }
        const { ok, json } = await postOAuth('token', {
            client_id: this.#clientId,
            client_secret: this.#clientSecret,
            grant_type: 'client_credentials'
        });
        if (!ok) throw new Error('Client ID ou secret Twitch refusé');
        this.#token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
        return this.#token.value;
    }

    invalidate() {
        this.#token = null;
    }
}
