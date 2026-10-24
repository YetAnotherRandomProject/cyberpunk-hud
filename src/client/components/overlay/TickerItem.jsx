import './TickerItem.css';

export default function TickerItem({ label, metric }) {
    const { value, unit, diff, up } = metric;
    return (
        <div className="ticker-item">
            <span className="ticker-item__name">{label}</span>
            <span className="ticker-item__value">{value}{unit}</span>
            {diff !== null && diff !== undefined && (
                <span className={`ticker-item__change ${up ? 'is-up' : 'is-down'}`}>
                    {up ? '▲' : '▼'} {diff}
                </span>
            )}
        </div>
    );
}
