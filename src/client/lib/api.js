async function send(method, url, { json, file, headers } = {}) {
    const res = await fetch(url, {
        method,
        headers: json !== undefined ? { 'Content-Type': 'application/json' } : headers,
        body: json !== undefined ? JSON.stringify(json) : file
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `${method} ${url} : HTTP ${res.status}`);
    return body;
}

const request = (method, url, json) => send(method, url, { json });
// Fichier envoyé brut ; son nom d'origine (et d'autres infos) voyagent dans les en-têtes.
const upload = (method, url, file, headers = {}) => send(method, url, {
    file,
    headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), ...headers }
});

export const saveConfig = config => request('PUT', '/api/config', config);
export const fetchDefaults = () => request('GET', '/api/config/defaults');
export const importConfig = file => upload('POST', '/api/config/import', file);
export const requestRestart = () => request('POST', '/api/restart');
export const startTwitchAuth = () => request('POST', '/api/twitch/auth/start');
export const cancelTwitchAuth = () => request('POST', '/api/twitch/auth/cancel');
export const logoutTwitch = () => request('POST', '/api/twitch/auth/logout');
export const sendTestAlert = kind => request('POST', '/api/alerts/test', { kind });
export const removeQueuedAlert = id => request('DELETE', `/api/alerts/queue/${encodeURIComponent(id)}`);
export const clearQueuedAlerts = (kind = null) => request('DELETE', `/api/alerts/queue${kind ? `?kind=${kind}` : ''}`);
export const skipAlert = () => request('POST', '/api/alerts/skip');
export const uploadSound = (kind, file, durationMs) => upload('PUT', `/api/sounds/${kind}`, file, { 'X-Duration-Ms': String(durationMs) });
export const deleteSound = kind => request('DELETE', `/api/sounds/${kind}`);
export const fetchOpenWindows = () => request('GET', '/api/system/windows');
export const restartFrameRate = () => request('POST', '/api/system/fps/restart');
