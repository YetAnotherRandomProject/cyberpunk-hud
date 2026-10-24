import Field from './Field.jsx';
import './ColorField.css';

export default function ColorField({ label, value, onChange }) {
    return (
        <Field label={label}>
            <span className="color-field">
                <input type="color" value={value} onChange={e => onChange(e.target.value)} />
                <code>{value.toUpperCase()}</code>
            </span>
        </Field>
    );
}
