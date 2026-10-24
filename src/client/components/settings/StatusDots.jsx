import { useRef } from 'react';
import StatusPanel from './StatusPanel.jsx';
import './StatusDots.css';

// Résumé compact de l'état des services (un point par service). Un clic ouvre le détail.
export default function StatusDots({ statuses }) {
    const dialogRef = useRef(null);
    const summary = statuses.map(s => `${s.label} : ${s.text}`).join('\n');

    return (
        <>
            <button
                type="button"
                className="status-dots"
                title={summary}
                aria-label="État des services — afficher le détail"
                onClick={() => dialogRef.current?.showModal()}
            >
                {statuses.map(s => <span key={s.id} className={`status-dots__dot is-${s.tone}`} />)}
            </button>

            <dialog
                ref={dialogRef}
                className="status-dialog"
                // Un clic sur le fond (hors du contenu) ferme la fenêtre.
                onClick={event => event.target === dialogRef.current && dialogRef.current.close()}
            >
                <div className="status-dialog__content">
                    <div className="status-dialog__head">
                        <h2>État des services</h2>
                        <button type="button" className="ui-button is-secondary is-small" onClick={() => dialogRef.current.close()}>
                            Fermer
                        </button>
                    </div>
                    <StatusPanel statuses={statuses} />
                </div>
            </dialog>
        </>
    );
}
