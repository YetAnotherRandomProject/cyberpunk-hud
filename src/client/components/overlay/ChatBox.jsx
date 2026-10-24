import { useClock } from '../../hooks/useClock.js';
import ChatMessage from './ChatMessage.jsx';
import './ChatBox.css';

// Durée du fondu de sortie d'un message expiré.
const LEAVE_MS = 700;

// Exemples affichés dans l'aperçu des réglages tant que le tchat est vide.
const EMOTE = id => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
const PLACEHOLDER_MESSAGES = [
    { id: 'p1', name: 'Netrunner_42', color: '#1E90FF', parts: [{ type: 'text', text: 'Exemple de message ' }, { type: 'emote', name: 'Kappa', url: EMOTE(25) }] },
    { id: 'p2', name: 'Judy', color: '#FF69B4', parts: [{ type: 'text', text: 'Le tchat apparaîtra ici ' }, { type: 'emote', name: 'LUL', url: EMOTE(425618) }] },
    { id: 'p3', name: 'Panam', color: '#DAA520', parts: [{ type: 'text', text: 'Les emotes animées et les badges sont pris en charge.' }] }
].map(m => ({ ...m, kind: 'message', action: false, badges: [] }));

/**
 * Tchat Twitch dont le cadre suit le nombre de messages affichés.
 * growDirection 'up' : la position Y du widget est le bas du cadre, qui grandit vers le haut ;
 * growDirection 'down' : Y est le haut du cadre, qui grandit vers le bas.
 * Les nouveaux messages arrivent toujours en bas ; au-delà de `maxMessages` les plus
 * anciens sortent, et chaque message disparaît après `lifetimeSec` (0 = jamais).
 */
export default function ChatBox({ messages, settings, showPlaceholder }) {
    const { maxMessages, lifetimeSec, growDirection, fontSize, width, showBadges } = settings;
    const now = useClock().getTime();
    const lifetimeMs = lifetimeSec * 1000;

    let visible = messages.slice(-maxMessages);
    if (lifetimeMs > 0) visible = visible.filter(m => now - m.receivedAt < lifetimeMs);
    if (visible.length === 0 && showPlaceholder) visible = PLACEHOLDER_MESSAGES;
    if (visible.length === 0) return null;

    return (
        <div className={`chat-box ${growDirection === 'down' ? 'is-grow-down' : 'is-grow-up'}`}>
            <div className="chat-box__panel" style={{ width, fontSize }}>
                <div className="chat-box__header">
                    <span className="chat-box__dot" />
                    <span>NET_CHANNEL // LIVE FEED</span>
                </div>
                {visible.map(message => (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        showBadges={showBadges}
                        leaving={lifetimeMs > 0 && now - message.receivedAt > lifetimeMs - LEAVE_MS}
                    />
                ))}
            </div>
        </div>
    );
}
