
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Helper to check if a package is installed
const isPackageInstalled = (name: string) => {
  try {
    require.resolve(name);
    return true;
  } catch (e) {
    return false;
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // If the real package isn't found, use the mock file
      '@capacitor/push-notifications': isPackageInstalled('@capacitor/push-notifications') 
        ? '@capacitor/push-notifications' 
        : path.resolve(__dirname, 'utils/capacitor-mock.ts'),
      '@capacitor/app': isPackageInstalled('@capacitor/app') 
        ? '@capacitor/app' 
        : path.resolve(__dirname, 'utils/capacitor-mock.ts'),
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
