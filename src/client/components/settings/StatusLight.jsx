import './StatusLight.css';

// tone : 'ok' | 'warn' | 'error' | 'off'
export default function StatusLight({ label, tone, text }) {
    return (
        <div className={`status-light is-${tone}`}>
            <span className="status-light__dot" />
            <div className="status-light__content">
                <span className="status-light__label">{label}</span>
                <span className="status-light__text" title={text}>{text}</span>
            </div>
        </div>
    );
}
