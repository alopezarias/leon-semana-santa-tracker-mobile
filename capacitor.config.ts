import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leonsemanasanta.tracker',
  appName: 'Leon Semana Santa',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
