import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // Served from qingshengnangong.com/scholarmind/. No key is baked in: visitors bind their own.
      base: '/scholarmind/',
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            // The server's mime.types has no .mjs, and module workers need a JS type: ship pdf.js's worker as .js
            assetFileNames: (info) => (info.names?.[0] || info.name || '').endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]',
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
