import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // dev server only: under `vite build` DevTools keeps an analysis server open and the build never exits
  devtools: { apply: 'serve', embeddedVisibility: 'passive' },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        // API_URL points the dev server at another API, e.g. one running on a demo database
        target: process.env.API_URL ?? 'http://localhost:3000',
      },
    },
  },
})
