import './SettingsTabs.css';

// Icônes au trait (24×24), dessinées avec la couleur du texte.
const ICONS = {
    sources: <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />,
    alerts: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
    chat: <path d="M4 5h16v11H9l-5 4z" />,
    system: <path d="M7 7h10v10H7zM10 2v5M14 2v5M10 17v5M14 17v5M2 10h5M2 14h5M17 10h5M17 14h5" />,
    look: <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 2-1 3-1a4 4 0 0 0 4-4c0-4.5-4-8-9-8zM7.5 11.5h.01M10 7.5h.01M15 8h.01" />,
    layout: <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
};

/**
 * Barre d'onglets verticale du panneau de réglages.
 * tabs : [{ id, label, alert? }] — `alert` ('warn' | 'error') affiche une pastille sur l'onglet.
 */
export default function SettingsTabs({ tabs, active, onSelect }) {
    return (
        <nav className="settings-tabs" role="tablist" aria-orientation="vertical">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === active}
                    className={`settings-tabs__tab${tab.id === active ? ' is-active' : ''}`}
                    onClick={() => onSelect(tab.id)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[tab.id]}</svg>
                    <span>{tab.label}</span>
                    {tab.alert && <span className={`settings-tabs__alert is-${tab.alert}`} />}
                </button>
            ))}
        </nav>
    );
}
