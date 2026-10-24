import { useBackend } from './hooks/useBackend.js';
import OverlayPage from './pages/OverlayPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
    const backend = useBackend();
    const isOverlay = window.location.pathname.startsWith('/overlay');
    return isOverlay ? <OverlayPage backend={backend} /> : <SettingsPage backend={backend} />;
}
