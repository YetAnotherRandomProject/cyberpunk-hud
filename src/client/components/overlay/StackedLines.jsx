import './StackedLines.css';

// Petites lignes horizontales empilées (motif décoratif).
export default function StackedLines({ count, width = 12, dim = false }) {
    return (
        <div className="stacked-lines" style={{ width, opacity: dim ? 0.6 : undefined }}>
            {Array.from({ length: count }, (_, i) => <span key={i} />)}
        </div>
    );
}
