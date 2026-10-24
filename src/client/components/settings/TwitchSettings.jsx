import Section from './Section.jsx';
import ToggleField from './fields/ToggleField.jsx';
import TextField from './fields/TextField.jsx';
import NumberField from './fields/NumberField.jsx';
import TwitchConnect from './TwitchConnect.jsx';
import './TwitchSettings.css';

export default function TwitchSettings({ values, onChange, onReset, auth, events }) {
    const hasAppCredentials = Boolean(values.clientId || values.clientSecret);

    return (
        <Section
            title="Twitch"
            description="Titre, catégorie, viewers et followers sont lus sur la page publique de la chaîne : aucune clé n'est nécessaire."
            onReset={onReset}
        >
            <ToggleField label="Lire les infos Twitch" value={values.enabled} onChange={v => onChange('enabled', v)} />
            <TextField
                label="Nom de la chaîne"
                placeholder="ex : ocelus"
                value={values.channel}
                onChange={v => onChange('channel', v)}
            />
            <NumberField
                label="Rafraîchissement (secondes)"
                min={3}
                max={120}
                value={values.pollIntervalSec}
                onChange={v => onChange('pollIntervalSec', v)}
            />

            <details className="twitch-settings__api" open={hasAppCredentials || auth?.state !== 'disconnected'}>
                <summary>Compte Twitch : alertes et dernier follower</summary>
                <ol className="twitch-settings__help">
                    <li>
                        Créez une application sur{' '}
                        <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">dev.twitch.tv/console/apps</a>
                        {' '}: URL de redirection <code>http://localhost</code>, catégorie <em>Other</em>,
                        type de client <em>Public</em>.
                    </li>
                    <li>Copiez son Client ID ci-dessous.</li>
                    <li>Cliquez sur « Se connecter avec Twitch » avec le compte du streameur (un modérateur n'aura que les follows et les raids).</li>
                </ol>
                <TextField label="Client ID" value={values.clientId} onChange={v => onChange('clientId', v)} />
                <TextField
                    label="Client secret (facultatif)"
                    type="password"
                    hint="Uniquement pour une application de type « Confidentiel »."
                    value={values.clientSecret}
                    onChange={v => onChange('clientSecret', v)}
                />
                <TwitchConnect auth={auth} events={events} />
            </details>
        </Section>
    );
}
