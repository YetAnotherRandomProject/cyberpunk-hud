import { useEffect, useState } from 'react';
import { useConfigDraft } from '../hooks/useConfigDraft.js';
import { fetchDefaults } from '../lib/api.js';
import SettingsHeader from '../components/settings/SettingsHeader.jsx';
import OverlayUrlCard from '../components/settings/OverlayUrlCard.jsx';
import StatusPanel from '../components/settings/StatusPanel.jsx';
import LayoutPreview from '../components/settings/LayoutPreview.jsx';
import ObsSettings from '../components/settings/ObsSettings.jsx';
import SystemSettings from '../components/settings/SystemSettings.jsx';
import TwitchSettings from '../components/settings/TwitchSettings.jsx';
import HudTextSettings from '../components/settings/HudTextSettings.jsx';
import ChatSettings from '../components/settings/ChatSettings.jsx';
import AlertSettings from '../components/settings/AlertSettings.jsx';
import ThemeSettings from '../components/settings/ThemeSettings.jsx';
import WidgetSettings from '../components/settings/WidgetSettings.jsx';
import ServerSettings from '../components/settings/ServerSettings.jsx';
import './SettingsPage.css';

// Panneau de contrôle : tous les réglages du HUD, enregistrés automatiquement.
export default function SettingsPage({ backend }) {
    const { draft, setValue, saveState } = useConfigDraft(backend.config);
    const [defaults, setDefaults] = useState(null);

    useEffect(() => {
        fetchDefaults().then(setDefaults).catch(() => setDefaults(null));
    }, []);

    if (!draft) {
        return <div className="settings-loading">Connexion au serveur HUD…</div>;
    }

    const sectionProps = section => ({
        values: draft[section],
        onChange: (key, value) => setValue([section, key], value),
        onReset: defaults ? () => setValue(section, defaults[section]) : null
    });

    return (
        <div className="settings-page">
            <SettingsHeader saveState={saveState} connected={backend.connected} />

            <main className="settings-page__main">
                <div className="settings-page__forms">
                    <ObsSettings {...sectionProps('obs')} />
                    <SystemSettings {...sectionProps('system')} fps={backend.telemetry.fps} />
                    <TwitchSettings
                        {...sectionProps('twitch')}
                        auth={backend.twitchAuth}
                        events={backend.telemetry.twitchEvents}
                    />
                    <ChatSettings {...sectionProps('chat')} />
                    <AlertSettings
                        {...sectionProps('alerts')}
                        accountConnected={backend.twitchAuth?.state === 'connected'}
                    />
                    <HudTextSettings {...sectionProps('hud')} />
                    <ThemeSettings {...sectionProps('theme')} />
                    <WidgetSettings {...sectionProps('widgets')} />
                    <ServerSettings {...sectionProps('server')} runtime={backend.runtime} />
                </div>

                <div className="settings-page__aside">
                    <OverlayUrlCard runtime={backend.runtime} />
                    <StatusPanel connected={backend.connected} config={draft} telemetry={backend.telemetry} />
                    <LayoutPreview
                        config={draft}
                        telemetry={backend.telemetry}
                        alerts={backend.alerts}
                        chat={backend.chat}
                        onWidgetMove={(id, { x, y }) => setValue(['widgets', id], { ...draft.widgets[id], x, y })}
                    />
                </div>
            </main>
        </div>
    );
}
