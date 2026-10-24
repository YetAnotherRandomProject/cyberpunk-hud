import './PagePills.css';

const PAGES = [
    { n: 1, label: '01 // BIO' },
    { n: 2, label: '02 // NET' }
];

export default function PagePills({ active, onSelect }) {
    // pointerdown + stopPropagation : un clic sur une pastille ne déclenche pas le déplacement du widget.
    const select = n => event => {
        event.stopPropagation();
        onSelect(n);
    };

    return (
        <div className="page-pills">
            {PAGES.map(({ n, label }) => (
                <span
                    key={n}
                    className={`page-pills__pill${active === n ? ' is-active' : ''}`}
                    onPointerDown={select(n)}
                >
                    {label}
                </span>
            ))}
        </div>
    );
}
