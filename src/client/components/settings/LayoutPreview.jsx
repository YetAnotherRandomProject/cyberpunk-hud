import { useElementSize } from '../../hooks/useElementSize.js';
import Overlay from '../overlay/Overlay.jsx';
import './LayoutPreview.css';

const HUD_WIDTH = 1920;
const HUD_HEIGHT = 1080;

/**
 * Aperçu réduit et interactif de l'overlay. Il occupe toute la place restante de la colonne,
 * sans défilement. Glisser un élément le déplace ; un clic le sélectionne pour afficher
 * ses réglages dans la colonne de gauche.
 */
export default function LayoutPreview({ config, telemetry, currentAlert, chat, selectedWidget, onWidgetSelect, onWidgetChange }) {
    const [areaRef, area] = useElementSize();
    const scale = Math.min(area.width / HUD_WIDTH, area.height / HUD_HEIGHT) || 0;

    return (
        <div className="layout-preview">
            <div className="layout-preview__label">
                <span>APERÇU EN DIRECT</span>
                <span>Cliquez un élément pour le régler, glissez-le pour le placer</span>
            </div>
            <div ref={areaRef} className="layout-preview__area">
                {scale > 0 && (
                    <div className="layout-preview__frame" style={{ width: HUD_WIDTH * scale, height: HUD_HEIGHT * scale }}>
                        <div className="layout-preview__canvas" style={{ transform: `scale(${scale})` }}>
                            <Overlay
                                config={config}
                                telemetry={telemetry}
                                currentAlert={currentAlert}
                                chat={chat}
                                editable
                                previewScale={scale}
                                selectedWidget={selectedWidget}
                                onWidgetSelect={onWidgetSelect}
                                onWidgetMove={(id, { x, y }) => onWidgetChange(id, { ...config.widgets[id], x, y })}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
