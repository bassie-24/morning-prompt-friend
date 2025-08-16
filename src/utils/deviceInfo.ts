import { Capacitor } from '@capacitor/core';

/**
 * デバイス情報を安全に取得するユーティリティ
 */
export class DeviceInfoService {
  private static instance: DeviceInfoService;

  private constructor() {}

  public static getInstance(): DeviceInfoService {
    if (!DeviceInfoService.instance) {
      DeviceInfoService.instance = new DeviceInfoService();
    }
    return DeviceInfoService.instance;
  }

  /**
   * iOSバージョンを取得
   */
  public async getIOSVersion(): Promise<string> {
    try {
      // ネイティブ環境でのみ実行
      if (!Capacitor.isNativePlatform()) {
        return '0';
      }

      // Capacitorが利用可能かチェック
      if (typeof window === 'undefined' || !window.Capacitor) {
        return '0';
      }

      // 動的インポートでDeviceプラグインを読み込み
      const deviceModule = await this.loadDeviceModule();
      if (!deviceModule) {
        return '0';
      }

      const deviceInfo = await deviceModule.Device.getInfo();
      return deviceInfo.osVersion || '0';
    } catch (error) {
      console.warn('Failed to get iOS version:', error);
      return '0';
    }
  }

  /**
   * Deviceモジュールを安全に読み込み
   */
  private async loadDeviceModule(): Promise<any> {
    try {
      // 実行時にのみモジュールの存在をチェック
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
        // ネイティブ環境でのみインポートを試行
        const deviceModule = await import('@capacitor/device');
        return deviceModule;
      }
      return null;
    } catch (error) {
      console.warn('Device module not available:', error);
      return null;
    }
  }
}

export default DeviceInfoService;