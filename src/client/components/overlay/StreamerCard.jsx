import { useAlternatingPage } from '../../hooks/useAlternatingPage.js';
import { upper } from '../../lib/format.js';
import PagePills from './PagePills.jsx';
import WireframeGlobe from './WireframeGlobe.jsx';
import StackedLines from './StackedLines.jsx';
import CardBioPage from './CardBioPage.jsx';
import CardNetPage from './CardNetPage.jsx';
import './StreamerCard.css';

// Carte streameur double page (bas gauche) : P1 infos du live, P2 courbes temps réel.
export default function StreamerCard({ hud, texts, theme, telemetry, fallbackName }) {
    const [page, selectPage] = useAlternatingPage(hud.cardFlipIntervalSec);
    const { title } = telemetry.streamer;

    return (
        <div className="streamer-card">
            <div className="streamer-card__header">
                <div className="streamer-card__header-left">
                    <StackedLines count={3} />
                    <span>{texts.connection} {hud.connectionId}</span>
                </div>
                <PagePills active={page} onSelect={selectPage} />
            </div>

            <div className="streamer-card__body">
                <div className="streamer-card__side">
                    <StackedLines count={4} width={14} dim />
                    <WireframeGlobe className="streamer-card__globe" />
                </div>

                <div className="streamer-card__panel">
                    {page === 1
                        ? <CardBioPage hud={hud} texts={texts} telemetry={telemetry} fallbackName={fallbackName} />
                        : <CardNetPage title={texts.plotTitle} theme={theme} metrics={telemetry.metrics} history={telemetry.history} />}
                </div>

                <div className="streamer-card__accent" />
            </div>

            {title && (
                <div className="streamer-card__footer">
                    <span className="streamer-card__footer-box">Z</span>
                    <span>{upper(title, 42)}</span>
                </div>
            )}
        </div>
    );
}
