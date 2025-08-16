import { getPlatformInfo, platformLog } from '@/utils/platformUtils';
import { SpeechService } from '@/utils/speechService';
import { CapacitorSpeechService } from './CapacitorSpeechService';
import AlarmKitService from './AlarmKitService';
import NotificationService from './NotificationService';

/**
 * プラットフォーム対応サービスファクトリ
 * Web版とCapacitor版のサービスを適切に切り替える
 */
export class ServiceFactory {
  /**
   * 音声サービスを作成
   * プラットフォームに応じてWeb Speech APIまたはCapacitor版を返す
   */
  static createSpeechService(): SpeechService | CapacitorSpeechService {
    const platform = getPlatformInfo();
    
    if (platform.isNative) {
      platformLog('Capacitor音声サービスを使用します');
      return CapacitorSpeechService.getInstance();
    } else {
      platformLog('Web音声サービスを使用します');
      return new SpeechService();
    }
  }

  /**
   * アラームサービスを作成
   * iOS 26.0+でAlarmKit、それ以外でNotificationServiceを返す
   */
  static async createAlarmService(): Promise<AlarmKitService | NotificationService> {
    const platform = getPlatformInfo();
    
    if (platform.isNative && platform.isIOS) {
      // AlarmKitの利用可能性を確認
      const alarmKitService = AlarmKitService.getInstance();
      const isAvailable = await alarmKitService.initialize();
      
      if (isAvailable) {
        platformLog('AlarmKitサービスを使用します');
        return alarmKitService;
      } else {
        platformLog('AlarmKit利用不可、NotificationServiceにフォールバック');
      }
    }
    
    // フォールバック：従来のNotificationService
    platformLog('NotificationServiceを使用します');
    return NotificationService.getInstance();
  }

  /**
   * プラットフォーム情報をログ出力
   */
  static logPlatformInfo(): void {
    const platform = getPlatformInfo();
    platformLog('Platform Info:', {
      isWeb: platform.isWeb,
      isNative: platform.isNative,
      isIOS: platform.isIOS,
      isAndroid: platform.isAndroid,
      isPWA: platform.isPWA
    });
  }
}

export default ServiceFactory;