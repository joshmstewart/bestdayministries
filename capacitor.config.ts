import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.bestdayministries.app',
  appName: 'Best Day Ministries',
  webDir: 'dist',
  // server: {
  //   // Enable this for development hot-reload from Lovable preview
  //   // Comment out for production builds
  //   url: 'https://609caef2-e036-416b-a2bc-d1430e40b6ba.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile'
  },
  android: {
    backgroundColor: '#ffffff'
  }
};

export default config;
