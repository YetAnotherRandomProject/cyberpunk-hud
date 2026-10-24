import { useState } from 'react';
import { sendTestAlert } from '../../lib/api.js';
import Section from './Section.jsx';
import ToggleField from './fields/ToggleField.jsx';
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

export default function AlertSettings({ values, onChange, onReset, accountConnected }) {
    const [error, setError] = useState(null);

    const test = kind => () => {
        setError(null);
        sendTestAlert(kind).catch(err => setError(err.message));
    };

    return (
        <Section
            title="Alertes"
            description={accountConnected
                ? 'Follows, raids, subs et bits s\'affichent en direct sur l\'overlay. Désactiver un type le met en pause : ses alertes attendent dans la file sans s\'afficher. Subs et bits exigent le compte du streameur.'
                : 'Connectez le compte Twitch (section Twitch) pour recevoir les vraies alertes. Les tests fonctionnent sans.'}
            onReset={onReset}
        >
            <ToggleField label="Alerte de follow" value={values.followEnabled} onChange={v => onChange('followEnabled', v)} />
            <ToggleField label="Alerte de raid" value={values.raidEnabled} onChange={v => onChange('raidEnabled', v)} />
            <ToggleField label="Alerte de sub / resub" value={values.subEnabled} onChange={v => onChange('subEnabled', v)} />
            <ToggleField label="Alerte de subs offerts" value={values.giftSubEnabled} onChange={v => onChange('giftSubEnabled', v)} />
            <ToggleField label="Alerte de bits (cheer)" value={values.cheerEnabled} onChange={v => onChange('cheerEnabled', v)} />
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
