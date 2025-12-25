import { defineConfig } from 'vite';

export default defineConfig({
  base: '/incremental-lumberjack/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext' // Support top-level await
  }
});

