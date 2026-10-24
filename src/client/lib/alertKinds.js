// Types d'alertes, dans l'ordre d'affichage du panneau.
export const ALERT_KINDS = [
    { kind: 'follow', label: 'Follows' },
    { kind: 'raid', label: 'Raids' },
    { kind: 'sub', label: 'Subs' },
    { kind: 'giftsub', label: 'Subs offerts' },
    { kind: 'cheer', label: 'Bits' }
];

export const ALERT_KIND_LABEL = {
    follow: 'Follow',
    raid: 'Raid',
    sub: 'Sub',
    giftsub: 'Subs offerts',
    cheer: 'Bits'
};

// Sons : un par type, le resub pouvant avoir le sien.
export const SOUND_KINDS = [
    { kind: 'follow', label: 'Follow' },
    { kind: 'raid', label: 'Raid' },
    { kind: 'sub', label: 'Sub' },
    { kind: 'resub', label: 'Resub', hint: 'Sans son dédié, celui du sub est joué.' },
    { kind: 'giftsub', label: 'Subs offerts' },
    { kind: 'cheer', label: 'Bits' }
];

// Résumé d'une alerte pour le feed du panneau.
export function describeAlert(alert) {
    const user = alert.user ?? 'Anonyme';
    switch (alert.kind) {
        case 'raid':
            return `${user} — ${alert.viewers ?? 0} viewers`;
        case 'sub':
            return alert.months > 1 ? `${user} — resub ${alert.months} mois, T${alert.tier}` : `${user} — sub T${alert.tier}`;
        case 'giftsub':
            return `${user} — ${alert.count} sub${alert.count > 1 ? 's' : ''} offert${alert.count > 1 ? 's' : ''}`;
        case 'cheer':
            return `${user} — ${alert.bits} bits`;
        default:
            return user;
    }
}
