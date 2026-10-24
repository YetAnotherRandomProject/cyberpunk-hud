import Section from './Section.jsx';

// Téléchargement de la configuration de l'overlay, pour la sauvegarder ou la partager.
export default function ExportSettings() {
    return (
        <Section
            title="Exporter l'overlay"
            description="Télécharge toute la configuration (disposition, textes, couleurs, alertes, tchat) dans un fichier JSON. Le Client ID, le Client secret Twitch et le mot de passe OBS n'y figurent jamais : le fichier peut être partagé sans risque."
        >
            <a className="ui-button export-settings__button" href="/api/config/export" download>
                Exporter la configuration
            </a>
        </Section>
    );
}
