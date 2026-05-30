import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path' // Para gumana ang "@" alias pathing

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // React plugin lang, sapat na!
  ],
  resolve: {
    alias: {
      // Para maintindihan ni Vite kung ano ang ibig sabihin ng "@/" sa mga imports mo
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    // Pinipilit si Vite na basahin ang postcss.config.js para sa Tailwind
    postcss: './postcss.config.js',
  },
});