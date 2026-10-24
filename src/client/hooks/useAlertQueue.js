import { useEffect, useRef, useState } from 'react';

/**
 * File d'attente des alertes : chaque nouvelle alerte reçue est affichée
 * `durationSec` secondes, l'une après l'autre. Retourne l'alerte en cours ou null.
 */
export function useAlertQueue(alerts, durationSec) {
    const [queue, setQueue] = useState([]);
    const seen = useRef(new Set());

    useEffect(() => {
        const fresh = alerts.filter(alert => !seen.current.has(alert.id));
        if (fresh.length === 0) return;
        fresh.forEach(alert => seen.current.add(alert.id));
        setQueue(prev => [...prev, ...fresh]);
    }, [alerts]);

    const current = queue[0] ?? null;

    useEffect(() => {
        if (!current) return undefined;
        const timer = setTimeout(() => setQueue(prev => prev.slice(1)), Math.max(2, durationSec) * 1000);
        return () => clearTimeout(timer);
    }, [current, durationSec]);

    return current;
}
