// Lancement sans Electron : `npm start` (ou `npm run dev` avec l'interface Vite).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHudServer } from './createHudServer.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const hud = createHudServer({
    dataDir: path.join(rootDir, 'data'),
    clientDir: path.join(rootDir, 'dist', 'client')
});

await hud.start();
console.log('========================================================');
console.log(` RÉGLAGES DU HUD    : ${hud.url('/')}`);
console.log(` SOURCE OBS (1920x1080) : ${hud.url('/overlay')}`);
console.log('========================================================');

const shutdown = async () => {
    await hud.stop();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
