import { themeVariables } from '../../lib/theme.js';
import Widget from './Widget.jsx';
import TopLeftBrand from './TopLeftBrand.jsx';
import TopCenterTelemetry from './TopCenterTelemetry.jsx';
import StreamerCard from './StreamerCard.jsx';
import StockTicker from './StockTicker.jsx';
import LastFollower from './LastFollower.jsx';
import AlertBanner from './AlertBanner.jsx';
import ChatBox from './ChatBox.jsx';
import './Overlay.css';

/**
 * Le HUD complet en 1920x1080. En mode édition (aperçu des réglages),
 * les widgets sont déplaçables à la souris ; `previewScale` est l'échelle
 * d'affichage de l'aperçu, pour convertir les déplacements en pixels HUD.
 */
export default function Overlay({ config, telemetry, alerts = [], chat = [], editable = false, previewScale = 1, onWidgetMove }) {
    const { hud, theme, widgets, twitch } = config;
    const widgetProps = id => ({ id, layout: widgets[id], editable, previewScale, onMove: onWidgetMove });

    return (
        <div className={`hud-root${editable ? ' is-editing' : ''}`} style={themeVariables(theme)}>
            <Widget {...widgetProps('topLeftBrand')}>
                <TopLeftBrand brandName={hud.brandName} />
            </Widget>

            <Widget {...widgetProps('topCenterTelemetry')}>
                <TopCenterTelemetry hud={hud} telemetry={telemetry} />
            </Widget>

            <Widget {...widgetProps('bottomLeftModule')}>
                <StreamerCard hud={hud} theme={theme} telemetry={telemetry} fallbackName={twitch.channel} />
            </Widget>

            <Widget {...widgetProps('bottomRightTicker')}>
                <StockTicker hud={hud} telemetry={telemetry} />
            </Widget>

            <Widget {...widgetProps('lastFollower')}>
                <LastFollower follower={telemetry.streamer.lastFollower} showPlaceholder={editable} />
            </Widget>

            {config.chat.enabled && (
                <Widget {...widgetProps('chatBox')}>
                    <ChatBox messages={chat} settings={config.chat} showPlaceholder={editable} />
                </Widget>
            )}

            {/* En dernier pour passer au-dessus des autres éléments */}
            <Widget {...widgetProps('alertBanner')}>
                <AlertBanner alerts={alerts} durationSec={config.alerts.durationSec} showPlaceholder={editable} />
            </Widget>
        </div>
    );
}
