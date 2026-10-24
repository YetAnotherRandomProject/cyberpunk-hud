import Section from './Section.jsx';
import ColorField from './fields/ColorField.jsx';

const COLORS = [
    { key: 'primary', label: 'Couleur principale' },
    { key: 'highlight', label: 'Surbrillance' },
    { key: 'positive', label: 'Hausse' },
    { key: 'negative', label: 'Baisse / alerte' }
];

export default function ThemeSettings({ values, onChange, onReset }) {
    return (
        <Section title="Couleurs" onReset={onReset}>
            <div className="field-row">
                {COLORS.map(({ key, label }) => (
                    <ColorField key={key} label={label} value={values[key]} onChange={v => onChange(key, v)} />
                ))}
            </div>
        </Section>
    );
}
