import { readableColor } from '../../lib/readableColor.js';
import ChatEmote from './ChatEmote.jsx';
import ChatBadge from './ChatBadge.jsx';
import './ChatMessage.css';

/**
 * Une ligne de tchat : badges, pseudo coloré, texte et emotes (Twitch, 7TV, BTTV, FFZ, animées comprises).
 * `leaving` déclenche le fondu de sortie d'un message arrivé en fin de vie.
 */
export default function ChatMessage({ message, showBadges, leaving }) {
    const { kind, notice, name, color, action, badges, parts } = message;
    const nameColor = readableColor(color);

    return (
        <div className={`chat-message${leaving ? ' is-leaving' : ''}${kind === 'notice' ? ' is-notice' : ''}`}>
            {notice && <div className="chat-message__notice">{notice}</div>}
            {parts.length > 0 && (
                <div className="chat-message__line">
                    {showBadges && badges.map(badge => (
                        <ChatBadge key={badge.url} badge={badge} />
                    ))}
                    <span className="chat-message__name" style={{ color: nameColor }}>{name}</span>
                    {!action && <span className="chat-message__separator">:</span>}
                    <span className="chat-message__text" style={action ? { color: nameColor, fontStyle: 'italic' } : undefined}>
                        {parts.map((part, i) => (part.type === 'emote'
                            ? <ChatEmote key={i} emote={part} />
                            : <span key={i}>{part.text}</span>))}
                    </span>
                </div>
            )}
        </div>
    );
}
