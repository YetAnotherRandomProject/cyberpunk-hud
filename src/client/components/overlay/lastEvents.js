// Widgets « dernier… » de l'overlay. `read` extrait l'événement de la télémétrie
// et le met en forme ({ name, detail }), ou retourne null s'il n'y en a pas encore.
const plural = (count, singular, pluralForm = `${singular}S`) => `${count} ${count > 1 ? pluralForm : singular}`;
const anonymous = name => name || 'ANONYME';

const format = (event, describe) => (event ? describe(event) : null);

export const LAST_EVENTS = [
    {
        id: 'lastSub',
        label: 'LAST_SUB // IMPLANT',
        read: s => format(s.lastSub, e => ({
            name: e.name,
            detail: `${plural(e.months ?? 1, 'MOIS', 'MOIS')} CUMULÉ${e.months > 1 ? 'S' : ''} // T${e.tier ?? 1}`
        }))
    },
    {
        id: 'lastGiftSub',
        label: 'LAST_GIFT // TRANSFER',
        read: s => format(s.lastGiftSub, e => ({
            name: anonymous(e.name),
            detail: `${plural(e.count ?? 1, 'SUB OFFERT', 'SUBS OFFERTS')} // T${e.tier ?? 1}`
        }))
    },
    {
        id: 'lastCheer',
        label: 'LAST_BITS // EDDIES',
        read: s => format(s.lastCheer, e => ({ name: anonymous(e.name), detail: plural(e.bits, 'BIT') }))
    },
    {
        id: 'lastRaid',
        label: 'LAST_RAID // BREACH',
        read: s => format(s.lastRaid, e => ({ name: e.name, detail: plural(e.viewers ?? 0, 'NETRUNNER') }))
    },
    {
        id: 'lastFollower',
        label: 'LAST_FOLLOW // LINK',
        read: s => format(s.lastFollower, e => ({ name: e.name, detail: null }))
    }
];
