import { useCallback, useEffect, useState } from 'react';

// Alterne entre les pages 1 et 2 toutes les `intervalSec` secondes.
export function useAlternatingPage(intervalSec) {
    const [page, setPage] = useState(1);
    const [cycle, setCycle] = useState(0);

    useEffect(() => {
        const ms = Math.max(3, Number(intervalSec) || 10) * 1000;
        const timer = setInterval(() => setPage(p => (p === 1 ? 2 : 1)), ms);
        return () => clearInterval(timer);
    }, [intervalSec, cycle]);

    // Sélection manuelle : relance le minuteur pour laisser la page affichée un cycle complet.
    const selectPage = useCallback(n => {
        setPage(n);
        setCycle(c => c + 1);
    }, []);

    return [page, selectPage];
}
