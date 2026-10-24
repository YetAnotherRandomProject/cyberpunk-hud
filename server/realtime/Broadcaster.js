import { WebSocketServer } from 'ws';

// Message envoyé régulièrement : une page qui n'en reçoit plus sait que la connexion est morte
// (veille du PC, coupure réseau) même si le navigateur ne l'a pas fermée, et se reconnecte.
export const HEARTBEAT_INTERVAL_MS = 5000;

// Diffuse config et télémétrie aux pages connectées (overlay OBS et panneau de réglages).
export class Broadcaster {
    #wss;
    #heartbeat;

    constructor(httpServer, getInitPayload) {
        this.#wss = new WebSocketServer({ server: httpServer, path: '/ws' });
        this.#wss.on('connection', ws => {
            ws.send(JSON.stringify({ type: 'INIT', ...getInitPayload() }));
        });
        this.#heartbeat = setInterval(() => this.broadcast('PING', null), HEARTBEAT_INTERVAL_MS);
    }

    broadcast(type, data) {
        const message = JSON.stringify({ type, data });
        for (const client of this.#wss.clients) {
            if (client.readyState === client.OPEN) client.send(message);
        }
    }

    close() {
        clearInterval(this.#heartbeat);
        for (const client of this.#wss.clients) client.terminate();
        return new Promise(resolve => this.#wss.close(() => resolve()));
    }
}
