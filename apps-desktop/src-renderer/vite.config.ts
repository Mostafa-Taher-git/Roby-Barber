import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Electron loads the build via file:// — asset URLs must be relative, not /assets
  base: './',
  plugins: [react()],
})
