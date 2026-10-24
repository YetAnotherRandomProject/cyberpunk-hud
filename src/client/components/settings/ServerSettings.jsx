import { useState } from 'react';
import { requestRestart } from '../../lib/api.js';
import Section from './Section.jsx';
import NumberField from './fields/NumberField.jsx';
import './ServerSettings.css';

export default function ServerSettings({ values, onChange, runtime }) {
    const [restarting, setRestarting] = useState(false);
    const portDiffers = runtime && runtime.port !== values.port;

    const restart = async () => {
        setRestarting(true);
        try {
            await requestRestart();
        } catch {
            setRestarting(false);
        }
    };

    return (
        <Section title="Serveur">
            <NumberField
                label="Port"
                hint="À changer uniquement si un autre logiciel utilise déjà ce port."
                min={1024}
                max={65535}
                value={values.port}
                onChange={v => onChange('port', v)}
            />
            {portDiffers && (
                <div className="server-settings__notice">
                    <span>
                        Le HUD tourne actuellement sur le port <strong>{runtime.port}</strong>.
                        {runtime.canRestart
                            ? ' Redémarrez pour utiliser le port choisi, puis mettez à jour l\'URL dans OBS.'
                            : ' Relancez le serveur pour utiliser le port choisi.'}
                    </span>
                    {runtime.canRestart && (
                        <button type="button" className="ui-button is-small" disabled={restarting} onClick={restart}>
                            {restarting ? 'Redémarrage…' : 'Redémarrer'}
                        </button>
                    )}
                </div>
            )}
        </Section>
    );
}
