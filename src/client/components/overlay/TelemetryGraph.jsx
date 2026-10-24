import { useEffect, useRef } from 'react';
import { drawCurves } from '../../lib/drawCurves.js';
import { withAlpha } from '../../lib/theme.js';
import './TelemetryGraph.css';

// Courbes superposées dessinées sur canvas. Une série a besoin d'au moins 2 points.
export default function TelemetryGraph({ series, history, gridColor }) {
    const canvasRef = useRef(null);

    const curves = series
        .filter(s => (history[s.key]?.length ?? 0) >= 2)
        .map(s => ({
            values: history[s.key],
            minSpread: s.minSpread,
            color: s.color,
            fill: withAlpha(s.color, 0.1)
        }));

    useEffect(() => {
        if (canvasRef.current) drawCurves(canvasRef.current, curves, withAlpha(gridColor, 0.22));
    });

    return (
        <div className="telemetry-graph">
            <canvas ref={canvasRef} width={240} height={86} />
            {curves.length === 0 && <div className="telemetry-graph__empty">NO ACTIVE TELEMETRY</div>}
        </div>
    );
}
