import { useState } from 'react';
import { cachedMedia } from '../../lib/media.js';
import './ChatEmote.css';

// Image d'emote ; si elle ne peut pas être chargée, son nom est affiché comme du texte.
function EmoteImage({ emote, className }) {
    const [failed, setFailed] = useState(false);
    if (failed) return <span className="chat-emote__fallback">{emote.name}</span>;
    return (
        <img
            className={className}
            src={cachedMedia(emote.url)}
            alt=""
            title={emote.name}
            onError={() => setFailed(true)}
        />
    );
}

// Emote du tchat, avec d'éventuelles emotes « zero-width » (7TV) superposées par-dessus.
export default function ChatEmote({ emote }) {
    const image = <EmoteImage emote={emote} className="chat-emote__image" />;
    if (!emote.overlays?.length) return image;

    return (
        <span className="chat-emote__stack">
            {image}
            {emote.overlays.map((overlay, i) => (
                <EmoteImage key={i} emote={overlay} className="chat-emote__image chat-emote__overlay" />
            ))}
        </span>
    );
}
