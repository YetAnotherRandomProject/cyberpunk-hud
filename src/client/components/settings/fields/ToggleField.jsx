import Field from './Field.jsx';
import './ToggleField.css';

export default function ToggleField({ label, hint, value, onChange }) {
    return (
        <Field label={label} hint={hint} inline>
            <input
                type="checkbox"
                className="toggle-field"
                checked={value}
                onChange={e => onChange(e.target.checked)}
            />
        </Field>
    );
}
