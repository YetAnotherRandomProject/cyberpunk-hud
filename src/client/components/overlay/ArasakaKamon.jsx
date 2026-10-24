// Logo Arasaka (kamon 3 feuilles pleines + tige centrale).
export default function ArasakaKamon({ className }) {
    return (
        <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="7.5" />
            <path d="M 50 25 L 50 86" stroke="currentColor" strokeWidth="8.5" strokeLinecap="butt" />
            <path d="M 50 71 L 28 49" stroke="currentColor" strokeWidth="8.5" strokeLinecap="round" />
            <path d="M 50 71 L 72 49" stroke="currentColor" strokeWidth="8.5" strokeLinecap="round" />
            <circle cx="50" cy="25" r="12.5" fill="currentColor" />
            <circle cx="28" cy="49" r="12.5" fill="currentColor" />
            <circle cx="72" cy="49" r="12.5" fill="currentColor" />
        </svg>
    );
}
