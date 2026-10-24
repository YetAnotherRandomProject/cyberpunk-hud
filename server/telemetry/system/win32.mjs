import { randomBytes } from 'node:crypto';
import koffi from 'koffi';

// Liaisons directes vers l'API Windows (via koffi, sans module natif à compiler).
// Chargées à la première utilisation : rien n'est chargé hors Windows.
let api = null;

function load() {
    if (api) return api;
    if (process.platform !== 'win32') throw new Error('Disponible uniquement sous Windows');

    const advapi32 = koffi.load('advapi32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    const user32 = koffi.load('user32.dll');
    const shell32 = koffi.load('shell32.dll');

    const RECT = koffi.struct('RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
    const MONITORINFO = koffi.struct('MONITORINFO', { cbSize: 'uint32', rcMonitor: RECT, rcWork: RECT, dwFlags: 'uint32' });
    // EVENT_TRACE_LOGFILEW (x64, 448 octets). CurrentEvent et LogfileHeader ne servent pas en temps réel.
    const EVENT_TRACE_LOGFILEW = koffi.struct('EVENT_TRACE_LOGFILEW', {
        LogFileName: 'const char16_t *',
        LoggerName: 'const char16_t *',
        CurrentTime: 'int64_t',
        BuffersRead: 'uint32_t',
        ProcessTraceMode: 'uint32_t',
        CurrentEventAndHeader: koffi.array('uint8_t', 88 + 280),
        BufferCallback: 'void *',
        BufferSize: 'uint32_t',
        Filled: 'uint32_t',
        EventsLost: 'uint32_t',
        EventRecordCallback: 'void *',
        IsKernelTrace: 'uint32_t',
        Context: 'void *'
    });
    koffi.proto('void __stdcall EventRecordCallback(void *record)');

    api = {
        RECT,
        MONITORINFO,
        EVENT_TRACE_LOGFILEW,
        StartTraceW: advapi32.func('uint32_t __stdcall StartTraceW(_Out_ uint64_t *handle, const char16_t *name, void *props)'),
        ControlTraceW: advapi32.func('uint32_t __stdcall ControlTraceW(uint64_t handle, const char16_t *name, void *props, uint32_t code)'),
        EnableTraceEx2: advapi32.func('uint32_t __stdcall EnableTraceEx2(uint64_t handle, void *provider, uint32_t code, uint8_t level, uint64_t any, uint64_t all, uint32_t timeout, void *params)'),
        OpenTraceW: advapi32.func('uint64_t __stdcall OpenTraceW(EVENT_TRACE_LOGFILEW *logfile)'),
        ProcessTrace: advapi32.func('uint32_t __stdcall ProcessTrace(uint64_t *handles, uint32_t count, void *start, void *end)'),
        CloseTrace: advapi32.func('uint32_t __stdcall CloseTrace(uint64_t handle)'),
        QueryPerformanceFrequency: kernel32.func('bool __stdcall QueryPerformanceFrequency(_Out_ int64_t *frequency)'),
        OpenProcess: kernel32.func('void * __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'),
        QueryFullProcessImageNameW: kernel32.func('bool __stdcall QueryFullProcessImageNameW(void *process, uint32_t flags, void *name, _Inout_ uint32_t *size)'),
        CloseHandle: kernel32.func('bool __stdcall CloseHandle(void *handle)'),
        GetForegroundWindow: user32.func('void * __stdcall GetForegroundWindow()'),
        GetWindowThreadProcessId: user32.func('uint32_t __stdcall GetWindowThreadProcessId(void *hwnd, _Out_ uint32_t *pid)'),
        GetWindowLongW: user32.func('int32_t __stdcall GetWindowLongW(void *hwnd, int32_t index)'),
        GetWindowRect: user32.func('bool __stdcall GetWindowRect(void *hwnd, _Out_ RECT *rect)'),
        MonitorFromWindow: user32.func('void * __stdcall MonitorFromWindow(void *hwnd, uint32_t flags)'),
        GetMonitorInfoW: user32.func('bool __stdcall GetMonitorInfoW(void *monitor, _Inout_ MONITORINFO *info)'),
        SHQueryUserNotificationState: shell32.func('int32_t __stdcall SHQueryUserNotificationState(_Out_ int32_t *state)')
    };
    return api;
}

export const win32 = () => load();

// ---------------------------------------------------------------------------
// Processus et fenêtres

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const MONITOR_DEFAULTTONEAREST = 2;
const QUNS_RUNNING_D3D_FULL_SCREEN = 3;
const GWL_STYLE = -16;
const WS_CAPTION = 0x00C00000;

// Nom de l'exécutable d'un processus (ex. « Cyberpunk2077.exe »), ou null s'il est inaccessible.
export function processImageName(pid) {
    const w = load();
    const handle = w.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
    if (!handle) return null;
    try {
        const buffer = Buffer.alloc(1024 * 2);
        const size = [1024];
        if (!w.QueryFullProcessImageNameW(handle, 0, buffer, size)) return null;
        const fullPath = buffer.toString('utf16le', 0, size[0] * 2);
        return fullPath.slice(fullPath.lastIndexOf('\\') + 1);
    } finally {
        w.CloseHandle(handle);
    }
}

/**
 * Fenêtre au premier plan : { pid, fullscreen, exclusive }.
 * `fullscreen` : la fenêtre sans barre de titre couvre tout son écran (plein écran exclusif
 *                ou fenêtré sans bordure ; une fenêtre simplement agrandie ne compte pas).
 * `exclusive`  : Windows signale une application Direct3D en plein écran exclusif.
 */
export function foregroundWindow() {
    const w = load();
    const hwnd = w.GetForegroundWindow();
    if (!hwnd) return null;

    const pid = [0];
    w.GetWindowThreadProcessId(hwnd, pid);

    const rect = {};
    const info = { cbSize: koffi.sizeof(w.MONITORINFO) };
    const monitor = w.MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
    const hasCaption = (w.GetWindowLongW(hwnd, GWL_STYLE) & WS_CAPTION) === WS_CAPTION;
    const covers = !hasCaption && w.GetWindowRect(hwnd, rect) && monitor && w.GetMonitorInfoW(monitor, info)
        && rect.left <= info.rcMonitor.left && rect.top <= info.rcMonitor.top
        && rect.right >= info.rcMonitor.right && rect.bottom >= info.rcMonitor.bottom;

    const state = [0];
    const exclusive = w.SHQueryUserNotificationState(state) === 0 && state[0] === QUNS_RUNNING_D3D_FULL_SCREEN;
    return { pid: pid[0], fullscreen: Boolean(covers || exclusive), exclusive };
}

// ---------------------------------------------------------------------------
// ETW (Event Tracing for Windows)

const EVENT_TRACE_PROPERTIES_SIZE = 120;
const WNODE_FLAG_TRACED_GUID = 0x00020000;
const EVENT_TRACE_REAL_TIME_MODE = 0x00000100;
const EVENT_TRACE_CONTROL_STOP = 1;
const EVENT_CONTROL_CODE_ENABLE_PROVIDER = 1;
const TRACE_LEVEL_VERBOSE = 5;
const PROCESS_TRACE_MODE_REAL_TIME = 0x00000100;
const PROCESS_TRACE_MODE_EVENT_RECORD = 0x10000000;
const INVALID_PROCESSTRACE_HANDLE = 0xFFFFFFFFFFFFFFFFn;

export const ERROR_ACCESS_DENIED = 5;
export const ERROR_ALREADY_EXISTS = 183;

export class Win32Error extends Error {
    constructor(fn, code) {
        super(`${fn} a échoué (code Windows ${code})`);
        this.code = code;
    }
}

// EVENT_TRACE_PROPERTIES suivi de la place pour le nom de session (rempli par Windows à l'arrêt).
function traceProperties() {
    const props = Buffer.alloc(EVENT_TRACE_PROPERTIES_SIZE + 1024 * 2);
    props.writeUInt32LE(props.length, 0);                     // Wnode.BufferSize
    randomBytes(16).copy(props, 24);                          // Wnode.Guid
    props.writeUInt32LE(1, 40);                               // Wnode.ClientContext : horodatage QPC
    props.writeUInt32LE(WNODE_FLAG_TRACED_GUID, 44);          // Wnode.Flags
    props.writeUInt32LE(EVENT_TRACE_REAL_TIME_MODE, 64);      // LogFileMode
    props.writeUInt32LE(1, 68);                               // FlushTimer (s)
    props.writeUInt32LE(EVENT_TRACE_PROPERTIES_SIZE, 116);    // LoggerNameOffset
    return props;
}

function guidBuffer(guid) {
    const hex = guid.replace(/-/g, '');
    const buffer = Buffer.alloc(16);
    buffer.writeUInt32LE(Number.parseInt(hex.slice(0, 8), 16), 0);
    buffer.writeUInt16LE(Number.parseInt(hex.slice(8, 12), 16), 4);
    buffer.writeUInt16LE(Number.parseInt(hex.slice(12, 16), 16), 6);
    Buffer.from(hex.slice(16), 'hex').copy(buffer, 8);
    return buffer;
}

// Arrête une session ETW par son nom (sans erreur si elle n'existe pas).
export function stopTraceSession(name) {
    return load().ControlTraceW(0n, name, traceProperties(), EVENT_TRACE_CONTROL_STOP);
}

// Démarre une session temps réel, en remplaçant une session du même nom restée ouverte.
export function startTraceSession(name) {
    const w = load();
    const handle = [0n];
    let code = w.StartTraceW(handle, name, traceProperties());
    if (code === ERROR_ALREADY_EXISTS) {
        stopTraceSession(name);
        code = w.StartTraceW(handle, name, traceProperties());
    }
    if (code !== 0) throw new Win32Error('StartTrace', code);
    return BigInt(handle[0]);
}

export function enableProvider(sessionHandle, guid, matchAnyKeyword) {
    const code = load().EnableTraceEx2(
        sessionHandle, guidBuffer(guid), EVENT_CONTROL_CODE_ENABLE_PROVIDER,
        TRACE_LEVEL_VERBOSE, BigInt(matchAnyKeyword), 0n, 0, null
    );
    if (code !== 0) throw new Win32Error('EnableTraceEx2', code);
}

// Lecture d'un champ de l'en-tête d'un événement (EVENT_HEADER). koffi.view() est exclu :
// Electron interdit les ArrayBuffer pointant vers de la mémoire externe.
export const readEventField = (recordPtr, offset, type) => koffi.decode(recordPtr, offset, type);

/**
 * Consomme la session en temps réel : bloque jusqu'à son arrêt (stopTraceSession).
 * `onEvent(recordPtr)` reçoit l'adresse de chaque EVENT_RECORD, à lire avec readEventField().
 */
export function consumeTraceSession(name, onEvent) {
    const w = load();
    const callback = koffi.register(onEvent, 'EventRecordCallback *');
    try {
        const traceHandle = BigInt(w.OpenTraceW({
            LogFileName: null,
            LoggerName: name,
            CurrentTime: 0,
            BuffersRead: 0,
            ProcessTraceMode: PROCESS_TRACE_MODE_REAL_TIME | PROCESS_TRACE_MODE_EVENT_RECORD,
            CurrentEventAndHeader: new Array(88 + 280).fill(0),
            BufferCallback: null,
            BufferSize: 0,
            Filled: 0,
            EventsLost: 0,
            EventRecordCallback: callback,
            IsKernelTrace: 0,
            Context: null
        }));
        if (traceHandle === INVALID_PROCESSTRACE_HANDLE) throw new Win32Error('OpenTrace', 0);
        try {
            return w.ProcessTrace([traceHandle], 1, null, null);
        } finally {
            w.CloseTrace(traceHandle);
        }
    } finally {
        koffi.unregister(callback);
    }
}

export function performanceFrequency() {
    const frequency = [0];
    load().QueryPerformanceFrequency(frequency);
    return Number(frequency[0]);
}
