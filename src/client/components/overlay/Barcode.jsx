/**
 * Code-barres décoratif. `widths` liste la largeur relative de chaque barre ;
 * `fixed` les rend en pixels plutôt qu'en proportion du conteneur.
 */
export default function Barcode({ widths, className, fixed = false }) {
    return (
        <div className={className}>
            {widths.map((w, i) => (
                <span
                    key={i}
                    style={fixed ? { width: w } : { flex: w, opacity: i % 5 === 0 ? 0.55 : 0.95 }}
                />
            ))}
        </div>
    );
}
