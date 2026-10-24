import StatusLight from './StatusLight.jsx';
import { fpsStatus } from './SystemSettings.jsx';
import './StatusPanel.css';

function obsStatus(config, telemetry) {
    if (!config.obs.enabled) return { tone: 'off', text: 'Désactivé' };
    if (telemetry.obsConnected) return { tone: 'ok', text: `Connecté — scène « ${telemetry.streamer.scene ?? '?'} »` };
    return { tone: 'error', text: telemetry.obsError ? `Hors ligne : ${telemetry.obsError}` : 'Connexion en cours…' };
}

function twitchStatus(config, telemetry) {
    if (!config.twitch.enabled) return { tone: 'off', text: 'Désactivé' };
    if (!config.twitch.channel.trim()) return { tone: 'warn', text: 'Aucune chaîne renseignée' };
    if (telemetry.twitchError) return { tone: 'error', text: telemetry.twitchError };
    const source = { user: 'compte connecté', helix: 'API officielle', public: 'API publique' }[telemetry.twitchSource];
    if (telemetry.streamer.isLive) {
        return { tone: 'ok', text: `En live — ${telemetry.metrics.VWR?.value ?? 0} viewers (${source})` };
    }
    return { tone: 'warn', text: `Chaîne hors ligne (${source})` };
}

function chatStatus(config, telemetry) {
    if (!config.chat.enabled) return { tone: 'off', text: 'Désactivé' };
    if (!config.twitch.channel.trim()) return { tone: 'warn', text: 'Aucune chaîne renseignée' };
    if (telemetry.chatConnected) return { tone: 'ok', text: `Connecté à #${config.twitch.channel.trim().toLowerCase()}` };
    return { tone: 'error', text: telemetry.chatError || 'Connexion en cours…' };
}

// État de chaque service : [{ id, label, tone, text }], tone ∈ 'ok' | 'warn' | 'error' | 'off'.
export function serviceStatuses(connected, config, telemetry) {
    return [
        { id: 'server', label: 'Serveur HUD', ...(connected ? { tone: 'ok', text: 'Actif' } : { tone: 'error', text: 'Injoignable' }) },
        { id: 'obs', label: 'OBS', ...obsStatus(config, telemetry) },
        { id: 'fps', label: 'FPS du jeu', ...fpsStatus(telemetry.fps, config.system.fpsEnabled) },
        { id: 'twitch', label: 'Twitch', ...twitchStatus(config, telemetry) },
        { id: 'chat', label: 'Tchat', ...chatStatus(config, telemetry) }
    ];
}

export default function StatusPanel({ statuses }) {
    return (
        <div className="status-panel">
            {statuses.map(({ id, label, tone, text }) => <StatusLight key={id} label={label} tone={tone} text={text} />)}
        </div>
    );
}
