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

export default function StatusPanel({ connected, config, telemetry }) {
    return (
        <div className="status-panel">
            <StatusLight label="Serveur HUD" {...(connected ? { tone: 'ok', text: 'Actif' } : { tone: 'error', text: 'Injoignable' })} />
            <StatusLight label="OBS" {...obsStatus(config, telemetry)} />
            <StatusLight label="FPS du jeu" {...fpsStatus(telemetry.fps, config.system.fpsEnabled)} />
            <StatusLight label="Twitch" {...twitchStatus(config, telemetry)} />
            <StatusLight label="Tchat" {...chatStatus(config, telemetry)} />
        </div>
    );
}
