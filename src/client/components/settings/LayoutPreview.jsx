import { useElementWidth } from '../../hooks/useElementWidth.js';
import Overlay from '../overlay/Overlay.jsx';
import './LayoutPreview.css';

const HUD_WIDTH = 1920;
const HUD_HEIGHT = 1080;

// Aperçu réduit et interactif de l'overlay : les widgets s'y déplacent à la souris.
export default function LayoutPreview({ config, telemetry, alerts, chat, onWidgetMove }) {
    const [frameRef, width] = useElementWidth();
    const scale = width / HUD_WIDTH || 0;

    return (
        <div className="layout-preview">
            <div className="layout-preview__label">
                <span>APERÇU EN DIRECT</span>
                <span>Glissez les éléments pour les placer</span>
            </div>
            <div ref={frameRef} className="layout-preview__frame" style={{ height: HUD_HEIGHT * scale }}>
                {scale > 0 && (
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
                )}
            </div>
        </div>
    );
}
