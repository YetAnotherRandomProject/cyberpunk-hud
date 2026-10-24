import { useState } from 'react';
import './OverlayUrlCard.css';

// Adresse à coller dans une « Source navigateur » d'OBS.
export default function OverlayUrlCard({ runtime }) {
    const [copied, setCopied] = useState(false);
    const origin = runtime ? `http://127.0.0.1:${runtime.port}` : window.location.origin;
    const url = `${origin}/overlay`;

    const copy = async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="overlay-url-card">
            <div className="overlay-url-card__label">URL À AJOUTER DANS OBS</div>
            <div className="overlay-url-card__row">
                <code>{url}</code>
                <button type="button" className="ui-button" onClick={copy}>{copied ? 'Copié !' : 'Copier'}</button>
                <a className="ui-button is-secondary" href={url} target="_blank" rel="noreferrer">Ouvrir</a>
            </div>
            <ol className="overlay-url-card__steps">
                <li>Dans OBS, ajoutez une source <strong>Navigateur</strong>.</li>
                <li>Collez l'URL ci-dessus, largeur <strong>1920</strong>, hauteur <strong>1080</strong>.</li>
                <li>Laissez cette application ouverte pendant le stream.</li>
            </ol>
        </div>
    );
}
