import ToggleField from './fields/ToggleField.jsx';
import NumberField from './fields/NumberField.jsx';
import './WidgetSettingsItem.css';

export default function WidgetSettingsItem({ label, layout, onChange }) {
    return (
        <div className={`widget-settings-item${layout.enabled ? '' : ' is-disabled'}`}>
            <ToggleField label={label} value={layout.enabled} onChange={v => onChange('enabled', v)} />
            <div className="widget-settings-item__grid">
                <NumberField label="X" min={-500} max={2400} value={layout.x} onChange={v => onChange('x', v)} />
                <NumberField label="Y" min={-500} max={1500} value={layout.y} onChange={v => onChange('y', v)} />
                <NumberField label="Taille" min={0.3} max={3} step={0.05} value={layout.scale} onChange={v => onChange('scale', v)} />
                <NumberField label="Angle 3D" min={-45} max={45} value={layout.tilt} onChange={v => onChange('tilt', v)} />
            </div>
        </div>
    );
}
