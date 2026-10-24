async function request(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `${method} ${url} : HTTP ${res.status}`);
    return json;
}

export const saveConfig = config => request('PUT', '/api/config', config);
export const fetchDefaults = () => request('GET', '/api/config/defaults');
export const importConfig = file => request('POST', '/api/config/import', file);
export const requestRestart = () => request('POST', '/api/restart');
export const startTwitchAuth = () => request('POST', '/api/twitch/auth/start');
export const cancelTwitchAuth = () => request('POST', '/api/twitch/auth/cancel');
export const logoutTwitch = () => request('POST', '/api/twitch/auth/logout');
export const sendTestAlert = kind => request('POST', '/api/alerts/test', { kind });
export const fetchOpenWindows = () => request('GET', '/api/system/windows');
export const restartFrameRate = () => request('POST', '/api/system/fps/restart');
