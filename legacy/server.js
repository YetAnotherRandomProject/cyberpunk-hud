require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { default: OBSWebSocket } = require('obs-websocket-js');

const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'layout-config.json');

const defaultConfig = {
    streamerName: process.env.TWITCH_CHANNEL || "",
    clearanceLevel: "LEVEL_04_EXEC",
    connectionId: "555.441.26",
    cardFlipIntervalSec: 10,
    widgets: {
        topLeftBrand: { enabled: true, x: 44, y: 24, scale: 1, tilt: 8 },
        topCenterTelemetry: { enabled: true, x: 690, y: 38, scale: 1, tilt: 0 },
        bottomLeftModule: { enabled: true, x: 44, y: 825, scale: 1, tilt: 12 },
        bottomRightTicker: { enabled: true, x: 1410, y: 940, scale: 1, tilt: -12 }
    }
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
        return defaultConfig;
    }
    try {
        return { ...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
    } catch (e) {
        return defaultConfig;
    }
}

let currentConfig = loadConfig();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => res.json(currentConfig));
app.post('/api/config', (req, res) => {
    currentConfig = { ...currentConfig, ...req.body };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
    pollPublicStreamInfo();
    broadcast({ type: 'CONFIG_UPDATE', data: currentConfig });
    res.json({ status: 'ok', config: currentConfig });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// État télémétrique strict : tout est à null tant qu'aucune vraie donnée n'est récupérée
const telemetryState = {
    obsConnected: false,
    streamer: {
        name: currentConfig.streamerName || null,
        category: null,
        scene: null,
        title: null,
        isLive: false,
        uptimeSeconds: null
    },
    metrics: {}
};

// Met à jour une métrique uniquement lorsqu'une vraie valeur numérique est fournie
function setRealMetric(key, label, rawValue, unit = '', decimals = 1) {
    if (rawValue === null || rawValue === undefined || !Number.isFinite(Number(rawValue))) {
        delete telemetryState.metrics[key];
        return;
    }

    const newVal = decimals === 0 ? Math.round(Number(rawValue)) : Number(Number(rawValue).toFixed(decimals));
    const existing = telemetryState.metrics[key];
    const lowerIsBetter = ['CPU', 'DRP', 'FRM'].includes(key);

    let diffStr = null;
    let isUp = true;

    if (existing && existing.value !== undefined) {
        const delta = newVal - existing.value;
        if (Math.abs(delta) > 0.005) {
            const sign = delta > 0 ? '+' : '';
            const formattedDelta = decimals === 0 ? Math.round(delta) : delta.toFixed(decimals);
            diffStr = `${sign}${formattedDelta}${unit}`;
            isUp = lowerIsBetter ? (delta <= 0) : (delta >= 0);
        } else {
            diffStr = existing.diff;
            isUp = existing.up;
        }
    }

    telemetryState.metrics[key] = {
        label,
        value: newVal,
        unit,
        diff: diffStr,
        up: isUp
    };
}

function removeMetric(key) {
    delete telemetryState.metrics[key];
}

// ============================================================================
// 1. CONNEXION ET POLLING OBS WEBSOCKET (UNIQUEMENT VRAIES DONNÉES)
// ============================================================================
const obs = new OBSWebSocket();
let obsConnected = false;
let lastBytesSent = null;
let lastBytesTimestamp = null;

function clearOBSData() {
    obsConnected = false;
    telemetryState.obsConnected = false;
    telemetryState.streamer.scene = null;
    telemetryState.streamer.uptimeSeconds = null;
    lastBytesSent = null;
    lastBytesTimestamp = null;
    ['CPU', 'FRM', 'FPS', 'RAM', 'BIT', 'DRP'].forEach(removeMetric);
}

async function connectOBS() {
    const obsUrl = process.env.OBS_WS_URL || 'ws://127.0.0.1:4455';
    const obsPass = process.env.OBS_WS_PASSWORD || undefined;
    try {
        await obs.connect(obsUrl, obsPass);
        obsConnected = true;
        telemetryState.obsConnected = true;
        console.log('[OBS] Connecté à OBS WebSocket sur', obsUrl);

        const sceneData = await obs.call('GetCurrentProgramScene');
        telemetryState.streamer.scene = sceneData?.currentProgramSceneName || null;
    } catch (err) {
        clearOBSData();
    }
}

obs.on('ConnectionClosed', () => {
    clearOBSData();
    broadcast({ type: 'TELEMETRY_UPDATE', data: telemetryState });
    setTimeout(connectOBS, 8000);
});

obs.on('CurrentProgramSceneChanged', (data) => {
    telemetryState.streamer.scene = data?.sceneName || null;
    broadcast({ type: 'TELEMETRY_UPDATE', data: telemetryState });
});

async function pollOBSStats() {
    if (!obsConnected) return;

    try {
        const stats = await obs.call('GetStats');
        setRealMetric('CPU', 'CPU', stats.cpuUsage, '%', 2);
        setRealMetric('FRM', 'FRM', stats.averageFrameRenderTime, 'ms', 2);
        setRealMetric('FPS', 'FPS', stats.activeFps, '', 1);
        setRealMetric('RAM', 'RAM', stats.memoryUsage, 'MB', 0);

        const streamStatus = await obs.call('GetStreamStatus');
        if (streamStatus.outputActive) {
            telemetryState.streamer.uptimeSeconds = Math.floor(streamStatus.outputDuration / 1000);

            const now = Date.now();
            if (lastBytesTimestamp !== null && lastBytesSent !== null) {
                const elapsedSec = (now - lastBytesTimestamp) / 1000;
                if (elapsedSec > 0 && streamStatus.outputBytes >= lastBytesSent) {
                    const kbps = Math.round(((streamStatus.outputBytes - lastBytesSent) * 8) / 1000 / elapsedSec);
                    setRealMetric('BIT', 'BIT', kbps, 'kb/s', 0);
                }
            }
            lastBytesSent = streamStatus.outputBytes;
            lastBytesTimestamp = now;

            if (streamStatus.outputTotalFrames > 0) {
                const dropRatio = (streamStatus.outputSkippedFrames / streamStatus.outputTotalFrames) * 100;
                setRealMetric('DRP', 'DRP', dropRatio, '%', 1);
            } else {
                removeMetric('DRP');
            }
        } else {
            // Pas de stream actif dans OBS : on retire le bitrate, les drops et l'uptime OBS
            telemetryState.streamer.uptimeSeconds = null;
            lastBytesSent = null;
            lastBytesTimestamp = null;
            removeMetric('BIT');
            removeMetric('DRP');
        }
    } catch (err) {
        clearOBSData();
    }
}

// ============================================================================
// 2. RÉCUPÉRATION TWITCH (UNIQUEMENT VRAIES DONNÉES SI EN LIVE / CONFIGURÉ)
// ============================================================================
function clearTwitchData() {
    telemetryState.streamer.category = null;
    telemetryState.streamer.title = null;
    telemetryState.streamer.isLive = false;
    removeMetric('VWR');
}

async function pollPublicStreamInfo() {
    const login = (currentConfig.streamerName || '').trim().toLowerCase();
    if (!login) {
        telemetryState.streamer.name = null;
        clearTwitchData();
        return;
    }

    try {
        const query = {
            query: `query {
                user(login: "${login}") {
                    displayName
                    broadcastSettings { title game { displayName } }
                    stream { viewersCount createdAt }
                }
            }`
        };

        const res = await fetch('https://gql.twitch.tv/gql', {
            method: 'POST',
            headers: {
                'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(query)
        });

        const json = await res.json();
        const user = json?.data?.user;

        if (!user) {
            telemetryState.streamer.name = currentConfig.streamerName;
            clearTwitchData();
            return;
        }

        telemetryState.streamer.name = user.displayName || currentConfig.streamerName;
        telemetryState.streamer.title = user.broadcastSettings?.title || null;
        telemetryState.streamer.category = user.broadcastSettings?.game?.displayName || null;

        if (user.stream && typeof user.stream.viewersCount === 'number') {
            telemetryState.streamer.isLive = true;
            setRealMetric('VWR', 'VWR', user.stream.viewersCount, '', 0);

            // Si OBS ne fournit pas déjà l'uptime, on utilise le vrai createdAt du live Twitch
            if (telemetryState.streamer.uptimeSeconds === null && user.stream.createdAt) {
                telemetryState.streamer.uptimeSeconds = Math.floor((Date.now() - new Date(user.stream.createdAt).getTime()) / 1000);
            }
        } else {
            telemetryState.streamer.isLive = false;
            removeMetric('VWR');
        }
    } catch (e) {
        clearTwitchData();
    }
}

// ============================================================================
// 3. DIFFUSION WEBSOCKET AUX CLIENTS OVERLAY
// ============================================================================
function broadcast(payload) {
    const msg = JSON.stringify(payload);
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(msg);
    });
}

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'INIT', config: currentConfig, telemetry: telemetryState }));
});

setInterval(async () => {
    await pollOBSStats();
    broadcast({ type: 'TELEMETRY_UPDATE', data: telemetryState });
}, 2000);

setInterval(async () => {
    await pollPublicStreamInfo();
    broadcast({ type: 'TELEMETRY_UPDATE', data: telemetryState });
}, 8000);

server.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` OVERLAY ARASAKA HUD ACTIF SUR : http://localhost:${PORT}`);
    console.log(` MODE ÉDITION DU LAYOUT        : http://localhost:${PORT}/?edit=true`);
    console.log(`========================================================`);
    connectOBS();
    pollPublicStreamInfo();
});