import ArasakaKamon from '../overlay/ArasakaKamon.jsx';
import SaveIndicator from './SaveIndicator.jsx';
import './SettingsHeader.css';

export default function SettingsHeader({ saveState, connected }) {
    return (
        <header className="settings-header">
            <div className="settings-header__title">
                <ArasakaKamon className="settings-header__logo" />
                <span>CYBERPUNK HUD</span>
                <small>PANNEAU DE CONTRÔLE</small>
            </div>
            <SaveIndicator saveState={saveState} connected={connected} />
        </header>
    );
}
