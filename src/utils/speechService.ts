
import { storageService, UserInstruction, PLAN_LIMITS } from './storage';

// Web Speech API の型宣言
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class SpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private currentConversation: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    console.log('音声認識を初期化中...');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'ja-JP';
      console.log('音声認識が初期化されました');
    } else {
      console.error('音声認識がサポートされていません');
    }
  }

  async startListening(): Promise<string> {
    console.log('=== startListening が呼び出されました ===');
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        console.error('音声認識が利用できません');
        reject(new Error('音声認識がサポートされていません'));
        return;
      }

      console.log('音声認識を開始します...');
      console.log('マイクの許可状況を確認中...');
      
      // ブラウザのマイク許可を確認
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('マイクのアクセス許可が取得できました');
          this.startRecognition(resolve, reject);
        })
        .catch((error) => {
          console.error('マイクのアクセス許可が取得できませんでした:', error);
          reject(new Error('マイクのアクセス許可が必要です'));
        });
    });
  }

  private startRecognition(resolve: (value: string) => void, reject: (reason?: any) => void) {
    if (!this.recognition) return;

    this.isListening = true;
    
    // 既存のイベントハンドラーをクリア
    this.recognition.onresult = null;
    this.recognition.onerror = null;
    this.recognition.onend = null;
    this.recognition.onstart = null;

    this.recognition.onstart = () => {
      console.log('✅ 音声認識が正常に開始されました');
    };

    this.recognition.onresult = (event) => {
      console.log('🎤 音声認識結果を受信:', event);
      const transcript = event.results[0][0].transcript;
      console.log('📝 認識されたテキスト:', transcript);
      console.log('🎯 信頼度:', event.results[0][0].confidence);
      this.isListening = false;
      resolve(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('❌ 音声認識エラー:', event.error, event.message);
      this.isListening = false;
      reject(new Error(`音声認識エラー: ${event.error}`));
    };

    this.recognition.onend = () => {
      console.log('🔚 音声認識が終了しました');
      this.isListening = false;
    };

    try {
      console.log('🚀 recognition.start() を実行します...');
      this.recognition.start();
      console.log('✨ recognition.start() が正常に実行されました');
    } catch (error) {
      console.error('💥 音声認識の開始に失敗:', error);
      this.isListening = false;
      reject(error);
    }
  }

  async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      
      utterance.onend = () => {
        resolve();
      };

      this.synthesis.speak(utterance);
    });
  }

  async sendToOpenAI(message: string, instructions: UserInstruction[]): Promise<string> {
    const apiKey = storageService.getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }

    const currentPlan = storageService.getUserPlan();
    const planLimits = PLAN_LIMITS[currentPlan.type];
    const systemPrompt = this.buildSystemPrompt(instructions, planLimits.hasExternalData);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.currentConversation,
      { role: 'user', content: message }
    ];

    console.log('OpenAI APIに送信するメッセージ:', messages);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages,
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API エラー: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // 会話履歴を更新
      this.currentConversation.push(
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      );

      return aiResponse;
    } catch (error) {
      console.error('OpenAI API エラー:', error);
      throw error;
    }
  }

  private buildSystemPrompt(instructions: UserInstruction[], hasExternalData: boolean = false): string {
    const activeInstructions = instructions
      .filter(inst => inst.isActive)
      .sort((a, b) => a.order - b.order)
      .map(inst => `${inst.title}: ${inst.content}`)
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
6. 全ての指示が完了したら、お疲れ様でしたと伝えて終了してください${externalDataInfo}

最初の指示から始めてください。`;
  }

  getConversationHistory() {
    return this.currentConversation;
  }

  resetConversation() {
    this.currentConversation = [];
  }

  get listening() {
    return this.isListening;
  }
}
