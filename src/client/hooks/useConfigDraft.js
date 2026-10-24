import { useCallback, useEffect, useRef, useState } from 'react';
import { saveConfig } from '../lib/api.js';
import { setIn } from '../lib/setIn.js';

const AUTOSAVE_DELAY_MS = 500;

/**
 * Copie locale éditable de la configuration, enregistrée automatiquement
 * quelques instants après la dernière modification.
 * saveState : 'idle' | 'pending' | 'saving' | 'saved' | 'error'
 */
export function useConfigDraft(serverConfig) {
    const [draft, setDraft] = useState(null);
    const [saveState, setSaveState] = useState('idle');
    const dirty = useRef(false);

    useEffect(() => {
        if (serverConfig && !draft) setDraft(serverConfig);
    }, [serverConfig, draft]);

    useEffect(() => {
        if (!dirty.current) return undefined;
        setSaveState('pending');
        const timer = setTimeout(async () => {
            dirty.current = false;
            setSaveState('saving');
            try {
                await saveConfig(draft);
                setSaveState('saved');
            } catch {
                setSaveState('error');
            }
        }, AUTOSAVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [draft]);

    // setValue('obs.url', 'ws://...') ou setValue(['widgets', id, 'x'], 120)
    const setValue = useCallback((path, value) => {
        dirty.current = true;
        setDraft(prev => setIn(prev, path, value));
    }, []);

    // Remplace toute la copie locale par une config déjà enregistrée côté serveur (import) :
    // rien à renvoyer, et une sauvegarde en attente ne doit pas l'écraser.
    const replaceDraft = useCallback(config => {
        dirty.current = false;
        setDraft(config);
        setSaveState('saved');
    }, []);

    return { draft, setValue, replaceDraft, saveState };
}
