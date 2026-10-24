import { useEffect, useState } from 'react';
import { fetchOpenWindows, restartFrameRate } from '../../lib/api.js';
import Section from './Section.jsx';
import ToggleField from './fields/ToggleField.jsx';
import NumberField from './fields/NumberField.jsx';
import ChoiceField from './fields/ChoiceField.jsx';
import Field from './fields/Field.jsx';
import StatusLight from './StatusLight.jsx';
import './SystemSettings.css';

const MODE_OPTIONS = [
    { value: 'auto', label: 'Auto — plein écran' },
    { value: 'process', label: 'Fenêtre choisie' }
];

export function fpsStatus(fps, enabled) {
    if (!enabled) return { tone: 'off', text: 'Désactivé' };
    switch (fps?.status) {
        case 'running':
            return { tone: 'ok', text: `${fps.process ?? 'Processus protégé'}${fps.detail ? ` — ${fps.detail}` : ''}` };
        case 'waiting':
            return { tone: 'warn', text: 'En attente du jeu…' };
        case 'error':
            return { tone: 'error', text: fps.error || 'Mesure impossible' };
        default:
            return { tone: 'off', text: 'Inactif' };
    }
}

// CPU et RAM du PC entier, FPS d'un jeu mesurés directement via Windows (ETW).
export default function SystemSettings({ values, onChange, onReset, fps }) {
    const [windows, setWindows] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const run = action => async () => {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const refreshWindows = run(async () => setWindows(await fetchOpenWindows()));

    useEffect(() => {
        if (values.fpsEnabled && values.fpsMode === 'process' && windows === null) refreshWindows();
    }, [values.fpsEnabled, values.fpsMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Le processus choisi reste proposé même si sa fenêtre est fermée (jeu pas encore lancé).
    const choices = windows ?? [];
    const selectedKnown = choices.some(w => w.process.toLowerCase() === values.fpsProcess.toLowerCase());

    return (
        <Section
            title="Système"
            description="CPU et RAM : charge globale du PC. FPS : images par seconde réellement affichées par le jeu (DirectX, Vulkan, OpenGL), lues directement auprès de Windows."
            onReset={onReset}
        >
            <NumberField
                label="Rafraîchissement (secondes)"
                min={1}
                max={30}
                value={values.pollIntervalSec}
                onChange={v => onChange('pollIntervalSec', v)}
            />
            <ToggleField label="Mesurer les FPS du jeu" value={values.fpsEnabled} onChange={v => onChange('fpsEnabled', v)} />

            {values.fpsEnabled && (
                <>
                    <ChoiceField
                        label="Application suivie"
                        hint={values.fpsMode === 'auto'
                            ? 'L\'application en plein écran (exclusif en priorité) est détectée automatiquement.'
                            : 'Les FPS de cet exécutable sont suivis, même après un redémarrage du jeu.'}
                        value={values.fpsMode}
                        options={MODE_OPTIONS}
                        onChange={v => onChange('fpsMode', v)}
                    />

                    {values.fpsMode === 'process' && (
                        <div className="system-settings__picker">
                            <Field label="Fenêtre">
                                <select
                                    value={values.fpsProcess}
                                    onChange={e => onChange('fpsProcess', e.target.value)}
                                >
                                    <option value="">— Choisir une fenêtre ouverte —</option>
                                    {values.fpsProcess && !selectedKnown && (
                                        <option value={values.fpsProcess}>{values.fpsProcess} (fermée)</option>
                                    )}
                                    {choices.map(w => (
                                        <option key={w.pid} value={w.process}>{w.process} — {w.title}</option>
                                    ))}
                                </select>
                            </Field>
                            <button type="button" className="ui-button is-secondary" disabled={busy} onClick={refreshWindows}>
                                Actualiser
                            </button>
                        </div>
                    )}

                    <div className="system-settings__status">
                        <StatusLight label="Mesure des FPS" {...fpsStatus(fps, values.fpsEnabled)} />
                        <button type="button" className="ui-button is-secondary is-small" disabled={busy} onClick={run(restartFrameRate)}>
                            Relancer
                        </button>
                    </div>
                    <p className="system-settings__help">
                        Windows réserve cette mesure aux administrateurs et au groupe
                        « Utilisateurs du journal de performances » : ajoutez-y votre compte une fois
                        (Gestion de l'ordinateur → Groupes), puis fermez et rouvrez la session Windows.
                    </p>
                </>
            )}
            {error && <span className="system-settings__error">{error}</span>}
        </Section>
    );
}
