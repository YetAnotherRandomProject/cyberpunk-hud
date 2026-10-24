import ArasakaKamon from '../overlay/ArasakaKamon.jsx';
import SaveIndicator from './SaveIndicator.jsx';
import StatusDots from './StatusDots.jsx';
import './SettingsHeader.css';

export default function SettingsHeader({ saveState, connected, statuses }) {
    return (
        <header className="settings-header">
            <div className="settings-header__title">
                <ArasakaKamon className="settings-header__logo" />
                <span>CYBERPUNK HUD</span>
                <small>PANNEAU DE CONTRÔLE</small>
            </div>
            <div className="settings-header__right">
                <SaveIndicator saveState={saveState} connected={connected} />
                <StatusDots statuses={statuses} />
            </div>
        </header>
    );
}
