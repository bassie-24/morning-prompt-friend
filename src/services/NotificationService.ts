import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getPlatformInfo, platformLog, isFeatureAvailable } from '@/utils/platformUtils';

export interface AlarmOptions {
  id: number;
  title: string;
  body: string;
  at?: Date;
  scheduledTime?: Date; // 後方互換性のため
  sound?: string;
  soundName?: string; // 後方互換性のため
  enableVibration?: boolean;
  persistent?: boolean;
  repeats?: boolean;
  every?: 'day' | 'week' | 'month' | 'year';
  count?: number;
  actionTypeId?: string;
  extra?: any;
}

export interface NotificationPermissionResult {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private permissionGranted = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 通知サービスの初期化
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.permissionGranted;
    }

    try {
      const platform = getPlatformInfo();
      platformLog('Initializing notification service...');

      if (!isFeatureAvailable('notifications')) {
        platformLog('Notifications not available on this platform');
        return false;
      }

      // 権限のリクエスト
      const permission = await this.requestPermissions();
      if (!permission.granted) {
        platformLog('Notification permission denied');
        return false;
      }

      this.permissionGranted = true;

      // 通知リスナーの設定
      await this.setupNotificationListeners();

      this.isInitialized = true;
      platformLog('Notification service initialized successfully');
      return true;

    } catch (error) {
      platformLog('Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * 通知権限のリクエスト
   */
  public async requestPermissions(): Promise<NotificationPermissionResult> {
    try {
      const platform = getPlatformInfo();

      if (platform.isNative) {
        // Capacitor環境での権限リクエスト
        const result = await LocalNotifications.requestPermissions();
        return {
          granted: result.display === 'granted',
          denied: result.display === 'denied',
          prompt: result.display === 'prompt'
        };
      } else {
        // Web/PWA環境での権限リクエスト
        const permission = await Notification.requestPermission();
        return {
          granted: permission === 'granted',
          denied: permission === 'denied',
          prompt: permission === 'default'
        };
      }
    } catch (error) {
      platformLog('Failed to request notification permissions:', error);
      return { granted: false, denied: true, prompt: false };
    }
  }

  /**
   * アラーム通知のスケジュール
   */
  public async scheduleAlarm(options: AlarmOptions): Promise<boolean> {
    if (!this.permissionGranted) {
      platformLog('Notification permission not granted');
      return false;
    }

    try {
      const platform = getPlatformInfo();
      const scheduleTime = options.at || options.scheduledTime;
      
      if (!scheduleTime) {
        platformLog('No schedule time provided');
        return false;
      }
      
      if (platform.isNative) {
        // Capacitor環境でのローカル通知
        const notificationOptions: any = {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: { at: scheduleTime },
          sound: options.sound || options.soundName || 'default',
          actionTypeId: options.actionTypeId || 'ALARM_ACTION',
          attachments: undefined,
          extra: options.extra || {
            type: 'alarm',
            persistent: options.persistent || false
          }
        };

        // 繰り返し設定
        if (options.repeats && options.every) {
          notificationOptions.schedule.every = options.every;
          if (options.count) {
            notificationOptions.schedule.count = options.count;
          }
        }

        await LocalNotifications.schedule({
          notifications: [notificationOptions]
        });

        platformLog(`Alarm scheduled for ${scheduleTime.toLocaleString()}`);
      } else {
        // Web/PWA環境での通知（実行時のみ）
        const timeUntilAlarm = scheduleTime.getTime() - Date.now();
        
        if (timeUntilAlarm > 0) {
          setTimeout(() => {
            this.showWebNotification(options);
          }, timeUntilAlarm);
          
          platformLog(`Web alarm scheduled for ${scheduleTime.toLocaleString()}`);
        } else {
          // 即座に通知
          await this.showWebNotification(options);
        }
      }

      return true;
    } catch (error) {
      platformLog('Failed to schedule alarm:', error);
      return false;
    }
  }

  /**
   * 複数段階のアラーム通知（persistent風の実装）
   */
  public async schedulePersistentAlarm(baseOptions: AlarmOptions): Promise<boolean> {
    const stages = [
      { delay: 0, title: `🌅 ${baseOptions.title}`, sound: 'gentle.wav' },
      { delay: 30000, title: `⏰ ${baseOptions.title} - 30秒経過`, sound: 'medium.wav' },
      { delay: 60000, title: `🚨 ${baseOptions.title} - 1分経過`, sound: 'urgent.wav' },
      { delay: 120000, title: `🔥 ${baseOptions.title} - 2分経過！`, sound: 'alarm.wav' },
    ];

    let success = true;
    for (const [index, stage] of stages.entries()) {
      const stageTime = new Date(baseOptions.scheduledTime.getTime() + stage.delay);
      const stageOptions: AlarmOptions = {
        ...baseOptions,
        id: baseOptions.id * 10 + index,
        title: stage.title,
        scheduledTime: stageTime,
        soundName: stage.sound,
        persistent: true
      };

      const result = await this.scheduleAlarm(stageOptions);
      if (!result) success = false;
    }

    return success;
  }

  /**
   * Web環境での通知表示
   */
  private async showWebNotification(options: AlarmOptions): Promise<void> {
    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/placeholder.svg',
        badge: '/placeholder.svg',
        tag: `alarm-${options.id}`,
        requireInteraction: options.persistent || true
      });

      // Web Vibration APIを別途実行
      if (options.enableVibration && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // 通知クリック時の処理
      notification.onclick = () => {
        window.focus();
        notification.close();
        platformLog('Alarm notification clicked');
        
        // アラームのextraデータに基づいて処理
        if (options.extra?.autoStart) {
          // 自動的に通話を開始する処理をトリガー
          window.dispatchEvent(new CustomEvent('alarmTriggered', { 
            detail: { alarmId: options.extra.alarmId, autoStart: true }
          }));
        }
      };

      // 自動音声再生（可能な場合）
      const soundFile = options.sound || options.soundName;
      if (soundFile) {
        this.playAlarmSound(soundFile);
      }

    } catch (error) {
      platformLog('Failed to show web notification:', error);
    }
  }

  /**
   * アラーム音声の再生
   */
  private async playAlarmSound(soundName: string): Promise<void> {
    try {
      // カスタムサウンドファイルのパスを構築
      let soundPath = '';
      if (soundName === 'default') {
        soundPath = '/sounds/default-alarm.mp3';
      } else if (soundName === 'alarm_custom.wav' || soundName === 'custom') {
        soundPath = '/sounds/alarm_custom.wav';
      } else if (soundName.includes('/')) {
        soundPath = soundName; // フルパスが指定されている場合
      } else {
        soundPath = `/sounds/${soundName}`;
      }
      
      const audio = new Audio(soundPath);
      audio.volume = 0.8;
      audio.loop = false;
      
      // 30秒のカスタムアラーム音の場合はループ設定
      if (soundName.includes('custom')) {
        audio.loop = true;
        // 30秒後に停止
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 30000);
      }
      
      // ユーザーインタラクション後の再生を試行
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          platformLog('Audio play failed (user interaction required):', error);
        });
      }
    } catch (error) {
      platformLog('Failed to play alarm sound:', error);
    }
  }

  /**
   * バイブレーション実行
   */
  public async vibrate(pattern?: number[]): Promise<void> {
    const platform = getPlatformInfo();
    
    try {
      if (platform.isNative && isFeatureAvailable('haptics')) {
        // Capacitorハプティクス
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await new Promise(resolve => setTimeout(resolve, 200));
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if ('vibrate' in navigator) {
        // Web Vibration API
        navigator.vibrate(pattern || [200, 100, 200, 100, 200]);
      }
    } catch (error) {
      platformLog('Vibration failed:', error);
    }
  }

  /**
   * 通知をキャンセル
   */
  public async cancelAlarm(id: number): Promise<boolean> {
    try {
      const platform = getPlatformInfo();
      
      if (platform.isNative) {
        await LocalNotifications.cancel({ notifications: [{ id }] });
      }
      
      platformLog(`Alarm ${id} cancelled`);
      return true;
    } catch (error) {
      platformLog('Failed to cancel alarm:', error);
      return false;
    }
  }

  /**
   * 通知リスナーの設定
   */
  private async setupNotificationListeners(): Promise<void> {
    const platform = getPlatformInfo();
    
    if (platform.isNative) {
      // 通知がタップされた時の処理
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        platformLog('Notification action performed:', notification);
        
        if (notification.notification.extra?.type === 'alarm') {
          // アラーム通知の場合の特別な処理
          this.vibrate();
          window.dispatchEvent(new CustomEvent('alarmTriggered', {
            detail: { id: notification.notification.id }
          }));
        }
      });

      // 通知が受信された時の処理（フォアグラウンド）
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        platformLog('Notification received:', notification);
      });
    }
  }

  /**
   * 保留中の通知一覧取得
   */
  public async getPendingNotifications(): Promise<any[]> {
    try {
      const platform = getPlatformInfo();
      
      if (platform.isNative) {
        const result = await LocalNotifications.getPending();
        return result.notifications;
      }
      
      return [];
    } catch (error) {
      platformLog('Failed to get pending notifications:', error);
      return [];
    }
  }
}

export default NotificationService; 