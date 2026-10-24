import { useRef } from 'react';
import './Widget.css';

// Déplacement en dessous duquel un appui est un clic (sélection) et non un glisser.
const CLICK_TOLERANCE_PX = 3;

function widgetTransform({ scale, tilt }) {
    const skew = tilt ? (tilt > 0 ? -1.5 : 1.5) : 0;
    return `perspective(700px) scale(${scale || 1}) rotateY(${tilt || 0}deg) skewY(${skew}deg)`;
}

/**
 * Conteneur positionné d'un élément du HUD (position, taille, inclinaison 3D).
 * En mode édition : glisser pour déplacer, cliquer pour sélectionner (onSelect),
 * et un élément masqué reste visible en transparence pour pouvoir le réactiver.
 */
export default function Widget({ id, layout, editable, selected, previewScale, onMove, onSelect, children }) {
    const drag = useRef(null);

    if (!layout.enabled && !editable) return null;

    const handlePointerDown = event => {
        if (!editable || event.button !== 0) return;
        event.stopPropagation();
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // pointeur déjà relâché : le glisser suivra sans capture
        }
        drag.current = { startX: event.clientX, startY: event.clientY, x: layout.x, y: layout.y, moved: false };
    };

    const handlePointerMove = event => {
        const current = drag.current;
        if (!current) return;
        const dx = event.clientX - current.startX;
        const dy = event.clientY - current.startY;
        if (!current.moved && Math.hypot(dx, dy) < CLICK_TOLERANCE_PX) return;
        current.moved = true;
        onMove?.(id, {
            x: Math.round(current.x + dx / previewScale),
            y: Math.round(current.y + dy / previewScale)
        });
    };

    const handlePointerUp = () => {
        if (drag.current && !drag.current.moved) onSelect?.(id);
        drag.current = null;
    };

    const classes = [
        'hud-widget',
        editable && 'is-draggable',
        selected && 'is-selected',
        !layout.enabled && 'is-hidden'
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            data-widget-id={id}
            style={{ left: layout.x, top: layout.y, transform: widgetTransform(layout) }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { drag.current = null; }}
        >
            {children}
        </div>
    );
}
