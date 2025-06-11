
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

  async sendToOpenAI(message: string, instructions: UserInstruction[]): Promise<string> {
    const apiKey = storageService.getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }

    const currentPlan = storageService.getCurrentPlan();
    const systemPrompt = this.buildSystemPrompt(instructions, currentPlan);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.currentConversation,
      { role: 'user', content: message }
    ];

    console.log('OpenAI APIに送信するメッセージ:', messages);

    try {
      const requestBody: any = {
        model: currentPlan.canUseSearchMode ? 'gpt-4' : 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7
      };

      // Premium users get search mode (web search capabilities)
      if (currentPlan.canUseSearchMode) {
        requestBody.tools = [
          {
            type: "function",
            function: {
              name: "search_web",
              description: "Search the web for current information like news, weather, or real-time data",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query to find current information"
                  }
                },
                required: ["query"]
              }
            }
          }
        ];
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API エラー: ${response.status}`);
      }

      const data = await response.json();
      let aiResponse = data.choices[0].message.content;

      // Handle tool calls for search mode (Premium feature)
      if (currentPlan.canUseSearchMode && data.choices[0].message.tool_calls) {
        const toolCall = data.choices[0].message.tool_calls[0];
        if (toolCall.function.name === 'search_web') {
          const searchQuery = JSON.parse(toolCall.function.arguments).query;
          const searchResult = await this.performWebSearch(searchQuery);
          
          // Send search result back to OpenAI for synthesis
          const followUpMessages = [
            ...messages,
            data.choices[0].message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: searchResult
            }
          ];

          const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: followUpMessages,
              max_tokens: 500,
              temperature: 0.7
            })
          });

          const followUpData = await followUpResponse.json();
          aiResponse = followUpData.choices[0].message.content;
        }
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

  private async performWebSearch(query: string): Promise<string> {
    // Simulated web search for demo purposes
    // In a real implementation, you would use a search API like Google Custom Search, Bing, etc.
    const searchResults = {
      weather: "今日の天気: 晴れ、気温20°C、湿度60%",
      news: "最新ニュース: 本日の主要ニュースをお伝えします。",
      time: `現在時刻: ${new Date().toLocaleString('ja-JP')}`
    };

    // Simple keyword matching for demo
    if (query.includes('天気') || query.includes('weather')) {
      return searchResults.weather;
    } else if (query.includes('ニュース') || query.includes('news')) {
      return searchResults.news;
    } else if (query.includes('時間') || query.includes('time')) {
      return searchResults.time;
    } else {
      return `検索結果: "${query}"に関する最新情報を取得しました。`;
    }
  }

  private buildSystemPrompt(instructions: UserInstruction[], plan: any): string {
    const activeInstructions = instructions
      .filter(inst => inst.isActive)
      .sort((a, b) => a.order - b.order)
      .map(inst => `${inst.title}: ${inst.content}`)
      .join('\n');

    let systemPrompt = `あなたは朝の目覚めをサポートするAIアシスタントです。

ユーザーの朝の行動をサポートするため、以下の指示内容を順番に実行してください：

${activeInstructions}

重要なルール：
1. 優しく、親しみやすい口調で話してください
2. 一度に一つの指示を出し、ユーザーの報告を待ってください
3. ユーザーが指示を完了したら、次の指示に進んでください
4. 励ましの言葉を適度に入れて、ユーザーのモチベーションを維持してください
5. 回答は簡潔に、1-2文程度にしてください
6. 全ての指示が完了したら、お疲れ様でしたと伝えて終了してください`;

    if (plan.canUseSearchMode) {
      systemPrompt += `

プレミアム機能：
- 天気、ニュース、時間などのリアルタイム情報が必要な場合は、search_web関数を使用してください
- ユーザーが天気やニュースについて質問した場合、最新情報を取得して回答してください`;
    }

    systemPrompt += "\n\n最初の指示から始めてください。";
    
    return systemPrompt;
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
