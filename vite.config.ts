
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron to find assets
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    // Required for container deployments (Cloud Run, Docker, etc.)
    host: true, // Listen on 0.0.0.0
    port: Number(process.env.PORT) || 8080,
    allowedHosts: true, 
  }
});
