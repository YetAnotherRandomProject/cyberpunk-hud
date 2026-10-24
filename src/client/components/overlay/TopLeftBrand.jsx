import ArasakaKamon from './ArasakaKamon.jsx';
import './TopLeftBrand.css';

export default function TopLeftBrand({ brandName }) {
    return (
        <div className="top-left-brand">
            <ArasakaKamon className="top-left-brand__symbol" />
            <span className="top-left-brand__wordmark">{brandName}</span>
        </div>
    );
}
