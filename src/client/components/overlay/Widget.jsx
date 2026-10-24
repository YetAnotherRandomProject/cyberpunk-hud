import { useRef } from 'react';
import './Widget.css';

function widgetTransform({ scale, tilt }) {
    const skew = tilt ? (tilt > 0 ? -1.5 : 1.5) : 0;
    return `perspective(700px) scale(${scale || 1}) rotateY(${tilt || 0}deg) skewY(${skew}deg)`;
}

// Conteneur positionné d'un élément du HUD (position, taille, inclinaison 3D, glisser-déposer).
export default function Widget({ id, layout, editable, previewScale, onMove, children }) {
    const drag = useRef(null);

    if (!layout.enabled) return null;

    const handlePointerDown = event => {
        if (!editable || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { startX: event.clientX, startY: event.clientY, x: layout.x, y: layout.y };
    };

    const handlePointerMove = event => {
        if (!drag.current) return;
        const { startX, startY, x, y } = drag.current;
        onMove?.(id, {
            x: Math.round(x + (event.clientX - startX) / previewScale),
            y: Math.round(y + (event.clientY - startY) / previewScale)
        });
    };

    const handlePointerUp = () => {
        drag.current = null;
    };

    return (
        <div
            className={`hud-widget${editable ? ' is-draggable' : ''}`}
            style={{ left: layout.x, top: layout.y, transform: widgetTransform(layout) }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {children}
        </div>
    );
}
