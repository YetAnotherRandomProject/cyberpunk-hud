import { EventEmitter } from 'node:events';
import { readJsonFile, writeJsonFile } from '../../utils/jsonFile.js';
import { postOAuth, validateToken } from './oauth.js';

// moderator:read:followers : liste des followers et événement channel.follow.
// channel:read:subscriptions : subs, resubs et subs offerts. bits:read : cheers.
// channel.raid ne demande aucun scope.
export const USER_SCOPES = ['moderator:read:followers', 'channel:read:subscriptions', 'bits:read'];

const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const TOKEN_MARGIN_MS = 5 * 60_000;

/**
 * Connexion du compte Twitch du streameur par « Device Code Flow » :
 * l'utilisateur saisit un code sur twitch.tv/activate, sans URL de redirection.
 * Les jetons sont rafraîchis automatiquement et stockés à part de la config
 * (ils ne sont jamais envoyés aux pages web).
 *
 * Émet 'change' à chaque évolution de status().
 */
export class TwitchAuth extends EventEmitter {
    #filePath;
    #client = { clientId: '', clientSecret: '' };
    #credentials;
    #pending = null;
    #pollTimer = null;
    #refreshing = null;
    #error = null;

    constructor(filePath) {
        super();
        this.#filePath = filePath;
        this.#credentials = readJsonFile(filePath, null);
    }

    get isConnected() {
        return Boolean(this.#credentials);
    }

    get userId() {
        return this.#credentials?.userId ?? null;
    }

    setClient(clientId, clientSecret) {
        const changed = clientId !== this.#client.clientId;
        this.#client = { clientId, clientSecret };
        if (!changed) return;

        this.#cancelPending();
        // Des jetons émis pour une autre application ne sont plus utilisables.
        if (this.#credentials && this.#credentials.clientId !== clientId) this.#setCredentials(null);
        this.#emitChange();
    }

    // Scopes demandés depuis la connexion du compte (ajoutés par une mise à jour) :
    // il faut reconnecter le compte pour les accorder.
    get missingScopes() {
        const granted = this.#credentials?.scopes;
        if (!granted) return this.#credentials ? [...USER_SCOPES] : [];
        return USER_SCOPES.filter(scope => !granted.includes(scope));
    }

    status() {
        if (this.#credentials) {
            return { state: 'connected', login: this.#credentials.login, missingScopes: this.missingScopes };
        }
        if (this.#pending) {
            const { userCode, verificationUri, expiresAt } = this.#pending;
            return { state: 'pending', userCode, verificationUri, expiresAt };
        }
        return { state: 'disconnected', error: this.#error, canConnect: Boolean(this.#client.clientId) };
    }

    async startDeviceFlow() {
        const { clientId } = this.#client;
        if (!clientId) throw new Error('Renseignez d\'abord le Client ID de votre application Twitch.');

        this.#cancelPending();
        this.#error = null;
        const { ok, json } = await postOAuth('device', { client_id: clientId, scopes: USER_SCOPES.join(' ') });
        if (!ok) {
            throw new Error(json.message === 'invalid client'
                ? 'Client ID inconnu de Twitch : vérifiez-le sur dev.twitch.tv.'
                : json.message || 'Twitch a refusé la demande de connexion');
        }

        this.#pending = {
            deviceCode: json.device_code,
            userCode: json.user_code,
            verificationUri: json.verification_uri,
            expiresAt: Date.now() + json.expires_in * 1000,
            intervalMs: (json.interval || 5) * 1000
        };
        this.#schedulePoll();
        this.#emitChange();
    }

    cancel() {
        this.#cancelPending();
        this.#emitChange();
    }

    async logout() {
        const credentials = this.#credentials;
        this.#setCredentials(null);
        this.#error = null;
        this.#emitChange();
        if (credentials) {
            await postOAuth('revoke', { client_id: credentials.clientId, token: credentials.accessToken }).catch(() => {});
        }
    }

    // Interface « fournisseur de jeton » partagée avec AppTokenProvider.
    async getToken() {
        if (!this.#credentials) throw new Error('Compte Twitch non connecté');
        if (this.#credentials.expiresAt - TOKEN_MARGIN_MS > Date.now()) return this.#credentials.accessToken;
        return this.#refresh();
    }

    invalidate() {
        if (this.#credentials) this.#credentials.expiresAt = 0;
    }

    #schedulePoll() {
        clearTimeout(this.#pollTimer);
        this.#pollTimer = setTimeout(() => this.#pollDevice(), this.#pending.intervalMs);
    }

    async #pollDevice() {
        const pending = this.#pending;
        if (!pending) return;
        if (Date.now() > pending.expiresAt) {
            this.#fail('Le code a expiré, relancez la connexion.');
            return;
        }

        try {
            const { ok, json } = await postOAuth('token', {
                client_id: this.#client.clientId,
                client_secret: this.#client.clientSecret,
                scopes: USER_SCOPES.join(' '),
                device_code: pending.deviceCode,
                grant_type: DEVICE_GRANT
            });
            if (pending !== this.#pending) return;

            if (ok) {
                await this.#storeTokens(json);
                this.#pending = null;
                this.#emitChange();
            } else if (json.message === 'authorization_pending') {
                this.#schedulePoll();
            } else if (json.message === 'slow_down') {
                pending.intervalMs += 5000;
                this.#schedulePoll();
            } else {
                this.#fail(json.message === 'authorization_denied'
                    ? 'Connexion refusée sur Twitch.'
                    : `Connexion impossible : ${json.message || 'erreur inconnue'}`);
            }
        } catch {
            // Erreur réseau passagère : on réessaie au prochain intervalle.
            this.#schedulePoll();
        }
    }

    #refresh() {
        // Un refresh token ne sert qu'une fois : les appels simultanés partagent la même requête.
        this.#refreshing ??= (async () => {
            try {
                const { ok, json } = await postOAuth('token', {
                    client_id: this.#client.clientId,
                    client_secret: this.#client.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: this.#credentials.refreshToken
                });
                if (!ok) {
                    this.#setCredentials(null);
                    this.#error = 'Session Twitch expirée, reconnectez le compte.';
                    this.#emitChange();
                    throw new Error(this.#error);
                }
                await this.#storeTokens(json);
                return this.#credentials.accessToken;
            } finally {
                this.#refreshing = null;
            }
        })();
        return this.#refreshing;
    }

    async #storeTokens(json) {
        const info = await validateToken(json.access_token);
        if (!info) throw new Error('Jeton Twitch invalide');
        this.#setCredentials({
            clientId: this.#client.clientId,
            accessToken: json.access_token,
            refreshToken: json.refresh_token,
            expiresAt: Date.now() + json.expires_in * 1000,
            userId: info.user_id,
            login: info.login,
            scopes: info.scopes ?? []
        });
    }

    #setCredentials(credentials) {
        this.#credentials = credentials;
        writeJsonFile(this.#filePath, credentials);
    }

    #fail(message) {
        this.#cancelPending();
        this.#error = message;
        this.#emitChange();
    }

    #cancelPending() {
        clearTimeout(this.#pollTimer);
        this.#pending = null;
    }

    #emitChange() {
        this.emit('change', this.status());
    }
}
