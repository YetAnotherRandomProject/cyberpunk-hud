import './Section.css';

// Bloc de réglages avec titre, description facultative et bouton de réinitialisation.
export default function Section({ title, description, onReset, children }) {
    return (
        <section className="settings-section">
            <div className="settings-section__head">
                <h2>{title}</h2>
                {onReset && (
                    <button type="button" className="ui-button is-secondary is-small" onClick={onReset}>
                        Par défaut
                    </button>
                )}
            </div>
            {description && <p className="settings-section__description">{description}</p>}
            <div className="settings-section__body">{children}</div>
        </section>
    );
}
