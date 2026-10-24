import Section from './Section.jsx';
import ToggleField from './fields/ToggleField.jsx';
import NumberField from './fields/NumberField.jsx';
import TextField from './fields/TextField.jsx';
import ChoiceField from './fields/ChoiceField.jsx';

const GROW_OPTIONS = [
    { value: 'up', label: '↑ Vers le haut' },
    { value: 'down', label: '↓ Vers le bas' }
];

export default function ChatSettings({ values, onChange, onReset }) {
    return (
        <Section
            title="Tchat"
            description="Le tchat de la chaîne Twitch renseignée plus haut, avec emotes et badges. Aucune connexion n'est nécessaire."
            onReset={onReset}
        >
            <ToggleField label="Afficher le tchat" value={values.enabled} onChange={v => onChange('enabled', v)} />
            <ChoiceField
                label="Le cadre s'agrandit"
                hint={values.growDirection === 'down'
                    ? 'La position Y du widget est le haut du cadre.'
                    : 'La position Y du widget est le bas du cadre.'}
                value={values.growDirection}
                options={GROW_OPTIONS}
                onChange={v => onChange('growDirection', v)}
            />
            <div className="field-row">
                <NumberField
                    label="Messages max à l'écran"
                    min={1}
                    max={30}
                    value={values.maxMessages}
                    onChange={v => onChange('maxMessages', v)}
                />
                <NumberField
                    label="Durée d'affichage (s)"
                    hint="0 = sans limite"
                    min={0}
                    max={600}
                    value={values.lifetimeSec}
                    onChange={v => onChange('lifetimeSec', v)}
                />
            </div>
            <div className="field-row">
                <NumberField label="Taille du texte" min={10} max={40} value={values.fontSize} onChange={v => onChange('fontSize', v)} />
                <NumberField label="Largeur (px)" min={200} max={1200} step={10} value={values.width} onChange={v => onChange('width', v)} />
            </div>
            <ToggleField label="Afficher les badges" value={values.showBadges} onChange={v => onChange('showBadges', v)} />
            <ToggleField label="Emotes 7TV" value={values.emotes7tv} onChange={v => onChange('emotes7tv', v)} />
            <ToggleField label="Emotes BetterTTV" value={values.emotesBttv} onChange={v => onChange('emotesBttv', v)} />
            <ToggleField label="Emotes FrankerFaceZ" value={values.emotesFfz} onChange={v => onChange('emotesFfz', v)} />
            <ToggleField
                label="Masquer les commandes (!commande)"
                value={values.hideCommands}
                onChange={v => onChange('hideCommands', v)}
            />
            <TextField
                label="Comptes masqués"
                hint="Séparés par des virgules, par exemple vos bots."
                value={values.hiddenUsers}
                onChange={v => onChange('hiddenUsers', v)}
            />
        </Section>
    );
}
