import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vivos.messenger',
  appName: 'VIVOS Messenger',
  webDir: 'public',
  server: {
    url: 'https://vivos-land.vercel.app/messenger',
    cleartext: false
  }
};

export default config;
