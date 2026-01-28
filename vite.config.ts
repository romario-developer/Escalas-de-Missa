import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'robots.txt'],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'App Escalas',
        short_name: 'Escalas',
        description: 'Gerador e exportador de escalas de missa',
        theme_color: '#f7efe6',
        background_color: '#ffffff',
        lang: 'pt-BR',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
});
