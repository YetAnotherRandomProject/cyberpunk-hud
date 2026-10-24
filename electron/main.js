import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, shell } from 'electron';
import { createHudServer } from '../server/createHudServer.js';
import { setupAutoUpdate } from './autoUpdate.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let mainWindow = null;
let hud = null;

function restartApp() {
    app.relaunch();
    app.quit();
}

async function boot() {
    hud = createHudServer({
        dataDir: app.getPath('userData'),
        clientDir: path.join(rootDir, 'dist', 'client'),
        onRestartRequest: restartApp
    });

    try {
        await hud.start();
    } catch (err) {
        dialog.showErrorBox('Cyberpunk HUD', `Impossible de démarrer le serveur :\n${err.message}`);
        app.quit();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 960,
        minHeight: 640,
        title: 'Cyberpunk HUD',
        backgroundColor: '#05090b',
        autoHideMenuBar: true
    });
    // Les liens externes s'ouvrent dans le navigateur par défaut.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.loadURL(hud.url('/'));
    setupAutoUpdate(() => mainWindow);
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });
    app.whenReady().then(boot);
    app.on('window-all-closed', () => app.quit());
    app.on('will-quit', event => {
        if (!hud) return;
        event.preventDefault();
        const closing = hud;
        hud = null;
        closing.stop().finally(() => app.quit());
    });
}
