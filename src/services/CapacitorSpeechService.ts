import { getPlatformInfo, platformLog, isFeatureAvailable } from '@/utils/platformUtils';
import { storageService, UserInstruction } from '@/utils/storage';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import OpenAI from "openai";
import { webSearchService } from '@/services/WebSearchService';

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
  private currentConversation: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];

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
   * SpeechServiceとの互換性を保つためのspeak（Promise版）
   */
  async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        platformLog('Speech synthesis not available');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      
      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      this.synthesis.speak(utterance);
    });
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

  /**
   * SpeechServiceとの互換性を保つためのPromiseベースの音声認識
   */
  async startListening(): Promise<string> {
    platformLog('=== Capacitor startListening が呼び出されました ===');
    
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        platformLog('音声認識が利用できません');
        reject(new Error('音声認識がサポートされていません'));
        return;
      }

      // イベントハンドラーを設定
      this.setEventHandlers({
        onResult: (result) => {
          if (result.isFinal) {
            platformLog(`認識されたテキスト: ${result.transcript}`);
            resolve(result.transcript);
          }
        },
        onError: (error) => {
          platformLog(`音声認識エラー: ${error}`);
          reject(new Error(error));
        },
        onStart: () => {
          platformLog('音声認識が開始されました');
        }
      });

      // 音声認識開始
      this.startRecognition().catch(reject);
    });
  }

  /**
   * SpeechServiceとの互換性を保つためのOpenAI API統合
   */
  async sendToOpenAI(message: string, instructions: UserInstruction[]): Promise<string> {
    const rawApiKey = storageService.getOpenAIKey();
    platformLog('🔑 Raw API Key from storage:', rawApiKey ? `${rawApiKey.substring(0, 10)}...${rawApiKey.substring(rawApiKey.length-10)}` : 'null');
    
    if (!rawApiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }
    
    const apiKey = rawApiKey.trim();
    const basicFormat = apiKey.startsWith('sk-') && apiKey.length > 10;
    
    if (!basicFormat) {
      throw new Error('APIキーは "sk-" で始まり、10文字以上である必要があります。');
    }

    const client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, 
    });
    
    const planInfo = storageService.getUserPlanInfo();
    const systemPrompt = this.buildSystemPrompt(instructions);
    
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...this.currentConversation,
      { role: 'user', content: message }
    ];

    platformLog(`OpenAI APIに送信するメッセージ (${planInfo.planDisplayName} - ${planInfo.modelUsed}):`, messages);

    try {
      const activeInstructions = instructions.filter(inst => inst.isActive);
      const useWebSearch = planInfo.hasSearch && activeInstructions.some(inst => inst.useWebSearch);
      
      let aiResponse: string;

      if (useWebSearch) {
        platformLog('🔍 Responses APIでWeb検索機能を使用します');
        
        const response = await client.responses.create({
          model: planInfo.modelUsed,
          tools: [
            { type: "web_search_preview" },
          ],
          input: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
        });

        platformLog('🔄 Responses API レスポンス:', response);
        aiResponse = response.output_text || 'Responses APIから有効なレスポンスが取得できませんでした';
      } else {
        platformLog('💬 通常のChat Completions APIを使用します');
        
        const response = await client.chat.completions.create({
          model: planInfo.modelUsed,
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
        });

        aiResponse = response.choices[0].message.content || "申し訳ございませんが、応答を生成できませんでした。";
      }

      // 会話履歴を更新
      this.currentConversation.push(
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      );

      return aiResponse;
    } catch (error) {
      platformLog('OpenAI API エラー:', error);
      throw error;
    }
  }

  /**
   * システムプロンプトの構築
   */
  private buildSystemPrompt(instructions: UserInstruction[], hasExternalData: boolean = false): string {
    const activeInstructions = instructions
      .filter(inst => inst.isActive)
      .sort((a, b) => a.order - b.order)
      .map(inst => {
        let instructionText = `${inst.title}: ${inst.content}`;
        if (inst.useWebSearch) {
          instructionText += ' (必要に応じて最新情報を検索して回答)';
        }
        return instructionText;
      })
      .join('\n');

    const externalDataInfo = hasExternalData ? `

プレミアムプラン限定機能：
- 必要に応じて、最新のニュース、天気予報、日付/時刻情報を含めることができます
- 朝のスケジュールに関連する情報があれば積極的に提供してください
- ただし、実際の外部データにはアクセスできないため、一般的な情報や推測で回答してください` : '';

    return `あなたは朝の目覚めをサポートするAIアシスタントです。

ユーザーの朝の行動をサポートするため、以下の指示内容を順番に実行してください：

${activeInstructions}

重要なルール：
1. 優しく、親しみやすい口調で話してください
2. 一度に一つの指示を出し、ユーザーの報告を待ってください
3. ユーザーが指示を完了したら、次の指示に進んでください
4. 励ましの言葉を適度に入れて、ユーザーのモチベーションを維持してください
5. 回答は簡潔に、1-2文程度にしてください
6. 全ての指示が完了したら、お疲れ様でしたと伝えて終了してください
7. web検索機能が有効な指示では、必要に応じて最新の情報を検索して回答してください

最初の指示から始めてください。`;
  }

  /**
   * 会話履歴の取得
   */
  getConversationHistory() {
    return this.currentConversation;
  }

  /**
   * 会話履歴のリセット
   */
  resetConversation() {
    this.currentConversation = [];
  }

  /**
   * 音声認識状態のgetter（SpeechServiceとの互換性）
   */
  get listening() {
    return this.isListening;
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