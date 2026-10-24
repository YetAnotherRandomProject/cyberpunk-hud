import Field from './Field.jsx';

export default function TextField({ label, hint, value, onChange, placeholder, type = 'text' }) {
    return (
        <Field label={label} hint={hint}>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                onChange={e => onChange(e.target.value)}
            />
        </Field>
    );
}
