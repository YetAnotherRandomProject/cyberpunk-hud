import { useClock } from '../../hooks/useClock.js';
import { formatHudClock, upper } from '../../lib/format.js';
import Barcode from './Barcode.jsx';
import './TopCenterTelemetry.css';

const MINI_BARCODE = [2, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 2];

// Barre de statut système Kiroshi (haut centre).
export default function TopCenterTelemetry({ hud, texts, telemetry }) {
    const now = useClock();
    const { category, isLive } = telemetry.streamer;
    const isOnline = Boolean(telemetry.obsConnected || isLive);

    return (
        <div className="top-telemetry">
            <div className="top-telemetry__header">
                <div className="top-telemetry__left">
                    <div className="top-telemetry__bars">
                        <span style={{ height: 10 }} />
                        <span style={{ height: 6 }} />
                        <span style={{ height: 8 }} />
                    </div>
                    <span>{texts.statusLabel}</span>
                </div>
                <div className="top-telemetry__serial">{hud.serialNumber}</div>
                <div className="top-telemetry__right">
                    <Barcode className="top-telemetry__barcode" widths={MINI_BARCODE} fixed />
                    <span>{hud.vendorName}</span>
                </div>
            </div>
            <div className="top-telemetry__sub">
                <span>
                    {isOnline ? texts.online : texts.offline}
                    {category && <span> // {upper(category)}</span>}
                </span>
                <span className="top-telemetry__clock">{formatHudClock(now, hud.yearPrefix)}</span>
            </div>
        </div>
    );
}
