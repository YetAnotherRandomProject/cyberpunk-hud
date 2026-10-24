import { useAlertQueue } from '../../hooks/useAlertQueue.js';
import { fillTemplate, upper } from '../../lib/format.js';
import ArasakaKamon from './ArasakaKamon.jsx';
import './AlertBanner.css';

// Mise en forme de chaque type d'alerte à partir des textes réglables (t).
const PRESENTATION = {
    follow: (alert, t) => ({
        tag: fillTemplate(t.followTag, alert),
        headline: alert.user,
        detail: fillTemplate(t.followDetail, alert)
    }),
    raid: (alert, t) => ({
        tag: fillTemplate(t.raidTag, alert, alert.viewers),
        headline: alert.user,
        detail: fillTemplate(t.raidDetail, { ...alert, viewers: alert.viewers ?? 0 }, alert.viewers)
    }),
    sub: (alert, t) => {
        const resub = alert.months > 1;
        return {
            tag: fillTemplate(resub ? t.resubTag : t.subTag, alert, alert.months),
            headline: alert.user,
            detail: fillTemplate(resub ? t.resubDetail : t.subDetail, alert, alert.months),
            message: alert.message
        };
    },
    giftsub: (alert, t) => ({
        tag: fillTemplate(t.giftTag, alert, alert.count),
        headline: alert.user ?? t.anonymous,
        detail: fillTemplate(t.giftDetail, alert, alert.count)
    }),
    cheer: (alert, t) => ({
        tag: fillTemplate(t.cheerTag, alert, alert.bits),
        headline: alert.user ?? t.anonymous,
        detail: fillTemplate(t.cheerDetail, alert, alert.bits),
        message: alert.message
    })
};

const PLACEHOLDER = { kind: 'placeholder', tag: 'ALERT CHANNEL', headline: 'EMPLACEMENT DES ALERTES', detail: 'FOLLOW // RAID // SUB // BITS' };

// Alerte plein cadre « intrusion » pour les follows, raids, subs et bits.
// En mode édition, un gabarit reste visible pour pouvoir placer le widget.
export default function AlertBanner({ alerts, texts, durationSec, showPlaceholder }) {
    const alert = useAlertQueue(alerts, durationSec);

    if (!alert && !showPlaceholder) return null;
    const view = alert ? { kind: alert.kind, ...PRESENTATION[alert.kind](alert, texts) } : PLACEHOLDER;

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
