import TickerItem from './TickerItem.jsx';
import AudioGlyph from './AudioGlyph.jsx';
import './StockTicker.css';

// Bandeau boursier défilant (bas droite) alimenté par les métriques du PC, d'OBS et de Twitch.
export default function StockTicker({ hud, telemetry }) {
    const { BIT, FPS, RAM } = telemetry.metrics;
    const entries = Object.entries(telemetry.metrics);

    // Le contenu est rendu deux fois à la suite pour un défilement en boucle sans à-coup.
    const group = entries.length > 0
        ? entries.map(([key, metric]) => <TickerItem key={key} label={key} metric={metric} />)
        : <div className="ticker-item is-placeholder">AWAITING TELEMETRY LINK...</div>;

    return (
        <div className="stock-ticker">
            <div className="stock-ticker__top">
                <AudioGlyph />
                <div className="stock-ticker__connection">CONNECTION {hud.connectionId}</div>
            </div>

            <div className="stock-ticker__main">
                <span className="stock-ticker__bracket">]</span>

                <div className="stock-ticker__viewport">
                    <div className="stock-ticker__track" style={{ animationDuration: `${hud.tickerDurationSec}s` }}>
                        <div className="stock-ticker__group">{group}</div>
                        <div className="stock-ticker__group" aria-hidden="true">{group}</div>
                    </div>
                </div>

                <div className="stock-ticker__side">
                    {BIT && <span>{BIT.value}K</span>}
                    {FPS && <span>{Math.round(FPS.value)}FPS</span>}
                    {RAM && <span>{RAM.value}G</span>}
                    <div className="stock-ticker__mini-graph">
                        <span style={{ height: '45%' }} />
                        <span style={{ height: '85%' }} />
                        <span style={{ height: '65%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
