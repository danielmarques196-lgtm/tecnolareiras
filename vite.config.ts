/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Herdade da Coroa',
        short_name: 'H. Coroa',
        description: 'Gestão agrícola da Herdade da Coroa — caderno de campo, rega, solo e água, vendas e clima.',
        lang: 'pt-PT',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f4ef',
        theme_color: '#7a1f2b',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        runtimeCaching: [
          {
            // Open-Meteo: rede primeiro, cache como recurso offline (a app também guarda em IndexedDB)
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'open-meteo', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
        ],
      },
    }),
  ],
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
