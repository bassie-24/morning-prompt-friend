import { registerPlugin } from '@capacitor/core';
import { getPlatformInfo, platformLog } from '@/utils/platformUtils';

export interface AlarmKitPlugin {
  requestAuthorization(): Promise<{ authorized: boolean }>;
  scheduleAlarm(options: {
    id: string;
    title: string;
    body: string;
    date?: string; // ISO8601 format for fixed schedule
    time?: string; // HH:MM format for relative schedule
    weekdays?: number[]; // 0=Sunday, 1=Monday, etc.
    countdown?: number; // seconds
    enableSnooze?: boolean;
  }): Promise<{ success: boolean }>;
  cancelAlarm(options: { id: string }): Promise<{ success: boolean }>;
  pauseAlarm(options: { id: string }): Promise<{ success: boolean }>;
  resumeAlarm(options: { id: string }): Promise<{ success: boolean }>;
  getAlarms(): Promise<{ alarms: AlarmInfo[] }>;
}

export interface AlarmInfo {
  id: string;
  state: 'scheduled' | 'alerting' | 'paused';
  schedule: {
    type: 'fixed' | 'relative';
    date?: string;
    time?: string;
    recurrence?: 'never' | 'weekly';
    weekdays?: number[];
  };
}

const AlarmKitPlugin = registerPlugin<AlarmKitPlugin>('AlarmKitPlugin');

export class AlarmKitService {
  private static instance: AlarmKitService;
  private isAvailable = false;
  private isAuthorized = false;

  private constructor() {}

  public static getInstance(): AlarmKitService {
    if (!AlarmKitService.instance) {
      AlarmKitService.instance = new AlarmKitService();
    }
    return AlarmKitService.instance;
  }

  /**
   * AlarmKitサービスの初期化
   */
  public async initialize(): Promise<boolean> {
    try {
      const platform = getPlatformInfo();
      
      // AlarmKitはiOS 26.0+でのみ利用可能
      if (!platform.isNative || !platform.isIOS) {
        platformLog('AlarmKit is only available on iOS native platform');
        return false;
      }
      
      // iOS バージョンチェック（iOS 26.0+必要）
      const iosVersion = await this.getIOSVersion();
      if (iosVersion < 26.0) {
        platformLog(`AlarmKit requires iOS 26.0+, current version: ${iosVersion}`);
        return false;
      }

      // 認証確認
      const authResult = await AlarmKitPlugin.requestAuthorization();
      this.isAuthorized = authResult.authorized;
      
      if (!this.isAuthorized) {
        platformLog('AlarmKit authorization denied');
        return false;
      }

      this.isAvailable = true;
      platformLog('AlarmKit service initialized successfully');
      return true;

    } catch (error) {
      platformLog('Failed to initialize AlarmKit service:', error);
      return false;
    }
  }

  /**
   * アラームのスケジュール
   */
  public async scheduleAlarm(options: {
    id: string;
    title: string;
    body: string;
    time: string; // HH:MM
    weekdays?: number[];
    enableSnooze?: boolean;
  }): Promise<boolean> {
    if (!this.isAvailable) {
      throw new Error('AlarmKit service not available');
    }

    try {
      const result = await AlarmKitPlugin.scheduleAlarm({
        id: options.id,
        title: options.title,
        body: options.body,
        time: options.time,
        weekdays: options.weekdays,
        enableSnooze: options.enableSnooze
      });

      platformLog(`AlarmKit alarm scheduled: ${options.id}`);
      return result.success;
    } catch (error) {
      platformLog('Failed to schedule AlarmKit alarm:', error);
      throw error;
    }
  }

  /**
   * 固定日時でのアラームスケジュール
   */
  public async scheduleFixedAlarm(options: {
    id: string;
    title: string;
    body: string;
    date: Date;
    enableSnooze?: boolean;
  }): Promise<boolean> {
    if (!this.isAvailable) {
      throw new Error('AlarmKit service not available');
    }

    try {
      const result = await AlarmKitPlugin.scheduleAlarm({
        id: options.id,
        title: options.title,
        body: options.body,
        date: options.date.toISOString(),
        enableSnooze: options.enableSnooze
      });

      return result.success;
    } catch (error) {
      platformLog('Failed to schedule fixed AlarmKit alarm:', error);
      throw error;
    }
  }

  /**
   * アラームのキャンセル
   */
  public async cancelAlarm(id: string): Promise<boolean> {
    if (!this.isAvailable) {
      throw new Error('AlarmKit service not available');
    }

    try {
      const result = await AlarmKitPlugin.cancelAlarm({ id });
      platformLog(`AlarmKit alarm cancelled: ${id}`);
      return result.success;
    } catch (error) {
      platformLog('Failed to cancel AlarmKit alarm:', error);
      throw error;
    }
  }

  /**
   * アラームの一時停止
   */
  public async pauseAlarm(id: string): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const result = await AlarmKitPlugin.pauseAlarm({ id });
      return result.success;
    } catch (error) {
      platformLog('Failed to pause AlarmKit alarm:', error);
      return false;
    }
  }

  /**
   * アラームの再開
   */
  public async resumeAlarm(id: string): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const result = await AlarmKitPlugin.resumeAlarm({ id });
      return result.success;
    } catch (error) {
      platformLog('Failed to resume AlarmKit alarm:', error);
      return false;
    }
  }

  /**
   * 全アラームの取得
   */
  public async getAlarms(): Promise<AlarmInfo[]> {
    if (!this.isAvailable) {
      return [];
    }

    try {
      const result = await AlarmKitPlugin.getAlarms();
      return result.alarms;
    } catch (error) {
      platformLog('Failed to get AlarmKit alarms:', error);
      return [];
    }
  }

  /**
   * サービスの利用可能性チェック
   */
  public isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * 認証状態の確認
   */
  public isServiceAuthorized(): boolean {
    return this.isAuthorized;
  }

  /**
   * iOSバージョンの取得
   */
  private async getIOSVersion(): Promise<number> {
    try {
      const platform = getPlatformInfo();
      if (platform.isIOS && platform.osVersion) {
        const version = parseFloat(platform.osVersion);
        return isNaN(version) ? 0 : version;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

export default AlarmKitService;