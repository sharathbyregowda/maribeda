import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Show update prompt instead of auto-updating
      includeAssets: [
        'maribeda-favicon.jpeg',
        'logo.png',
        'logo-dark.png',
        'icon-192.png',
        'icon-512.png',
        'apple-touch-icon.png',
        'sql-wasm.wasm' // Critical: Cache the WASM file for offline use
      ],
      manifest: {
        name: 'Maribeda',
        short_name: 'Maribeda',
        description: 'Your private digital diary. No cloud, no accounts.',
        start_url: '/',
        display: 'standalone',
        theme_color: '#4a90a4',
        background_color: '#f0f4f8',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'application/x-sqlite3': ['.sqlite', '.db']
            }
          }
        ],
        share_target: {
          action: '/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        }
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Cache sql.js WASM file - essential for offline
            urlPattern: /sql-wasm\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Cache fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ],
        // Precache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}']
      },
      devOptions: {
        enabled: false // Disable in dev to avoid caching issues
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['node_modules', 'dist', 'tests/**/*', '**/*.spec.ts'],
  },
})
