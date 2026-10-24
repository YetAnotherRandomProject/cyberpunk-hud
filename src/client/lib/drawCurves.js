const PAD_Y = 10;

function normalize(series, minSpread) {
    let min = Math.min(...series);
    let max = Math.max(...series);
    if (max - min < minSpread) {
        const mid = (min + max) / 2;
        min = mid - minSpread / 2;
        max = mid + minSpread / 2;
    }
    return series.map(v => (v - min) / (max - min));
}

function drawCurve(ctx, w, h, { values, minSpread, color, fill }) {
    const norm = normalize(values, minSpread);
    const usable = h - PAD_Y * 2;
    const pts = norm.map((v, i) => ({
        x: (i / (norm.length - 1)) * (w - 6) + 2,
        y: PAD_Y + (1 - v) * usable
    }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();

    ctx.lineTo(last.x, h);
    ctx.lineTo(pts[0].x, h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.shadowBlur = 0;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Dessine des courbes lissées superposées, chacune normalisée sur sa propre échelle.
export function drawCurves(canvas, curves, gridColor) {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    if (curves.length === 0) return;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    curves.forEach(curve => drawCurve(ctx, w, h, curve));
}
