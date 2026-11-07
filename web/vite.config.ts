import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
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
