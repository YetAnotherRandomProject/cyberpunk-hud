import { useEffect } from 'react';
import Overlay from '../components/overlay/Overlay.jsx';
import './OverlayPage.css';

// Page chargée par la source navigateur d'OBS (1920x1080, fond transparent).
export default function OverlayPage({ backend }) {
    useEffect(() => {
        document.documentElement.classList.add('overlay-document');
        return () => document.documentElement.classList.remove('overlay-document');
    }, []);

    if (!backend.config) return null;
    return <Overlay config={backend.config} telemetry={backend.telemetry} alerts={backend.alerts} chat={backend.chat} />;
}
