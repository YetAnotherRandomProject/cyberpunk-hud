import { upper } from '../../lib/format.js';
import StackedLines from './StackedLines.jsx';
import './LastFollower.css';

// Dernier follower de la chaîne. Rien n'est affiché sans donnée réelle,
// sauf en mode édition où un gabarit permet de placer le widget.
export default function LastFollower({ follower, showPlaceholder }) {
    if (!follower && !showPlaceholder) return null;

    return (
        <div className={`last-follower${follower ? '' : ' is-placeholder'}`}>
            <div className="last-follower__label">
                <StackedLines count={3} width={10} />
                <span>LAST_LINK</span>
            </div>
            <div className="last-follower__name">{follower ? upper(follower.name, 22) : 'EN ATTENTE'}</div>
        </div>
    );
}
