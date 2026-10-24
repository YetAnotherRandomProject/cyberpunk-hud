import { useState } from 'react';
import { sendTestAlert } from '../../lib/api.js';
import Section from './Section.jsx';
import ModeField from './fields/ModeField.jsx';
import { ALERT_KINDS, ALERT_MODES } from '../../lib/alertKinds.js';
import NumberField from './fields/NumberField.jsx';
import './AlertSettings.css';

const TESTS = [
    { kind: 'follow', label: 'Follow' },
    { kind: 'raid', label: 'Raid' },
    { kind: 'sub', label: 'Sub' },
    { kind: 'resub', label: 'Resub' },
    { kind: 'giftsub', label: 'Subs offerts' },
    { kind: 'cheer', label: 'Bits' }
];

// onModeChange(kind, mode) écrit un seul mode : deux clics rapprochés ne s'écrasent pas.
export default function AlertSettings({ values, onChange, onModeChange, onReset, accountConnected }) {
    const [error, setError] = useState(null);

    const test = kind => () => {
        setError(null);
        sendTestAlert(kind).catch(err => setError(err.message));
    };

    return (
        <Section
            title="Alertes"
            description={accountConnected
                ? 'Follows, raids, subs et bits s\'affichent en direct sur l\'overlay. Pour chaque type : Actif (affichée), Pause (gardée dans la file sans s\'afficher) ou Désactivé (ignorée, et ses alertes en attente sont retirées). Subs et bits exigent le compte du streameur.'
                : 'Connectez le compte Twitch (section Twitch) pour recevoir les vraies alertes. Les tests fonctionnent sans.'}
            onReset={onReset}
        >
            {ALERT_KINDS.map(({ kind, label }) => (
                <ModeField
                    key={kind}
                    label={label}
                    value={values.modes[kind]}
                    options={ALERT_MODES}
                    onChange={mode => onModeChange(kind, mode)}
                />
            ))}
            <div className="field-row">
                <NumberField
                    label="Bits minimum"
                    hint="Les cheers plus petits sont ignorés."
                    min={1}
                    max={100000}
                    value={values.cheerMinBits}
                    onChange={v => onChange('cheerMinBits', v)}
                />
                <NumberField
                    label="Durée d'affichage (s)"
                    min={2}
                    max={30}
                    value={values.durationSec}
                    onChange={v => onChange('durationSec', v)}
                />
            </div>
            <div className="alert-settings__tests">
                <span className="alert-settings__tests-label">Tester :</span>
                {TESTS.map(({ kind, label }) => (
                    <button key={kind} type="button" className="ui-button is-secondary is-small" onClick={test(kind)}>
                        {label}
                    </button>
                ))}
            </div>
            {error && <span className="alert-settings__error">{error}</span>}
        </Section>
    );
}
