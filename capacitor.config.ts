import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bibleforlifestages',
  appName: 'LifeStages Bible',
  
  // CRITICAL: Bundle from local static export, NOT a remote URL
  // This is what Apple requires — the app ships with its own UI
  webDir: 'out',
  
  // NO server.url — that's the "lazy wrapper" approach Apple rejects
  // API calls go to Vercel via NEXT_PUBLIC_API_BASE_URL in env
  
  plugins: {
    CapacitorHttp: { enabled: true },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#0c1929',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
      spinnerColor: '#f59e0b',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c1929',
    },
    Haptics: {
      // Enabled by default
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
  },
  
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'lifestages',
    backgroundColor: '#0c1929',
  },
  
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0c1929',
  },
};

export default config;
