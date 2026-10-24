import Section from './Section.jsx';
import WidgetSettingsItem from './WidgetSettingsItem.jsx';

export const WIDGET_LABELS = {
    topLeftBrand: 'Logo (haut gauche)',
    topCenterTelemetry: 'Barre de statut (haut centre)',
    bottomLeftModule: 'Carte streameur (bas gauche)',
    bottomRightTicker: 'Ticker boursier (bas droite)',
    lastFollower: 'Dernier follower',
    chatBox: 'Tchat',
    alertBanner: 'Alertes follow / raid'
};

export default function WidgetSettings({ values, onChange, onReset }) {
    return (
        <Section
            title="Disposition"
            description="Déplacez les éléments directement dans l'aperçu, ou réglez-les ici au pixel près."
            onReset={onReset}
        >
            {Object.entries(WIDGET_LABELS).map(([id, label]) => (
                <WidgetSettingsItem
                    key={id}
                    label={label}
                    layout={values[id]}
                    onChange={(key, value) => onChange(id, { ...values[id], [key]: value })}
                />
            ))}
        </Section>
    );
}
