import { useRef, useState } from 'react';
import { importConfig } from '../../lib/api.js';
import Section from './Section.jsx';
import './BackupSettings.css';

/**
 * Export de la configuration de l'overlay et des sons des alertes dans une archive .zip,
 * et import d'une telle archive (ou d'un ancien export .json, sans les sons).
 * Les secrets (Client ID, Client secret Twitch, mot de passe OBS) ne sont jamais exportés,
 * et l'import garde ceux de ce PC ainsi que le port du serveur.
 */
export default function BackupSettings({ onImported }) {
    const fileRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    const handleFile = async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setMessage(null);

        if (!/\.(zip|json)$/i.test(file.name)) {
            setMessage({ tone: 'error', text: 'Choisissez un export Cyberpunk HUD (.zip, ou .json des versions précédentes).' });
            return;
        }
        if (!window.confirm(`Remplacer la configuration actuelle par « ${file.name} » ?\n\n`
            + 'Vos identifiants Twitch, votre mot de passe OBS et le port du serveur sont conservés.')) return;

        setBusy(true);
        try {
            // Le serveur vérifie le contenu : un fichier invalide ne change rien.
            onImported(await importConfig(file));
            setMessage({ tone: 'ok', text: `Configuration « ${file.name} » importée.` });
        } catch (err) {
            setMessage({ tone: 'error', text: err.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Section
            title="Sauvegarde"
            description="Exportez toute la configuration (disposition, textes, couleurs, alertes, tchat) et les sons des alertes dans une archive .zip, pour la sauvegarder ou la partager. Le Client ID, le Client secret Twitch et le mot de passe OBS n'y figurent jamais. À l'import, ces secrets et le port du serveur gardent leur valeur actuelle."
        >
            <div className="backup-settings__actions">
                <a className="ui-button" href="/api/config/export" download>Exporter</a>
                <button type="button" className="ui-button is-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {busy ? 'Import…' : 'Importer un fichier'}
                </button>
                <input ref={fileRef} type="file" accept=".zip,.json,application/zip,application/json" hidden onChange={handleFile} />
            </div>
            {message && <span className={`backup-settings__message is-${message.tone}`}>{message.text}</span>}
        </Section>
    );
}
