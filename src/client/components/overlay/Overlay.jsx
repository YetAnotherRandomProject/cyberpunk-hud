import { themeVariables } from '../../lib/theme.js';
import Widget from './Widget.jsx';
import TopLeftBrand from './TopLeftBrand.jsx';
import TopCenterTelemetry from './TopCenterTelemetry.jsx';
import StreamerCard from './StreamerCard.jsx';
import StockTicker from './StockTicker.jsx';
import LastEvent from './LastEvent.jsx';
import { LAST_EVENTS } from './lastEvents.js';
import AlertBanner from './AlertBanner.jsx';
import ChatBox from './ChatBox.jsx';
import './Overlay.css';

/**
 * Le HUD complet en 1920x1080. En mode édition (aperçu des réglages), les widgets
 * se déplacent à la souris et se sélectionnent d'un clic ; `previewScale` est l'échelle
 * d'affichage de l'aperçu, pour convertir les déplacements en pixels HUD.
 */
export default function Overlay({
    config, telemetry, alerts = [], chat = [],
    editable = false, previewScale = 1, selectedWidget = null, onWidgetMove, onWidgetSelect
}) {
    const { hud, theme, widgets, twitch, texts } = config;
    const widgetProps = id => ({
        id,
        layout: widgets[id],
        editable,
        selected: id === selectedWidget,
        previewScale,
        onMove: onWidgetMove,
        onSelect: onWidgetSelect
    });

    return (
        <div className={`hud-root${editable ? ' is-editing' : ''}`} style={themeVariables(theme)}>
            <Widget {...widgetProps('topLeftBrand')}>
                <TopLeftBrand brandName={hud.brandName} />
            </Widget>

            <Widget {...widgetProps('topCenterTelemetry')}>
                <TopCenterTelemetry hud={hud} texts={texts.topCenterTelemetry} telemetry={telemetry} />
            </Widget>

            <Widget {...widgetProps('bottomLeftModule')}>
                <StreamerCard hud={hud} texts={texts.bottomLeftModule} theme={theme} telemetry={telemetry} fallbackName={twitch.channel} />
            </Widget>

            <Widget {...widgetProps('bottomRightTicker')}>
                <StockTicker hud={hud} texts={texts.bottomRightTicker} telemetry={telemetry} />
            </Widget>

            {LAST_EVENTS.map(({ id, read }) => (
                <Widget key={id} {...widgetProps(id)}>
                    <LastEvent
                        label={texts[id].label}
                        event={read(telemetry.streamer, texts[id])}
                        showPlaceholder={editable}
                    />
                </Widget>
            ))}

            {config.chat.enabled && (
                <Widget {...widgetProps('chatBox')}>
                    <ChatBox messages={chat} settings={config.chat} title={texts.chatBox.title} showPlaceholder={editable} />
                </Widget>
            )}

            {/* En dernier pour passer au-dessus des autres éléments */}
            <Widget {...widgetProps('alertBanner')}>
                <AlertBanner alerts={alerts} texts={texts.alertBanner} durationSec={config.alerts.durationSec} showPlaceholder={editable} />
            </Widget>
        </div>
    );
}
