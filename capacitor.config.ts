import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vivos.app',
  appName: 'VIVOS',
  webDir: 'public',
  server: {
    url: 'https://vivos-land.vercel.app',
    cleartext: false
  }
};

export default config;