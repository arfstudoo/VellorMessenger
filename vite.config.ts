
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: './', // Removed for Capacitor compatibility (standard root is safer)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
