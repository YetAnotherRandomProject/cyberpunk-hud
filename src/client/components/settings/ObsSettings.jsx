import Section from './Section.jsx';
import ToggleField from './fields/ToggleField.jsx';
import TextField from './fields/TextField.jsx';
import NumberField from './fields/NumberField.jsx';

export default function ObsSettings({ values, onChange, onReset }) {
    return (
        <Section
            title="OBS Studio"
            description="Dans OBS : Outils → Paramètres du serveur WebSocket. Activez le serveur puis recopiez le port et le mot de passe ici."
            onReset={onReset}
        >
            <ToggleField label="Lire les statistiques d'OBS" value={values.enabled} onChange={v => onChange('enabled', v)} />
            <TextField
                label="Adresse WebSocket"
                hint="Par défaut : ws://127.0.0.1:4455"
                value={values.url}
                onChange={v => onChange('url', v)}
            />
            <TextField
                label="Mot de passe"
                type="password"
                hint="Laissez vide si l'authentification est désactivée dans OBS."
                value={values.password}
                onChange={v => onChange('password', v)}
            />
            <NumberField
                label="Rafraîchissement (secondes)"
                min={1}
                max={30}
                value={values.pollIntervalSec}
                onChange={v => onChange('pollIntervalSec', v)}
            />
        </Section>
    );
}
