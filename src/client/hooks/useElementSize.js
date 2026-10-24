import { useEffect, useRef, useState } from 'react';

// Taille du contenu d'un élément, mise à jour à chaque redimensionnement.
export function useElementSize() {
    const ref = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return undefined;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize({ width, height });
        });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return [ref, size];
}
