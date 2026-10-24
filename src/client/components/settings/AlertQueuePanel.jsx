import { useState } from 'react';
import { useClock } from '../../hooks/useClock.js';
import { clearQueuedAlerts, removeQueuedAlert, skipAlert } from '../../lib/api.js';
import { ALERT_KINDS, ALERT_KIND_LABEL, describeAlert } from '../../lib/alertKinds.js';
import Section from './Section.jsx';
import './AlertQueuePanel.css';

// Au-delà, le feed résume le reste (vague de bots : des centaines de follows).
const MAX_LISTED = 50;

function ago(timestamp, now) {
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 60) return `${seconds} s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    return `${Math.floor(seconds / 3600)} h`;
}

/**
 * Feed des alertes : celle affichée sur l'overlay, celles en attente (à retirer une par une
 * ou par type). Les boutons de type reprennent les interrupteurs de la section Alertes :
 * un type désactivé est en pause, ses alertes restent en attente sans s'afficher.
 */
export default function AlertQueuePanel({ queue, settings, onToggle }) {
    const now = useClock().getTime();
    const [error, setError] = useState(null);
    const { current, pending } = queue;
    const pausedSet = new Set(ALERT_KINDS.filter(({ setting }) => !settings[setting]).map(({ kind }) => kind));

    const run = action => () => {
        setError(null);
        action().catch(err => setError(err.message));
    };
    const countOf = kind => pending.filter(alert => alert.kind === kind).length;

    return (
        <Section
            title="File d'attente"
            description="Les alertes, tests compris, s'affichent une par une sur tous les overlays (OBS et aperçu). Désactiver un type le met en pause (par exemple les follows pendant une vague de bots) : ses alertes restent ici sans s'afficher, et vous pouvez les retirer."
        >
            <div className="alert-queue__kinds">
                {ALERT_KINDS.map(({ kind, label, setting }) => {
                    const isPaused = pausedSet.has(kind);
                    const count = countOf(kind);
                    return (
                        <div key={kind} className={`alert-queue__kind${isPaused ? ' is-paused' : ''}`}>
                            <button
                                type="button"
                                className="alert-queue__pause"
                                aria-pressed={isPaused}
                                title={isPaused ? 'Réactiver ce type d\'alerte' : 'Désactiver (mettre en pause) ce type d\'alerte'}
                                onClick={() => onToggle(setting, isPaused)}
                            >
                                <span className="alert-queue__pause-icon">{isPaused ? '▶' : '❚❚'}</span>
                                <span>{label}</span>
                                {count > 0 && <span className="alert-queue__count">{count}</span>}
                            </button>
                            {count > 0 && (
                                <button
                                    type="button"
                                    className="alert-queue__clear"
                                    title={`Retirer les ${count} alertes « ${label} » en attente`}
                                    onClick={run(() => clearQueuedAlerts(kind))}
                                >
                                    Vider
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="alert-queue__current">
                <span className="alert-queue__heading">À l'écran</span>
                {current ? (
                    <div className="alert-queue__item is-current">
                        <span className={`alert-queue__tag is-${current.kind}`}>{ALERT_KIND_LABEL[current.kind]}</span>
                        <span className="alert-queue__text">
                            {describeAlert(current)}{current.test && ' (test)'}
                            {now - current.shownAt > current.displayMs && <em> — fin du son</em>}
                        </span>
                        <button type="button" className="ui-button is-secondary is-small" onClick={run(skipAlert)}>Passer</button>
                    </div>
                ) : (
                    <span className="alert-queue__empty">Aucune alerte affichée</span>
                )}
            </div>

            <div className="alert-queue__pending">
                <div className="alert-queue__heading">
                    <span>En attente ({pending.length})</span>
                    {pending.length > 0 && (
                        <button type="button" className="ui-button is-secondary is-small" onClick={run(() => clearQueuedAlerts())}>
                            Tout vider
                        </button>
                    )}
                </div>
                {pending.length === 0 && <span className="alert-queue__empty">File vide</span>}
                <ul className="alert-queue__list">
                    {pending.slice(0, MAX_LISTED).map(alert => {
                        const held = pausedSet.has(alert.kind);
                        return (
                            <li key={alert.id} className={`alert-queue__item${held ? ' is-held' : ''}`}>
                                <span className={`alert-queue__tag is-${alert.kind}`}>{ALERT_KIND_LABEL[alert.kind]}</span>
                                <span className="alert-queue__text">
                                    {describeAlert(alert)}{alert.test && ' (test)'}
                                    {held && <em> — en pause</em>}
                                </span>
                                <span className="alert-queue__age">{ago(alert.receivedAt, now)}</span>
                                <button
                                    type="button"
                                    className="alert-queue__remove"
                                    aria-label="Retirer cette alerte"
                                    title="Retirer cette alerte"
                                    onClick={run(() => removeQueuedAlert(alert.id))}
                                >
                                    ×
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {pending.length > MAX_LISTED && (
                    <span className="alert-queue__empty">… et {pending.length - MAX_LISTED} autres</span>
                )}
            </div>
            {error && <span className="alert-queue__error">{error}</span>}
        </Section>
    );
}
