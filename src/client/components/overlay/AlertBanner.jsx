import { useAlertQueue } from '../../hooks/useAlertQueue.js';
import { upper } from '../../lib/format.js';
import ArasakaKamon from './ArasakaKamon.jsx';
import './AlertBanner.css';

const PRESENTATION = {
    follow: alert => ({
        tag: 'NEW LINK ESTABLISHED',
        headline: alert.user,
        detail: 'A REJOINT LE RÉSEAU // FOLLOW'
    }),
    raid: alert => ({
        tag: 'BREACH DETECTED // INCOMING RAID',
        headline: alert.user,
        detail: `${alert.viewers ?? 0} NETRUNNERS EN APPROCHE`
    }),
    sub: alert => ({
        tag: alert.months > 1 ? `IMPLANT UPGRADE // RESUB T${alert.tier}` : `NEW IMPLANT INSTALLED // SUB T${alert.tier}`,
        headline: alert.user,
        detail: alert.months > 1 ? `${alert.months} MOIS DE SERVICE CHEZ ARASAKA` : 'REJOINT LA CORPO // SUB',
        message: alert.message
    }),
    giftsub: alert => ({
        tag: `EDDIES TRANSFER // GIFT SUB T${alert.tier}`,
        headline: alert.user ?? 'NETRUNNER ANONYME',
        detail: `OFFRE ${alert.count} SUB${alert.count > 1 ? 'S' : ''} AU RÉSEAU`
            + (alert.total ? ` // ${alert.total} AU TOTAL` : '')
    }),
    cheer: alert => ({
        tag: 'EDDIES INCOMING // CHEER',
        headline: alert.user ?? 'NETRUNNER ANONYME',
        detail: `${alert.bits} BITS TRANSFÉRÉS`,
        message: alert.message
    })
};

const PLACEHOLDER = { kind: 'placeholder', tag: 'ALERT CHANNEL', headline: 'EMPLACEMENT DES ALERTES', detail: 'FOLLOW // RAID // SUB // BITS' };

// Alerte plein cadre « intrusion » pour les follows, raids, subs et bits.
// En mode édition, un gabarit reste visible pour pouvoir placer le widget.
export default function AlertBanner({ alerts, durationSec, showPlaceholder }) {
    const alert = useAlertQueue(alerts, durationSec);

    if (!alert && !showPlaceholder) return null;
    const view = alert ? { kind: alert.kind, ...PRESENTATION[alert.kind](alert) } : PLACEHOLDER;

    return (
        <div
            key={alert?.id ?? 'placeholder'}
            className={`alert-banner is-${view.kind}`}
            style={{ '--alert-duration': `${Math.max(2, durationSec)}s` }}
        >
            <div className="alert-banner__tag">
                <span className="alert-banner__blink" />
                {view.tag}
            </div>
            <div className="alert-banner__body">
                <ArasakaKamon className="alert-banner__logo" />
                <div>
                    <div className="alert-banner__headline" data-text={upper(view.headline)}>{upper(view.headline)}</div>
                    <div className="alert-banner__detail">{view.detail}</div>
                    {view.message && <div className="alert-banner__message">« {view.message} »</div>}
                </div>
            </div>
            <div className="alert-banner__progress" />
        </div>
    );
}
