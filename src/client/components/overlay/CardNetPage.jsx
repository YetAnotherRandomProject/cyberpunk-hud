import TelemetryGraph from './TelemetryGraph.jsx';
import GraphLegendItem from './GraphLegendItem.jsx';
import './CardNetPage.css';

// Page 2 de la carte : vraies courbes temps réel (CPU %, viewers, temps de rendu ms).
export default function CardNetPage({ title, theme, metrics, history }) {
    const series = [
        { key: 'FRM', color: theme.negative, minSpread: 0.4, format: v => `${v}ms` },
        { key: 'VWR', color: theme.positive, minSpread: 6, format: v => `${v}` },
        { key: 'CPU', color: theme.primary, minSpread: 1.5, format: v => `${v}%` }
    ].filter(s => metrics[s.key] !== undefined);

    // Ordre d'affichage de la légende : CPU, VWR, FRM.
    const legend = [...series].reverse();

    return (
        <div className="card-page">
            <div className="card-net__header">
                <span>{title}</span>
                <div className="card-net__legend">
                    {legend.map(s => <GraphLegendItem key={s.key} label={s.key} color={s.color} />)}
                </div>
            </div>

            <TelemetryGraph series={series} history={history} gridColor={theme.primary} />

            <div className="card-net__footer">
                {legend.map(s => (
                    <span key={s.key} style={{ color: s.color }}>
                        {s.key}: <strong>{s.format(metrics[s.key].value)}</strong>
                    </span>
                ))}
            </div>
        </div>
    );
}
