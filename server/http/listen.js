const MAX_PORT_ATTEMPTS = 20;

// Écoute sur `preferredPort`, ou sur le premier port libre suivant s'il est déjà pris.
export async function listenWithFallback(httpServer, preferredPort, host) {
    for (let port = preferredPort; port < preferredPort + MAX_PORT_ATTEMPTS; port++) {
        try {
            await listenOnce(httpServer, port, host);
            return port;
        } catch (err) {
            if (err.code !== 'EADDRINUSE') throw err;
            console.warn(`[SERVEUR] Port ${port} déjà utilisé, essai du suivant...`);
        }
    }
    throw new Error(`Aucun port libre entre ${preferredPort} et ${preferredPort + MAX_PORT_ATTEMPTS - 1}`);
}

function listenOnce(httpServer, port, host) {
    return new Promise((resolve, reject) => {
        const onError = err => {
            httpServer.off('listening', onListening);
            reject(err);
        };
        const onListening = () => {
            httpServer.off('error', onError);
            resolve();
        };
        httpServer.once('error', onError);
        httpServer.once('listening', onListening);
        httpServer.listen(port, host);
    });
}
