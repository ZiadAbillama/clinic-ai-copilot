import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server runs on port 3000 and proxies API calls to the Express backend.
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
