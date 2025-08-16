import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { storageService, UserInstruction, UserPlanInfo } from './storage';
import OpenAI from "openai";
import { webSearchService } from '@/services/WebSearchService';

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
    const rawApiKey = storageService.getOpenAIKey();
    console.log('🔑 Raw API Key from storage:', rawApiKey ? `${rawApiKey.substring(0, 10)}...${rawApiKey.substring(rawApiKey.length-10)}` : 'null');
    console.log('🔑 API Key length:', rawApiKey?.length || 0);
    console.log('🔑 API Key starts with:', rawApiKey?.substring(0, 10) || 'none');
    
    if (!rawApiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }
    
    // APIキーをtrimして使用
    const apiKey = rawApiKey.trim();
    console.log('🔑 Trimmed API Key length:', apiKey.length);
    console.log('🔑 Trimmed API Key starts with:', apiKey.substring(0, 10));
    
    // APIキー形式チェック（より柔軟なパターン）
    const isValidFormat = /^sk-(proj-)?[a-zA-Z0-9_-]{20,}$/.test(apiKey);
    console.log('🔑 API Key format valid:', isValidFormat);
    console.log('🔑 API Key full length:', apiKey.length);
    console.log('🔑 API Key contains valid chars:', /^[a-zA-Z0-9_-]+$/.test(apiKey.substring(apiKey.indexOf('-') + 1)));
    
    // 基本的な形式チェック（sk-で始まることのみ必須）
    const basicFormat = apiKey.startsWith('sk-') && apiKey.length > 10;
    console.log('🔑 Basic format check:', basicFormat);
    
    if (!basicFormat) {
      throw new Error('APIキーは "sk-" で始まり、10文字以上である必要があります。');
    }
    
    if (!isValidFormat) {
      console.log('🔑 API Key detailed analysis:');
      console.log('  - Starts with sk-:', apiKey.startsWith('sk-'));
      console.log('  - Has proj- pattern:', apiKey.includes('proj-'));
      console.log('  - Total length:', apiKey.length);
      console.log('  - First 20 chars:', apiKey.substring(0, 20));
      
      // 警告として出力するが、エラーで止めない
      console.warn('⚠️ APIキー形式が想定と異なりますが、基本チェックを通過したため処理を続行します。');
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

    console.log(`OpenAI APIに送信するメッセージ (${planInfo.planDisplayName} - ${planInfo.modelUsed}):`, messages);

    try {
      // アクティブな指示でweb検索を使用するものがあるかチェック
      const activeInstructions = instructions.filter(inst => inst.isActive);
      const useWebSearch = planInfo.hasSearch && activeInstructions.some(inst => inst.useWebSearch);
      
      let aiResponse: string;

      if (useWebSearch) {
        // Web検索機能付きChat Completions APIを使用（Function Calling）
        console.log('🔍 Web検索機能付きChat Completions APIを使用します');
        
        // Web検索ツールの定義
        const tools = [{
          type: "function" as const,
          function: {
            name: "web_search",
            description: "Search the web for current information",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query"
                }
              },
              required: ["query"]
            }
          }
        }];
        
        const response = await client.chat.completions.create({
          model: planInfo.modelUsed,
          messages: messages,
          tools: tools,
          tool_choice: "auto",
          max_tokens: 500,
          temperature: 0.7,
        });

        const message = response.choices[0].message;
        
        // Function Callingが発生した場合
        if (message.tool_calls) {
          console.log('🔍 Web検索を実行中...');
          const toolResults = [];
          
          for (const toolCall of message.tool_calls) {
            if (toolCall.function.name === "web_search") {
              const args = JSON.parse(toolCall.function.arguments);
              console.log('🔍 検索クエリ:', args.query);
              
              // WebSearchServiceを使用して実際の検索を実行
              const searchResponse = await webSearchService.search(args.query);
              const formattedResults = webSearchService.formatResults(searchResponse);
              
              const searchResult = {
                query: args.query,
                results: formattedResults,
                timestamp: searchResponse.timestamp,
                provider: localStorage.getItem('web_search_provider') || 'mock'
              };
              
              toolResults.push({
                tool_call_id: toolCall.id,
                role: "tool" as const,
                content: JSON.stringify(searchResult)
              });
            }
          }
          
          // 検索結果を含めて再度APIを呼び出し
          const finalResponse = await client.chat.completions.create({
            model: planInfo.modelUsed,
            messages: [...messages, message, ...toolResults],
            max_tokens: 500,
            temperature: 0.7,
          });
          
          aiResponse = finalResponse.choices[0].message.content || "申し訳ございませんが、応答を生成できませんでした。";
        } else {
          aiResponse = message.content || "申し訳ございませんが、応答を生成できませんでした。";
        }
      } else {
        // 通常のChat Completions APIを使用
        console.log('💬 通常のChat Completions APIを使用します');
        
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
      console.error('OpenAI API エラー:', error);
      throw error;
    }
  }

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
