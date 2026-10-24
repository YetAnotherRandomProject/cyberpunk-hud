import { useEffect, useMemo, useState } from 'react';
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

/**
 * Alerte plein cadre « intrusion » pour les follows, raids, subs et bits. L'alerte affichée
 * et sa durée viennent de la file d'attente du serveur, commune à tous les overlays.
 * En mode édition, un gabarit reste visible pour pouvoir placer le widget.
 */
export default function AlertBanner({ alert, texts, showPlaceholder }) {
    // Overlay rechargé en cours d'alerte : la barre de progression reprend où elle en est.
    // Calculé une fois par alerte, sinon chaque nouveau rendu ferait sauter la barre.
    const elapsedMs = useMemo(
        () => (alert ? Math.min(Math.max(0, Date.now() - alert.shownAt), alert.displayMs) : 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [alert?.id]
    );
    // La bannière disparaît après sa durée d'affichage, même si le son de l'alerte continue
    // (l'alerte suivante attend la fin du son, côté serveur).
    const [expiredId, setExpiredId] = useState(null);
    useEffect(() => {
        if (!alert) return undefined;
        const timer = setTimeout(() => setExpiredId(alert.id), alert.displayMs - elapsedMs);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alert?.id]);

    const shown = alert && alert.id !== expiredId ? alert : null;
    if (!shown && !showPlaceholder) return null;
    const view = shown ? { kind: shown.kind, ...PRESENTATION[shown.kind](shown, texts) } : PLACEHOLDER;

    return (
        <div
            key={shown?.id ?? 'placeholder'}
            className={`alert-banner is-${view.kind}`}
            style={shown ? { '--alert-duration': `${shown.displayMs}ms`, '--alert-elapsed': `${-elapsedMs}ms` } : undefined}
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
