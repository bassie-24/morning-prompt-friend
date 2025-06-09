
import '../types/speech.d.ts';
import { storageService, UserInstruction } from './storage';

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private currentConversation: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'ja-JP';
    }
  }

  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('音声認識がサポートされていません'));
        return;
      }

      this.isListening = true;
      this.recognition.start();

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        console.log('認識されたテキスト:', transcript);
        resolve(transcript);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        console.error('音声認識エラー:', event.error);
        reject(new Error(`音声認識エラー: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    });
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

    const systemPrompt = this.buildSystemPrompt(instructions);
    
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

  private buildSystemPrompt(instructions: UserInstruction[]): string {
    const activeInstructions = instructions
      .filter(inst => inst.isActive)
      .sort((a, b) => a.order - b.order)
      .map(inst => `${inst.title}: ${inst.content}`)
      .join('\n');

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
