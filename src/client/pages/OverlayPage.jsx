import { useEffect } from 'react';
import Overlay from '../components/overlay/Overlay.jsx';
import { useAlertSound } from '../hooks/useAlertSound.js';
import './OverlayPage.css';

// Page chargée par la source navigateur d'OBS (1920x1080, fond transparent).
export default function OverlayPage({ backend }) {
    const currentAlert = backend.alertQueue.current;
    // Le son n'est joué que par cette page : l'aperçu des réglages reste muet.
    useAlertSound(currentAlert, backend.config?.alerts.sounds);

    useEffect(() => {
        document.documentElement.classList.add('overlay-document');
        return () => document.documentElement.classList.remove('overlay-document');
    }, []);

    if (!backend.config) return null;
    return <Overlay config={backend.config} telemetry={backend.telemetry} currentAlert={currentAlert} chat={backend.chat} />;
}
