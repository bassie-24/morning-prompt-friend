import { getPlatformInfo, platformLog } from '@/utils/platformUtils';
import { SpeechService } from '@/utils/speechService';
import { CapacitorSpeechService } from './CapacitorSpeechService';

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