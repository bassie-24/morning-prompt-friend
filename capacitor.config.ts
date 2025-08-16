import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.morningai.assistant',
  appName: '朝のAIアシスタント',
  webDir: 'dist',
  server: {
    // 開発時のHot Reload設定
    url: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : undefined,
    cleartext: true,
    // macOSからも接続できるように
    hostname: process.env.CAPACITOR_DEV_HOST || 'localhost'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#87CEEB",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    AlarmKitPlugin: {
      // AlarmKit用の設定（必要に応じて追加）
    },
  },
  ios: {
    scheme: 'Morning AI Assistant',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  }
};

export default config;
