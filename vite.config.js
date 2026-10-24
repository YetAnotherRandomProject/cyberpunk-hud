import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = 'http://127.0.0.1:3000';

export default defineConfig({
    root: 'src/client',
    base: '/',
    plugins: [react()],
    build: {
        outDir: '../../dist/client',
        emptyOutDir: true
    },
    server: {
        port: 5173,
        proxy: {
            '/api': BACKEND,
            '/media': BACKEND,
            '/ws': { target: BACKEND, ws: true }
        }
    }
});
