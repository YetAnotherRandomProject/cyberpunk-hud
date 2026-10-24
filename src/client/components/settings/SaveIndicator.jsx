import './SaveIndicator.css';

const LABELS = {
    idle: { text: 'Enregistrement automatique', tone: 'dim' },
    pending: { text: 'Modifications en attente…', tone: 'warn' },
    saving: { text: 'Enregistrement…', tone: 'warn' },
    saved: { text: 'Enregistré', tone: 'ok' },
    error: { text: "Échec de l'enregistrement", tone: 'error' }
};

export default function SaveIndicator({ saveState, connected }) {
    const { text, tone } = connected
        ? LABELS[saveState]
        : { text: 'Serveur injoignable', tone: 'error' };

    return <span className={`save-indicator is-${tone}`}>{text}</span>;
}
