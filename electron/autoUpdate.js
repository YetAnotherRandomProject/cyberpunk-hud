import { app, dialog } from 'electron';
import updater from 'electron-updater';

const { autoUpdater } = updater;
const CHECK_INTERVAL_MS = 4 * 60 * 60_000;

/**
 * Mises à jour automatiques depuis les releases GitHub (configurées dans package.json → build.publish).
 * La nouvelle version est téléchargée en arrière-plan puis installée à la fermeture de l'application,
 * ou tout de suite si l'utilisateur le demande : rien n'interrompt un stream en cours.
 */
export function setupAutoUpdate(getWindow) {
    // En développement (npm run app), il n'y a ni installeur ni release à comparer.
    if (!app.isPackaged) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('error', err => console.warn('[UPDATE]', err.message));
    autoUpdater.on('update-downloaded', async ({ version }) => {
        const { response } = await dialog.showMessageBox(getWindow(), {
            type: 'info',
            title: 'Cyberpunk HUD',
            message: `La version ${version} est prête.`,
            detail: 'Elle sera installée à la prochaine fermeture de l\'application. Redémarrer maintenant ?',
            buttons: ['Redémarrer maintenant', 'Plus tard'],
            defaultId: 1,
            cancelId: 1
        });
        if (response === 0) autoUpdater.quitAndInstall();
    });

    const check = () => autoUpdater.checkForUpdates().catch(err => console.warn('[UPDATE]', err.message));
    check();
    setInterval(check, CHECK_INTERVAL_MS).unref();
}
