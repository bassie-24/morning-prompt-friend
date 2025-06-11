import { storageService, UserInstruction } from './storage';

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

  async sendToOpenAI(message: string, instructions: UserInstruction[], useRealtimeAI: boolean = false): Promise<string> {
    const apiKey = storageService.getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }

    const systemPrompt = this.buildSystemPrompt(instructions, useRealtimeAI);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.currentConversation,
      { role: 'user', content: message }
    ];

    console.log('OpenAI APIに送信するメッセージ:', messages);

    try {
      const model = useRealtimeAI ? 'gpt-4-1106-preview' : 'gpt-4';
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 500,
          temperature: 0.7,
          ...(useRealtimeAI && {
            tools: [
              {
                type: 'function',
                function: {
                  name: 'get_current_weather',
                  description: '現在の天気情報を取得します',
                  parameters: {
                    type: 'object',
                    properties: {
                      location: {
                        type: 'string',
                        description: '場所（例：東京）'
                      }
                    },
                    required: ['location']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'get_current_news',
                  description: '最新のニュース情報を取得します',
                  parameters: {
                    type: 'object',
                    properties: {
                      topic: {
                        type: 'string',
                        description: 'ニュースのトピック（例：一般、経済、スポーツ）'
                      }
                    }
                  }
                }
              }
            ]
          })
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API エラー: ${response.status}`);
      }

      const data = await response.json();
      let aiResponse = data.choices[0].message.content;

      // Function calling の処理
      if (useRealtimeAI && data.choices[0].message.tool_calls) {
        const toolCall = data.choices[0].message.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let functionResult = '';
        if (functionName === 'get_current_weather') {
          functionResult = await this.getCurrentWeather(functionArgs.location);
        } else if (functionName === 'get_current_news') {
          functionResult = await this.getCurrentNews(functionArgs.topic);
        }

        // Function結果を含めて再度APIを呼び出し
        const followUpMessages = [
          ...messages,
          data.choices[0].message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: functionResult
          }
        ];

        const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: followUpMessages,
            max_tokens: 500,
            temperature: 0.7
          })
        });

        const followUpData = await followUpResponse.json();
        aiResponse = followUpData.choices[0].message.content;
      }

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

  private async getCurrentWeather(location: string): Promise<string> {
    // 簡単な天気情報のモック（実際のAPIを使用する場合はここで実装）
    const weatherData = {
      '東京': '晴れ、気温20度、湿度60%',
      '大阪': '曇り、気温18度、湿度70%',
      '名古屋': '雨、気温16度、湿度80%'
    };
    
    return weatherData[location] || `${location}の天気情報: 晴れ、気温19度、湿度65%`;
  }

  private async getCurrentNews(topic?: string): Promise<string> {
    // 簡単なニュース情報のモック（実際のAPIを使用する場合はここで実装）
    const newsData = {
      '一般': '今日の主要ニュース: 新しい政策が発表されました。',
      '経済': '経済ニュース: 株価が上昇傾向にあります。',
      'スポーツ': 'スポーツニュース: 野球の試合結果が発表されました。'
    };
    
    return newsData[topic || '一般'] || '最新ニュース: 今日は穏やかな一日になりそうです。';
  }

  private buildSystemPrompt(instructions: UserInstruction[], useRealtimeAI: boolean = false): string {
    const activeInstructions = instructions
      .filter(inst => inst.isActive)
      .sort((a, b) => a.order - b.order)
      .map(inst => `${inst.title}: ${inst.content}`)
      .join('\n');

    const realtimeInfo = useRealtimeAI ? 
      '\n\n特別機能: 必要に応じて現在の天気やニュース情報を取得できます。ユーザーが天気や最新情報について聞いた場合は、適切な関数を呼び出してください。' : '';

    return `あなたは朝の目覚めをサポートするAIアシスタントです。

ユーザーの朝の行動をサポートするため、以下の指示内容を順番に実行してください：

${activeInstructions}

重要なルール：
1. 優しく、親しみやすい口調で話してください
2. 一度に一つの指示を出し、ユーザーの報告を待ってください
3. ユーザーが指示を完了したら、次の指示に進んでください
4. 励ましの言葉を適度に入れて、ユーザーのモチベーションを維持してください
5. 回答は簡潔に、1-2文程度にしてください
6. 全ての指示が完了したら、お疲れ様でしたと伝えて終了してください${realtimeInfo}

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
