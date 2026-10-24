import { useEffect, useState } from 'react';
import { useConfigDraft } from '../hooks/useConfigDraft.js';
import { fetchDefaults } from '../lib/api.js';
import SettingsHeader from '../components/settings/SettingsHeader.jsx';
import SettingsTabs from '../components/settings/SettingsTabs.jsx';
import OverlayUrlCard from '../components/settings/OverlayUrlCard.jsx';
import { serviceStatuses } from '../components/settings/StatusPanel.jsx';
import LayoutPreview from '../components/settings/LayoutPreview.jsx';
import WidgetPanel from '../components/settings/WidgetPanel.jsx';
import ObsSettings from '../components/settings/ObsSettings.jsx';
import SystemSettings from '../components/settings/SystemSettings.jsx';
import TwitchSettings from '../components/settings/TwitchSettings.jsx';
import ChatSettings from '../components/settings/ChatSettings.jsx';
import AlertSettings from '../components/settings/AlertSettings.jsx';
import AlertQueuePanel from '../components/settings/AlertQueuePanel.jsx';
import AlertSoundSettings from '../components/settings/AlertSoundSettings.jsx';
import ThemeSettings from '../components/settings/ThemeSettings.jsx';
import ServerSettings from '../components/settings/ServerSettings.jsx';
import BackupSettings from '../components/settings/BackupSettings.jsx';
import './SettingsPage.css';

// Onglets du panneau, et services dont un problème est signalé par une pastille sur l'onglet.
const TABS = [
    { id: 'sources', label: 'Sources', services: ['obs', 'twitch'] },
    { id: 'alerts', label: 'Alertes', services: [] },
    { id: 'chat', label: 'Tchat', services: ['chat'] },
    { id: 'system', label: 'Système', services: ['server', 'fps'] },
    { id: 'look', label: 'Apparence', services: [] }
];
const TAB_STORAGE_KEY = 'cyberpunk-hud.settings-tab';

// Dernier onglet ouvert (confort local : sans stockage disponible, on revient au premier).
function readStoredTab() {
    try {
        const stored = localStorage.getItem(TAB_STORAGE_KEY);
        return TABS.some(tab => tab.id === stored) ? stored : TABS[0].id;
    } catch {
        return TABS[0].id;
    }
}

function worstTone(statuses) {
    if (statuses.some(s => s.tone === 'error')) return 'error';
    if (statuses.some(s => s.tone === 'warn')) return 'warn';
    return null;
}

// Panneau de contrôle : tous les réglages du HUD, enregistrés automatiquement.
export default function SettingsPage({ backend }) {
    const { draft, setValue, replaceDraft, saveState } = useConfigDraft(backend.config);
    const [defaults, setDefaults] = useState(null);
    const [activeTab, setActiveTab] = useState(readStoredTab);
    // Élément de l'overlay dont les réglages remplacent l'onglet courant (null = onglets).
    const [selectedWidget, setSelectedWidget] = useState(null);

    useEffect(() => {
        fetchDefaults().then(setDefaults).catch(() => setDefaults(null));
    }, []);

    const selectTab = id => {
        setSelectedWidget(null);
        setActiveTab(id);
        try {
            localStorage.setItem(TAB_STORAGE_KEY, id);
        } catch {
            // stockage indisponible : l'onglet n'est simplement pas retenu
        }
    };

    if (!draft) {
        return <div className="settings-loading">Connexion au serveur HUD…</div>;
    }

    const sectionProps = section => ({
        values: draft[section],
        onChange: (key, value) => setValue([section, key], value),
        onReset: defaults ? () => setValue(section, defaults[section]) : null
    });

    const statuses = serviceStatuses(backend.connected, draft, backend.telemetry);
    const tabs = TABS.map(tab => ({
        ...tab,
        // Pastille quand des alertes attendent dans la file parce que leur type est désactivé.
        alert: tab.id === 'alerts' && backend.alertQueue.pending.some(a => backend.alertQueue.paused.includes(a.kind))
            ? 'warn'
            : worstTone(statuses.filter(s => tab.services.includes(s.id)))
    }));

    const panels = {
        sources: (
            <>
                <ObsSettings {...sectionProps('obs')} />
                <TwitchSettings
                    {...sectionProps('twitch')}
                    auth={backend.twitchAuth}
                    events={backend.telemetry.twitchEvents}
                />
            </>
        ),
        alerts: (
            <>
                <AlertQueuePanel
                    queue={backend.alertQueue}
                    settings={draft.alerts}
                    onToggle={(setting, enabled) => setValue(['alerts', setting], enabled)}
                />
                <AlertSettings
                    {...sectionProps('alerts')}
                    // « Par défaut » ne touche pas aux sons, qui ont leurs propres boutons.
                    onReset={defaults ? () => setValue('alerts', { ...defaults.alerts, sounds: draft.alerts.sounds }) : null}
                    accountConnected={backend.twitchAuth?.state === 'connected'}
                />
                <AlertSoundSettings
                    sounds={draft.alerts.sounds}
                    onChange={(kind, sound) => setValue(['alerts', 'sounds', kind], sound)}
                />
            </>
        ),
        chat: <ChatSettings {...sectionProps('chat')} />,
        system: (
            <>
                <SystemSettings {...sectionProps('system')} fps={backend.telemetry.fps} />
                <ServerSettings {...sectionProps('server')} runtime={backend.runtime} />
                <BackupSettings onImported={replaceDraft} />
            </>
        ),
        look: <ThemeSettings {...sectionProps('theme')} />
    };

    return (
        <div className="settings-page">
            <SettingsHeader saveState={saveState} connected={backend.connected} statuses={statuses} />

            <main className="settings-page__main">
                <SettingsTabs tabs={tabs} active={selectedWidget ? null : activeTab} onSelect={selectTab} />

                <div className="settings-page__forms" role="tabpanel">
                    {selectedWidget
                        ? (
                            <WidgetPanel
                                key={selectedWidget}
                                widgetId={selectedWidget}
                                config={draft}
                                defaults={defaults}
                                setValue={setValue}
                                onSelect={setSelectedWidget}
                                onClose={() => setSelectedWidget(null)}
                            />
                        )
                        : panels[activeTab]}
                </div>

                <div className="settings-page__aside">
                    <OverlayUrlCard runtime={backend.runtime} />
                    <LayoutPreview
                        config={draft}
                        telemetry={backend.telemetry}
                        currentAlert={backend.alertQueue.current}
                        chat={backend.chat}
                        selectedWidget={selectedWidget}
                        onWidgetSelect={setSelectedWidget}
                        onWidgetChange={(id, layout) => setValue(['widgets', id], layout)}
                    />
                </div>
            </main>
        </div>
    );
}
