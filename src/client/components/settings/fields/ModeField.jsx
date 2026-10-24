import Field from './Field.jsx';
import './ModeField.css';

/**
 * Interrupteur à plusieurs états sur une ligne : libellé à gauche, états à droite.
 * options : [{ value, label, hint? }] ; l'état actif prend la couleur de sa position
 * (premier = actif, dernier = coupé).
 */
export default function ModeField({ label, value, options, onChange }) {
    return (
        <Field label={label} inline>
            <span className="mode-field" role="radiogroup" aria-label={label}>
                {options.map((option, index) => (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={value === option.value}
                        title={option.hint}
                        className={`mode-field__option is-${index === 0 ? 'on' : index === options.length - 1 ? 'off' : 'mid'}${value === option.value ? ' is-selected' : ''}`}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </span>
        </Field>
    );
}
