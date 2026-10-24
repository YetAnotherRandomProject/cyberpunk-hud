import { useEffect, useRef, useState } from 'react';
import { deleteSound, uploadSound } from '../../lib/api.js';
import { SOUND_KINDS } from '../../lib/alertKinds.js';
import { measureAudioDuration, measureFileDuration } from '../../lib/audioDuration.js';
import Section from './Section.jsx';
import './AlertSoundSettings.css';

const ACCEPT = '.mp3,.wav,.ogg,.oga,.m4a,.aac,.webm,.flac,audio/*';

const formatDuration = ms => `${(ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s`;

function SoundRow({ kind, label, hint, sound, onChange }) {
    const fileRef = useRef(null);
    const audioRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const run = async action => {
        setBusy(true);
        setError(null);
        try {
            const config = await action();
            onChange(config.alerts.sounds[kind]);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleFile = event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        // La durée sert au serveur à attendre la fin du son avant l'alerte suivante.
        if (file) run(async () => uploadSound(kind, file, await measureFileDuration(file)));
    };

    // Son sans durée connue (envoyé par une version précédente) : mesurée ici une fois pour toutes.
    useEffect(() => {
        if (!sound.file || sound.durationMs > 0) return undefined;
        let cancelled = false;
        measureAudioDuration(`/sounds/${encodeURIComponent(sound.file)}`).then(durationMs => {
            if (!cancelled && durationMs > 0) onChange({ ...sound, durationMs });
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sound.file]);

    const preview = () => {
        audioRef.current?.pause();
        const audio = new Audio(`/sounds/${encodeURIComponent(sound.file)}`);
        audio.volume = sound.volume;
        audio.play().catch(err => setError(`Lecture impossible : ${err.message}`));
        audioRef.current = audio;
    };

    return (
        <div className="alert-sound">
            <div className="alert-sound__head">
                <span className="alert-sound__label">{label}</span>
                <span className={`alert-sound__file${sound.file ? '' : ' is-empty'}`} title={sound.name}>
                    {sound.file ? sound.name || 'Son personnalisé' : 'Aucun son'}
                    {sound.file && sound.durationMs > 0 && ` — ${formatDuration(sound.durationMs)}`}
                </span>
            </div>
            <div className="alert-sound__actions">
                <button type="button" className="ui-button is-secondary is-small" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {busy ? 'Envoi…' : sound.file ? 'Remplacer' : 'Choisir un son'}
                </button>
                {sound.file && (
                    <>
                        <button type="button" className="ui-button is-secondary is-small" onClick={preview}>Écouter</button>
                        <button type="button" className="ui-button is-secondary is-small" disabled={busy} onClick={() => run(() => deleteSound(kind))}>
                            Retirer
                        </button>
                    </>
                )}
                <label className="alert-sound__volume" title="Volume">
                    <span>Vol.</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(sound.volume * 100)}
                        onChange={e => onChange({ ...sound, volume: Number(e.target.value) / 100 })}
                    />
                    <span>{Math.round(sound.volume * 100)}%</span>
                </label>
                <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={handleFile} />
            </div>
            {hint && !sound.file && <span className="alert-sound__hint">{hint}</span>}
            {error && <span className="alert-sound__error">{error}</span>}
        </div>
    );
}

/**
 * Sons joués par l'overlay à l'affichage de chaque type d'alerte. Les fichiers sont stockés
 * par l'application (dossier « sounds » du profil) et inclus dans l'export .zip.
 */
export default function AlertSoundSettings({ sounds, onChange }) {
    return (
        <Section
            title="Sons"
            description="Joués par l'overlay dans OBS au début de chaque alerte (MP3, WAV, OGG, M4A… 10 Mo maximum). Un son plus long que la durée d'affichage prolonge l'alerte : la suivante attend la fin du son. Dans la source navigateur d'OBS, cochez « Contrôler l'audio via OBS » pour régler leur volume dans le mixeur."
        >
            {SOUND_KINDS.map(({ kind, label, hint }) => (
                <SoundRow
                    key={kind}
                    kind={kind}
                    label={label}
                    hint={hint}
                    sound={sounds[kind]}
                    onChange={sound => onChange(kind, sound)}
                />
            ))}
        </Section>
    );
}
