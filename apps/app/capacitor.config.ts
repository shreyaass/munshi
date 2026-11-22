import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.munshi.app',
  appName: 'Munshi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#0D0F12',
};

export default config;
