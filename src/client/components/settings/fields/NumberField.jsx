import { useEffect, useState } from 'react';
import Field from './Field.jsx';

const clamp = (n, min, max) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

// Champ numérique : on peut effacer/taper librement, la valeur est bornée à la sortie du champ.
export default function NumberField({ label, hint, value, onChange, min, max, step = 1 }) {
    const [text, setText] = useState(String(value));

    useEffect(() => {
        if (Number(text) !== value) setText(String(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = event => {
        const raw = event.target.value;
        setText(raw);
        const n = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(n)) onChange(clamp(n, min, max));
    };

    return (
        <Field label={label} hint={hint}>
            <input
                type="number"
                value={text}
                min={min}
                max={max}
                step={step}
                onChange={handleChange}
                onBlur={() => setText(String(value))}
            />
        </Field>
    );
}
