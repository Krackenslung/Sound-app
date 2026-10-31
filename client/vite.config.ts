/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Codespaces serves the dev server on https://<name>-5173.<domain>; Vite
// rejects unknown Host headers unless they're allowed.
const codespacesDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const allowedHosts = codespacesDomain ? [`.${codespacesDomain}`] : [];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@fixtures': fileURLToPath(new URL('../fixtures', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts,
    // Demo-mode fixtures live in /fixtures at the repo root.
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false },
    },
  },
  // `vite preview` (production build) talks to the same local API.
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false } },
  },
  build: {
    // Keep fonts as files: the CSP's font-src is 'self' (no data: URIs).
    assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
    outDir: '../server/public',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Most tests cover the login page; the skip-login default has its own tests.
    env: { VITE_SHOW_LOGIN: 'true' },
  },
});
