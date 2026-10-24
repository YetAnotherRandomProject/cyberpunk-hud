import { formatUptime, upper } from '../../lib/format.js';
import ArasakaKamon from './ArasakaKamon.jsx';
import Barcode from './Barcode.jsx';
import './CardBioPage.css';

const MAIN_BARCODE = [1, 2, 3, 1, 4, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 4, 1, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2];

// Page 1 de la carte : n'affiche que les informations réellement disponibles.
export default function CardBioPage({ hud, texts, telemetry, fallbackName }) {
    const { name, uptimeSeconds, category, scene, broadcasterType, language } = telemetry.streamer;
    const fps = telemetry.metrics.FPS;
    const game = telemetry.fps?.process?.replace(/\.exe$/i, '');
    const displayName = name || fallbackName;
    const hasUptime = typeof uptimeSeconds === 'number' && uptimeSeconds >= 0;

    return (
        <div className="card-page">
            <div className="card-bio__top">
                <div className="card-bio__data">
                    {displayName && (
                        <div>{texts.operative} // <span className="card-bio__name">{upper(displayName)}</span></div>
                    )}
                    {hasUptime && <div>{texts.uptime}: {formatUptime(uptimeSeconds)}</div>}
                    {category && <div>{texts.activity}: {upper(category, 18)}</div>}
                    {scene && <div>{texts.scene}: {upper(scene, 18)}</div>}
                    {(broadcasterType || language) && (
                        <div>
                            {broadcasterType && <>{texts.rank}: {upper(broadcasterType)}</>}
                            {broadcasterType && language && ' // '}
                            {language && <>{texts.language}: {upper(language)}</>}
                        </div>
                    )}
                </div>
                <div className="card-bio__brand">
                    <ArasakaKamon />
                    <span>{hud.brandName}</span>
                </div>
            </div>

            <div className="card-bio__mid">
                <div>{texts.obsLink}: {telemetry.obsConnected ? texts.linkActive : texts.linkOffline}</div>
                {game && fps && <div>{texts.gameLink}: {upper(game, 16)} // {fps.value} FPS</div>}
                <div>{texts.clearance}: {hud.clearanceLevel}</div>
            </div>

            <Barcode className="card-bio__barcode" widths={MAIN_BARCODE} />
        </div>
    );
}
