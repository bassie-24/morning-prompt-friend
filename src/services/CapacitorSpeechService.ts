import { getPlatformInfo, platformLog, isFeatureAvailable } from '@/utils/platformUtils';

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface SpeechSynthesisOptions {
  text: string;
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class CapacitorSpeechService {
  private static instance: CapacitorSpeechService;
  private recognition: any | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isSpeaking = false;

  // イベントハンドラー
  private onResultCallback?: (result: SpeechRecognitionResult) => void;
  private onEndCallback?: () => void;
  private onErrorCallback?: (error: string) => void;
  private onStartCallback?: () => void;

  private constructor() {
    this.initializeServices();
  }

  public static getInstance(): CapacitorSpeechService {
    if (!CapacitorSpeechService.instance) {
      CapacitorSpeechService.instance = new CapacitorSpeechService();
    }
    return CapacitorSpeechService.instance;
  }

  /**
   * 音声サービスの初期化
   */
  private initializeServices(): void {
    const platform = getPlatformInfo();
    
    try {
      // Web Speech API (全プラットフォームで利用可能)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognitionClass();
        platformLog('Speech Recognition initialized');
      }

      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        platformLog('Speech Synthesis initialized');
      }

      // Capacitor環境での追加初期化（将来の拡張用）
      if (platform.isNative) {
        this.initializeNativeSpeechFeatures();
      }

    } catch (error) {
      platformLog('Failed to initialize speech services:', error);
    }
  }

  /**
   * ネイティブ音声機能の初期化（将来の拡張用）
   */
  private async initializeNativeSpeechFeatures(): Promise<void> {
    try {
      // 将来的にCapacitor Speech pluginを使用する場合の実装場所
      platformLog('Native speech features ready for implementation');
    } catch (error) {
      platformLog('Native speech initialization failed:', error);
    }
  }

  /**
   * 音声認識の開始
   */
  public async startListening(options: SpeechRecognitionOptions = {}): Promise<boolean> {
    if (!this.recognition) {
      platformLog('Speech recognition not available');
      return false;
    }

    if (this.isListening) {
      platformLog('Speech recognition already running');
      return true;
    }

    try {
      // 設定の適用
      this.recognition.lang = options.language || 'ja-JP';
      this.recognition.continuous = options.continuous !== undefined ? options.continuous : false;
      this.recognition.interimResults = options.interimResults !== undefined ? options.interimResults : true;
      this.recognition.maxAlternatives = options.maxAlternatives || 1;

      // イベントリスナーの設定
      this.setupRecognitionListeners();

      // 認識開始
      this.recognition.start();
      this.isListening = true;
      
      platformLog('Speech recognition started');
      return true;

    } catch (error) {
      platformLog('Failed to start speech recognition:', error);
      return false;
    }
  }

  /**
   * 音声認識の停止
   */
  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      platformLog('Speech recognition stopped');
    }
  }

  /**
   * 音声合成（テキスト読み上げ）
   */
  public async speak(options: SpeechSynthesisOptions): Promise<boolean> {
    if (!this.synthesis) {
      platformLog('Speech synthesis not available');
      return false;
    }

    try {
      // 現在の音声を停止
      if (this.isSpeaking) {
        this.synthesis.cancel();
      }

      // 音声の作成
      const utterance = new SpeechSynthesisUtterance(options.text);
      
      // 設定の適用
      utterance.lang = options.language || 'ja-JP';
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 0.8;

      // イベントリスナー
      utterance.onstart = () => {
        this.isSpeaking = true;
        platformLog('Speech synthesis started');
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        platformLog('Speech synthesis ended');
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        platformLog('Speech synthesis error:', event.error);
      };

      // 音声の再生
      this.synthesis.speak(utterance);
      
      return true;

    } catch (error) {
      platformLog('Failed to speak:', error);
      return false;
    }
  }

  /**
   * 音声合成の停止
   */
  public stopSpeaking(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      platformLog('Speech synthesis cancelled');
    }
  }

  /**
   * 音声認識イベントリスナーの設定
   */
  private setupRecognitionListeners(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      platformLog('Speech recognition service started');
      this.onStartCallback?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const latestResult = results[results.length - 1];
      
      if (latestResult) {
        const transcript = latestResult[0].transcript.trim();
        const confidence = latestResult[0].confidence;
        const isFinal = latestResult.isFinal;

        const result: SpeechRecognitionResult = {
          transcript,
          confidence,
          isFinal
        };

        platformLog(`Speech result: "${transcript}" (confidence: ${confidence}, final: ${isFinal})`);
        this.onResultCallback?.(result);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      platformLog('Speech recognition ended');
      this.onEndCallback?.();
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      const errorMessage = `Speech recognition error: ${event.error}`;
      platformLog(errorMessage);
      this.onErrorCallback?.(errorMessage);
    };

    this.recognition.onnomatch = () => {
      platformLog('Speech recognition: no match found');
    };

    this.recognition.onsoundstart = () => {
      platformLog('Speech recognition: sound detected');
    };

    this.recognition.onsoundend = () => {
      platformLog('Speech recognition: sound ended');
    };
  }

  /**
   * イベントハンドラーの設定
   */
  public setEventHandlers(handlers: {
    onResult?: (result: SpeechRecognitionResult) => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
    onStart?: () => void;
  }): void {
    this.onResultCallback = handlers.onResult;
    this.onEndCallback = handlers.onEnd;
    this.onErrorCallback = handlers.onError;
    this.onStartCallback = handlers.onStart;
  }

  /**
   * 利用可能な音声一覧取得
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    
    return this.synthesis.getVoices().filter(voice => 
      voice.lang.startsWith('ja') || voice.lang.startsWith('en')
    );
  }

  /**
   * 音声認識状態の取得
   */
  public get isRecognitionActive(): boolean {
    return this.isListening;
  }

  /**
   * 音声合成状態の取得
   */
  public get isSynthesisActive(): boolean {
    return this.isSpeaking;
  }

  /**
   * 音声機能の利用可能性チェック
   */
  public static isAvailable(): boolean {
    const hasRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasSynthesis = 'speechSynthesis' in window;
    
    return hasRecognition && hasSynthesis;
  }

  /**
   * プラットフォーム情報付きのログ
   */
  private log(message: string, data?: any): void {
    platformLog(`[SpeechService] ${message}`, data);
  }
}

// グローバル型定義（TypeScript用）
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  
  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }
  
  interface SpeechRecognitionErrorEvent {
    error: string;
  }
}

export default CapacitorSpeechService; 