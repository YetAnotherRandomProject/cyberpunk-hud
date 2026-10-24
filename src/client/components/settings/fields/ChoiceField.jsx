import Field from './Field.jsx';
import './ChoiceField.css';

// Choix exclusif sous forme de boutons segmentés. options : [{ value, label }]
export default function ChoiceField({ label, hint, value, options, onChange }) {
    return (
        <Field label={label} hint={hint}>
            <span className="choice-field" role="radiogroup">
                {options.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={value === option.value}
                        className={`choice-field__option${value === option.value ? ' is-selected' : ''}`}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </span>
        </Field>
    );
}
