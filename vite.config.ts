import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  clearScreen: false,
  server: { port: 8790, host: '127.0.0.1', strictPort: false },
  preview: { port: 8791, host: '127.0.0.1' },
  build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 1600 },
});
