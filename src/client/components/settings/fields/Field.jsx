import './Field.css';

// Libellé + aide commune à tous les champs de formulaire.
export default function Field({ label, hint, inline = false, children }) {
    return (
        <label className={`field${inline ? ' is-inline' : ''}`}>
            <span className="field__label">{label}</span>
            {children}
            {hint && <span className="field__hint">{hint}</span>}
        </label>
    );
}
