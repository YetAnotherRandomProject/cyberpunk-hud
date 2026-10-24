import './GraphLegendItem.css';

export default function GraphLegendItem({ label, color }) {
    return (
        <span className="graph-legend-item">
            <i className="graph-legend-item__dot" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
            {label}
        </span>
    );
}
