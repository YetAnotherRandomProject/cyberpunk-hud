import { useState } from 'react';
import { cachedMedia } from '../../lib/media.js';

// Badge du viewer. Introuvable, il disparaît simplement : jamais de texte de remplacement.
export default function ChatBadge({ badge }) {
    const [failed, setFailed] = useState(false);
    if (failed) return null;
    return (
        <img
            className="chat-message__badge"
            src={cachedMedia(badge.url)}
            alt=""
            title={badge.title}
            onError={() => setFailed(true)}
        />
    );
}
