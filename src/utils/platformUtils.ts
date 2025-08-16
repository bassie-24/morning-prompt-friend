import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device } from '@capacitor/device';

export interface PlatformInfo {
  isWeb: boolean;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  osVersion?: string;
}

/**
 * 現在のプラットフォーム情報を取得
 */
export const getPlatformInfo = (): PlatformInfo => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  // PWA判定（スタンドアローンモードまたはdisplay-mode: standalone）
  const isPWA = !isNative && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  return {
    isWeb: !isNative,
    isNative,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isPWA
  };
};

/**
 * 詳細なプラットフォーム情報を非同期で取得（OSバージョン含む）
 */
export const getPlatformInfoAsync = async (): Promise<PlatformInfo & { osVersion: string }> => {
  const basicInfo = getPlatformInfo();
  
  if (basicInfo.isNative) {
    try {
      const deviceInfo = await Device.getInfo();
      return {
        ...basicInfo,
        osVersion: deviceInfo.osVersion || '0'
      };
    } catch (error) {
      console.warn('Failed to get device info:', error);
      return {
        ...basicInfo,
        osVersion: '0'
      };
    }
  }
  
  return {
    ...basicInfo,
    osVersion: '0'
  };
};

/**
 * プラットフォーム固有の初期化処理
 */
export const initializePlatform = async (): Promise<void> => {
  const platform = getPlatformInfo();
  
  console.log('🎯 Platform Info:', platform);

  if (platform.isNative) {
    try {
      // スプラッシュスクリーンを隠す
      await SplashScreen.hide();
      console.log('✅ Splash screen hidden');

      // iOS用のステータスバー設定
      if (platform.isIOS) {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#87CEEB' });
        console.log('✅ iOS status bar configured');
      }

      // Android用のステータスバー設定
      if (platform.isAndroid) {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#87CEEB' });
        console.log('✅ Android status bar configured');
      }

    } catch (error) {
      console.warn('⚠️ Platform initialization failed:', error);
    }
  } else {
    console.log('🌐 Running in web mode');
  }
};

/**
 * 開発環境判定
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * プラットフォーム別のログ出力
 */
export const platformLog = (message: string, data?: any): void => {
  const platform = getPlatformInfo();
  const prefix = platform.isIOS ? '📱 iOS' : 
                 platform.isAndroid ? '🤖 Android' : 
                 platform.isPWA ? '🏠 PWA' : '🌐 Web';
  
  console.log(`${prefix}: ${message}`, data || '');
};

/**
 * ネイティブ機能の利用可能性チェック
 */
export const isFeatureAvailable = (feature: 'notifications' | 'speech' | 'haptics' | 'camera'): boolean => {
  const platform = getPlatformInfo();
  
  switch (feature) {
    case 'notifications':
      return platform.isNative || platform.isPWA;
    case 'speech':
      return true; // Web Speech API または Capacitor Speech
    case 'haptics':
      return platform.isNative;
    case 'camera':
      return platform.isNative;
    default:
      return false;
  }
};

export default {
  getPlatformInfo,
  initializePlatform,
  isDevelopment,
  platformLog,
  isFeatureAvailable
}; 