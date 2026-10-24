export const OAUTH_URL = 'https://id.twitch.tv/oauth2';

// POST x-www-form-urlencoded vers le serveur OAuth de Twitch. Les paramètres vides sont omis.
export async function postOAuth(endpoint, params) {
    const body = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const res = await fetch(`${OAUTH_URL}/${endpoint}`, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(8000)
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
}

// Infos du jeton utilisateur (login, id, scopes), ou null s'il est invalide.
export async function validateToken(accessToken) {
    const res = await fetch(`${OAUTH_URL}/validate`, {
        headers: { Authorization: `OAuth ${accessToken}` },
        signal: AbortSignal.timeout(8000)
    });
    return res.ok ? res.json() : null;
}
