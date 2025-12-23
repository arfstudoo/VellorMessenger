import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vellor.messenger',
  appName: 'Vellor',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
