import { nickFromPrefix } from './ircParser.js';

// Format « default » : Twitch sert la version animée de l'emote quand elle existe.
const emoteUrl = id => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;

// Couleurs attribuées par Twitch aux viewers qui n'en ont pas choisi.
const DEFAULT_COLORS = [
    '#FF0000', '#0000FF', '#00FF00', '#B22222', '#FF7F50', '#9ACD32', '#FF4500', '#2E8B57',
    '#DAA520', '#D2691E', '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F'
];

function defaultColor(login) {
    const sum = [...login].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return DEFAULT_COLORS[sum % DEFAULT_COLORS.length];
}

/**
 * Découpe le texte en morceaux texte / emote à partir du tag « emotes »
 * ("25:0-4,12-16/1902:6-10"). Les positions sont en caractères Unicode,
 * d'où le découpage par Array.from et non par unités UTF-16.
 */
export function splitEmotes(text, emotesTag) {
    const chars = Array.from(text);
    const ranges = (emotesTag || '')
        .split('/')
        .filter(Boolean)
        .flatMap(entry => {
            const [id, positions] = entry.split(':');
            return positions.split(',').map(pos => {
                const [start, end] = pos.split('-').map(Number);
                return { id, start, end };
            });
        })
        .sort((a, b) => a.start - b.start);

    const parts = [];
    let cursor = 0;
    for (const { id, start, end } of ranges) {
        if (start < cursor || end >= chars.length) continue;
        if (start > cursor) parts.push({ type: 'text', text: chars.slice(cursor, start).join('') });
        parts.push({ type: 'emote', name: chars.slice(start, end + 1).join(''), url: emoteUrl(id) });
        cursor = end + 1;
    }
    if (cursor < chars.length) parts.push({ type: 'text', text: chars.slice(cursor).join('') });
    return parts;
}

/**
 * Remplace, dans les morceaux de texte, les mots qui correspondent à une emote
 * 7TV/BTTV/FFZ. Une emote « zero-width » collée (à des espaces près) à une emote
 * précédente se superpose à elle via `overlays` au lieu de s'afficher à côté.
 */
export function applyThirdPartyEmotes(parts, emotes) {
    if (emotes.size === 0) return parts;

    const result = [];
    const pushText = text => {
        const last = result[result.length - 1];
        if (last?.type === 'text') last.text += text;
        else result.push({ type: 'text', text });
    };

    for (const part of parts) {
        if (part.type !== 'text') {
            result.push({ ...part });
            continue;
        }
        for (const token of part.text.split(/(\s+)/)) {
            const emote = token && emotes.get(token);
            if (!emote) {
                if (token) pushText(token);
                continue;
            }

            const last = result[result.length - 1];
            const beforeLast = result[result.length - 2];
            const previousEmote = last?.type === 'emote'
                ? last
                : last?.type === 'text' && !last.text.trim() && beforeLast?.type === 'emote' ? beforeLast : null;

            if (emote.zeroWidth && previousEmote) {
                if (previousEmote !== last) result.pop(); // l'espace entre les deux disparaît
                previousEmote.overlays = [...(previousEmote.overlays ?? []), { name: token, url: emote.url }];
            } else {
                result.push({ type: 'emote', name: token, url: emote.url });
            }
        }
    }
    return result;
}

function resolveBadges(badgesTag, badges) {
    return (badgesTag || '')
        .split(',')
        .filter(Boolean)
        .map(key => badges.get(key))
        .filter(Boolean);
}

/**
 * Message IRC PRIVMSG ou USERNOTICE → message prêt à afficher.
 * `badges` est une Map "set/version" → { title, url } ;
 * `emotes` une Map nom → { url, zeroWidth } (emotes 7TV/BTTV/FFZ).
 */
export function buildChatMessage(irc, badges, emotes = new Map()) {
    const { tags } = irc;
    const login = tags.login || nickFromPrefix(irc.prefix) || '';
    let text = irc.params[1] ?? '';

    // "/me message" arrive sous la forme \u0001ACTION message\u0001
    const action = text.startsWith('\u0001ACTION ') && text.endsWith('\u0001');
    if (action) text = text.slice(8, -1);

    return {
        id: tags.id,
        kind: irc.command === 'USERNOTICE' ? 'notice' : 'message',
        notice: irc.command === 'USERNOTICE' ? tags['system-msg'] || null : null,
        at: Number(tags['tmi-sent-ts']) || Date.now(),
        userId: tags['user-id'] || null,
        login,
        name: tags['display-name'] || login,
        color: tags.color || defaultColor(login),
        action,
        badges: resolveBadges(tags.badges, badges),
        parts: applyThirdPartyEmotes(splitEmotes(text, tags.emotes), emotes)
    };
}
