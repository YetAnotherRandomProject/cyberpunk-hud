import './AudioGlyph.css';

// Glyphe « audio » animé (cercles + barres d'égaliseur).
export default function AudioGlyph() {
    return (
        <div className="audio-glyph">
            <div className="audio-glyph__ring" />
            <div className="audio-glyph__dot" />
            <div className="audio-glyph__bars">
                <span /><span /><span /><span />
            </div>
        </div>
    );
}
