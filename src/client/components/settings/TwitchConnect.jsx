import { useState } from 'react';
import { cancelTwitchAuth, logoutTwitch, startTwitchAuth } from '../../lib/api.js';
import StatusLight from './StatusLight.jsx';
import './TwitchConnect.css';

function eventsStatus(events) {
    if (!events) return { tone: 'warn', text: 'Connexion aux événements…' };
    if (events.error) return { tone: events.connected ? 'warn' : 'error', text: events.error };
    return { tone: 'ok', text: 'Alertes follow, raid, subs et bits actives' };
}

// Connexion du compte Twitch du streameur (code à saisir sur twitch.tv/activate).
export default function TwitchConnect({ auth, events }) {
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

    if (!auth) return null;

    if (auth.state === 'connected') {
        return (
            <div className="twitch-connect">
                <div className="twitch-connect__row">
                    <span>Connecté en tant que <strong>{auth.login}</strong></span>
                    <button type="button" className="ui-button is-secondary is-small" disabled={busy} onClick={run(logoutTwitch)}>
                        Déconnecter
                    </button>
                </div>
                <StatusLight label="Événements en direct" {...eventsStatus(events)} />
                {auth.missingScopes?.length > 0 && (
                    <span className="twitch-connect__error">
                        Nouvelles autorisations nécessaires (subs, bits) : déconnectez puis reconnectez le compte.
                    </span>
                )}
            </div>
        );
    }

    if (auth.state === 'pending') {
        return (
            <div className="twitch-connect is-pending">
                <span>Sur Twitch, saisissez ce code :</span>
                <code className="twitch-connect__code">{auth.userCode}</code>
                <div className="twitch-connect__row">
                    <a className="ui-button" href={auth.verificationUri} target="_blank" rel="noreferrer">
                        Ouvrir twitch.tv/activate
                    </a>
                    <button type="button" className="ui-button is-secondary" disabled={busy} onClick={run(cancelTwitchAuth)}>
                        Annuler
                    </button>
                </div>
                <span className="twitch-connect__hint">Cette page se met à jour toute seule une fois l'accès autorisé.</span>
            </div>
        );
    }

    const message = error || auth.error;
    return (
        <div className="twitch-connect">
            <button
                type="button"
                className="ui-button twitch-connect__login"
                disabled={busy || !auth.canConnect}
                onClick={run(startTwitchAuth)}
            >
                Se connecter avec Twitch
            </button>
            {!auth.canConnect && <span className="twitch-connect__hint">Renseignez d'abord le Client ID ci-dessus.</span>}
            {message && <span className="twitch-connect__error">{message}</span>}
        </div>
    );
}
