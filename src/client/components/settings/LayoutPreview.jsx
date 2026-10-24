import { useElementSize } from '../../hooks/useElementSize.js';
import Overlay from '../overlay/Overlay.jsx';
import './LayoutPreview.css';

const HUD_WIDTH = 1920;
const HUD_HEIGHT = 1080;

// Aperçu réduit et interactif de l'overlay : les widgets s'y déplacent à la souris.
// Il occupe toute la place restante de la colonne, en largeur comme en hauteur, sans défilement.
export default function LayoutPreview({ config, telemetry, alerts, chat, onWidgetMove }) {
    const [areaRef, area] = useElementSize();
    const scale = Math.min(area.width / HUD_WIDTH, area.height / HUD_HEIGHT) || 0;

    return (
        <div className="layout-preview">
            <div className="layout-preview__label">
                <span>APERÇU EN DIRECT</span>
                <span>Glissez les éléments pour les placer</span>
            </div>
            <div ref={areaRef} className="layout-preview__area">
                {scale > 0 && (
                    <div className="layout-preview__frame" style={{ width: HUD_WIDTH * scale, height: HUD_HEIGHT * scale }}>
                        <div className="layout-preview__canvas" style={{ transform: `scale(${scale})` }}>
                            <Overlay
                                config={config}
                                telemetry={telemetry}
                                alerts={alerts}
                                chat={chat}
                                editable
                                previewScale={scale}
                                onWidgetMove={onWidgetMove}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
