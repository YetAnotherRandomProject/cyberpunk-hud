import Section from './Section.jsx';
import TextField from './fields/TextField.jsx';
import NumberField from './fields/NumberField.jsx';

export default function HudTextSettings({ values, onChange, onReset }) {
    const text = (key, label, hint) => (
        <TextField label={label} hint={hint} value={values[key]} onChange={v => onChange(key, v)} />
    );

    return (
        <Section title="Textes & animations" onReset={onReset}>
            <div className="field-row">
                {text('brandName', 'Marque')}
                {text('vendorName', 'Fabricant')}
            </div>
            {text('serialNumber', 'Numéro de série', 'Affiché au centre de la barre du haut.')}
            <div className="field-row">
                {text('clearanceLevel', 'Niveau d\'accès')}
                {text('connectionId', 'ID de connexion')}
            </div>
            {text('yearPrefix', 'Année de l\'horloge', 'Remplace l\'année réelle dans l\'horloge (ex : 2077).')}
            <div className="field-row">
                <NumberField
                    label="Alternance carte (s)"
                    min={3}
                    max={120}
                    value={values.cardFlipIntervalSec}
                    onChange={v => onChange('cardFlipIntervalSec', v)}
                />
                <NumberField
                    label="Défilement ticker (s)"
                    min={5}
                    max={120}
                    value={values.tickerDurationSec}
                    onChange={v => onChange('tickerDurationSec', v)}
                />
            </div>
        </Section>
    );
}
