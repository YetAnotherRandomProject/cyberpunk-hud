import { fillTemplate } from '../../lib/format.js';

// Widgets « dernier… » de l'overlay. `read(streamer, texts)` extrait l'événement de la
// télémétrie et le met en forme avec les textes réglables ({ name, detail }),
// ou retourne null s'il n'y en a pas encore.
export const LAST_EVENTS = [
    {
        id: 'lastSub',
        read: (s, t) => s.lastSub && {
            name: s.lastSub.name,
            detail: fillTemplate(t.detail, { tier: 1, ...s.lastSub }, s.lastSub.months)
        }
    },
    {
        id: 'lastGiftSub',
        read: (s, t) => s.lastGiftSub && {
            name: s.lastGiftSub.name || t.anonymous,
            detail: fillTemplate(t.detail, { tier: 1, ...s.lastGiftSub }, s.lastGiftSub.count)
        }
    },
    {
        id: 'lastCheer',
        read: (s, t) => s.lastCheer && {
            name: s.lastCheer.name || t.anonymous,
            detail: fillTemplate(t.detail, s.lastCheer, s.lastCheer.bits)
        }
    },
    {
        id: 'lastRaid',
        read: (s, t) => s.lastRaid && {
            name: s.lastRaid.name,
            detail: fillTemplate(t.detail, s.lastRaid, s.lastRaid.viewers)
        }
    },
    {
        id: 'lastFollower',
        read: s => s.lastFollower && { name: s.lastFollower.name, detail: null }
    }
];
