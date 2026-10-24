import { WebSocketServer } from 'ws';

// Diffuse config et télémétrie aux pages connectées (overlay OBS et panneau de réglages).
export class Broadcaster {
    #wss;

    constructor(httpServer, getInitPayload) {
        this.#wss = new WebSocketServer({ server: httpServer, path: '/ws' });
        this.#wss.on('connection', ws => {
            ws.send(JSON.stringify({ type: 'INIT', ...getInitPayload() }));
        });
    }

    broadcast(type, data) {
        const message = JSON.stringify({ type, data });
        for (const client of this.#wss.clients) {
            if (client.readyState === client.OPEN) client.send(message);
        }
    }

    close() {
        for (const client of this.#wss.clients) client.terminate();
        return new Promise(resolve => this.#wss.close(() => resolve()));
    }
}
