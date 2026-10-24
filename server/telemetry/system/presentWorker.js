// Thread dédié à la lecture des événements ETW : ProcessTrace() bloque jusqu'à l'arrêt
// de la session, et chaque événement passe par le callback ci-dessous.
import { parentPort, workerData } from 'node:worker_threads';
import { consumeTraceSession, enableProvider, readEventField, startTraceSession, Win32Error } from './win32.js';

// Fournisseurs ETW qui signalent chaque image présentée, et leurs événements « Present ».
// Le premier mot du GUID suffit à les distinguer.
const PROVIDERS = [
    // DirectX 10/11/12 : Present_Start, PresentMultiplaneOverlay_Start (mot-clé « Events »)
    { guid: 'ca11c036-0102-4a2d-a6ad-f03cfed5d3c9', key: 0xca11c036, api: 'dxgi', keywords: 0x2, events: [42, 55] },
    // Direct3D 9 : Present_Start
    { guid: '783aca0a-790e-4d7f-8451-aa850511c6b9', key: 0x783aca0a, api: 'd3d9', keywords: 0x2, events: [1] },
    // Noyau graphique (Vulkan, OpenGL…) : Blit, Flip, PresentHistory(Detailed)_Start, Present,
    // FlipMultiPlaneOverlay — tous émis dans le contexte du processus qui présente (mot-clé « Present »).
    { guid: '802ec45a-1e99-4b83-9920-87c98277ba9d', key: 0x802ec45a, api: 'kernel', keywords: 0x8000000, events: [166, 168, 171, 184, 215, 252] }
];
const FLUSH_INTERVAL_MS = 250;

const providerByKey = new Map(PROVIDERS.map(p => [p.key, p]));
const { sessionName } = workerData;

// pid → Map(« api:id » → { count, first, last }) ; horodatages QPC.
let batch = new Map();
let lastFlush = Date.now();

function flush() {
    const rows = [];
    for (const [pid, series] of batch) {
        for (const [key, { count, first, last }] of series) rows.push([pid, key, count, first, last]);
    }
    batch = new Map();
    lastFlush = Date.now();
    if (rows.length > 0) parentPort.postMessage({ type: 'batch', rows });
}

function onEvent(record) {
    // EVENT_HEADER : ProcessId @12, TimeStamp @16, ProviderId @24, EventDescriptor.Id @40
    const provider = providerByKey.get(readEventField(record, 24, 'uint32_t'));
    if (provider) {
        const id = readEventField(record, 40, 'uint16_t');
        if (provider.events.includes(id)) {
            const pid = readEventField(record, 12, 'uint32_t');
            const timestamp = Number(readEventField(record, 16, 'int64_t'));
            const key = `${provider.api}:${id}`;

            let series = batch.get(pid);
            if (!series) batch.set(pid, series = new Map());
            const entry = series.get(key);
            if (entry) {
                entry.count += 1;
                entry.last = timestamp;
            } else {
                series.set(key, { count: 1, first: timestamp, last: timestamp });
            }
        }
    }
    if (Date.now() - lastFlush >= FLUSH_INTERVAL_MS) flush();
}

try {
    const session = startTraceSession(sessionName);
    for (const provider of PROVIDERS) {
        // Un fournisseur absent (ex. Direct3D 9 non installé) ne bloque pas les autres.
        try {
            enableProvider(session, provider.guid, provider.keywords);
        } catch (err) {
            parentPort.postMessage({ type: 'warning', message: `${provider.api} : ${err.message}` });
        }
    }
    parentPort.postMessage({ type: 'started' });
    const code = consumeTraceSession(sessionName, onEvent);
    flush();
    parentPort.postMessage({ type: 'ended', code });
} catch (err) {
    parentPort.postMessage({ type: 'error', code: err instanceof Win32Error ? err.code : null, message: err.message });
}
