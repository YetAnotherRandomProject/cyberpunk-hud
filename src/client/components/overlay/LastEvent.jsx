import { upper } from '../../lib/format.js';
import StackedLines from './StackedLines.jsx';
import './LastEvent.css';

// Dernier événement de la chaîne (sub, bits, raid…). Rien n'est affiché sans donnée réelle,
// sauf en mode édition où un gabarit permet de placer le widget.
export default function LastEvent({ label, event, showPlaceholder }) {
    if (!event && !showPlaceholder) return null;

    return (
        <div className={`last-event${event ? '' : ' is-placeholder'}`}>
            <div className="last-event__label">
                <StackedLines count={3} width={10} />
                <span>{label}</span>
            </div>
            {/* La clé relance l'animation d'entrée à chaque nouvel événement. */}
            <div key={`${event?.name}|${event?.detail}`} className="last-event__body">
                <div className="last-event__name">{event ? upper(event.name, 22) : 'EN ATTENTE'}</div>
                {event?.detail && <div className="last-event__detail">{event.detail}</div>}
            </div>
        </div>
    );
}
