export default function WireframeGlobe({ className }) {
    return (
        <svg className={className} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="25" cy="25" r="21" />
            <ellipse cx="25" cy="25" rx="11" ry="21" />
            <ellipse cx="25" cy="25" rx="21" ry="9" />
            <line x1="4" y1="25" x2="46" y2="25" />
            <line x1="25" y1="4" x2="25" y2="46" />
        </svg>
    );
}
