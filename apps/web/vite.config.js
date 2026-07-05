import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev keeps browser requests same-origin while forwarding /api to Express.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
