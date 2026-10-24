import { WIDGETS, WIDGETS_BY_ID, getIn } from '../../lib/widgets.js';
import Section from './Section.jsx';
import Field from './fields/Field.jsx';
import ToggleField from './fields/ToggleField.jsx';
import NumberField from './fields/NumberField.jsx';
import TextField from './fields/TextField.jsx';
import './WidgetPanel.css';

/**
 * Réglages de l'élément sélectionné (clic dans l'aperçu ou menu déroulant) :
 * disposition puis textes. `setValue(path, value)` écrit dans la config.
 */
export default function WidgetPanel({ widgetId, config, defaults, setValue, onSelect, onClose }) {
    const widget = WIDGETS_BY_ID[widgetId];
    const layout = config.widgets[widgetId];
    const setLayout = (key, value) => setValue(['widgets', widgetId], { ...layout, [key]: value });
    const resetFields = () => widget.fields.forEach(f => setValue(f.path, getIn(defaults, f.path)));

    return (
        <div className="widget-panel">
            <div className="widget-panel__picker">
                <Field label="Élément">
                    <select value={widgetId} onChange={e => onSelect(e.target.value)}>
                        {WIDGETS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                </Field>
                <button type="button" className="ui-button is-secondary" onClick={onClose}>Fermer</button>
            </div>

            <Section
                title="Disposition"
                description="Glissez l'élément dans l'aperçu, ou réglez-le ici au pixel près."
                onReset={defaults ? () => setValue(['widgets', widgetId], { ...defaults.widgets[widgetId] }) : null}
            >
                <ToggleField label="Afficher sur l'overlay" value={layout.enabled} onChange={v => setLayout('enabled', v)} />
                <div className={`widget-panel__grid${layout.enabled ? '' : ' is-disabled'}`}>
                    <NumberField label="X" min={-500} max={2400} value={layout.x} onChange={v => setLayout('x', v)} />
                    <NumberField label="Y" min={-500} max={1500} value={layout.y} onChange={v => setLayout('y', v)} />
                    <NumberField label="Taille" min={0.3} max={3} step={0.05} value={layout.scale} onChange={v => setLayout('scale', v)} />
                    <NumberField label="Angle 3D" min={-45} max={45} value={layout.tilt} onChange={v => setLayout('tilt', v)} />
                </div>
            </Section>

            {widget.fields.length > 0 && (
                <Section title="Textes" description={widget.note} onReset={defaults ? resetFields : null}>
                    {widget.fields.map(field => (field.type === 'number'
                        ? (
                            <NumberField
                                key={field.path.join('.')}
                                label={field.label}
                                min={field.min}
                                max={field.max}
                                value={getIn(config, field.path)}
                                onChange={v => setValue(field.path, v)}
                            />
                        )
                        : (
                            <TextField
                                key={field.path.join('.')}
                                label={field.label}
                                hint={field.hint}
                                value={getIn(config, field.path)}
                                onChange={v => setValue(field.path, v)}
                            />
                        )))}
                </Section>
            )}
        </div>
    );
}
