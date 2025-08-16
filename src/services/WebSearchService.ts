/**
 * Web検索サービス
 * 複数の検索APIプロバイダーに対応
 */

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  date?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  timestamp: string;
}

export class WebSearchService {
  private apiKey: string | null = null;
  private provider: 'serper' | 'bing' | 'google' | 'mock' = 'mock';

  constructor() {
    // APIキーをlocalStorageから取得
    this.apiKey = localStorage.getItem('web_search_api_key');
    const savedProvider = localStorage.getItem('web_search_provider');
    if (savedProvider) {
      this.provider = savedProvider as any;
    }
  }

  /**
   * APIキーを設定
   */
  public setApiKey(key: string, provider: 'serper' | 'bing' | 'google' | 'mock' = 'serper') {
    this.apiKey = key;
    this.provider = provider;
    localStorage.setItem('web_search_api_key', key);
    localStorage.setItem('web_search_provider', provider);
  }

  /**
   * Web検索を実行
   */
  public async search(query: string): Promise<SearchResponse> {
    console.log(`🔍 Web検索実行: "${query}" (Provider: ${this.provider})`);

    switch (this.provider) {
      case 'serper':
        return this.searchWithSerper(query);
      case 'bing':
        return this.searchWithBing(query);
      case 'google':
        return this.searchWithGoogle(query);
      default:
        return this.searchWithMock(query);
    }
  }

  /**
   * Serper API を使用した検索
   * https://serper.dev/
   */
  private async searchWithSerper(query: string): Promise<SearchResponse> {
    if (!this.apiKey) {
      console.warn('Serper APIキーが設定されていません。モック結果を返します。');
      return this.searchWithMock(query);
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          gl: 'jp',
          hl: 'ja',
          num: 5
        })
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Serper APIのレスポンスをパース
      const results: SearchResult[] = [];
      
      // オーガニック検索結果
      if (data.organic) {
        data.organic.forEach((item: any) => {
          results.push({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            date: item.date
          });
        });
      }

      // ナレッジグラフ（存在する場合）
      if (data.knowledgeGraph) {
        const kg = data.knowledgeGraph;
        if (kg.description) {
          results.unshift({
            title: kg.title || 'ナレッジグラフ',
            snippet: kg.description,
            link: kg.website || '',
            date: new Date().toISOString()
          });
        }
      }

      // 為替情報（存在する場合）
      if (data.answerBox) {
        const ab = data.answerBox;
        if (ab.answer || ab.snippet) {
          results.unshift({
            title: ab.title || '直接回答',
            snippet: ab.answer || ab.snippet,
            link: ab.link || '',
            date: new Date().toISOString()
          });
        }
      }

      return {
        query,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Serper API エラー:', error);
      return this.searchWithMock(query);
    }
  }

  /**
   * Bing Search API を使用した検索
   */
  private async searchWithBing(query: string): Promise<SearchResponse> {
    if (!this.apiKey) {
      console.warn('Bing APIキーが設定されていません。モック結果を返します。');
      return this.searchWithMock(query);
    }

    try {
      const response = await fetch(
        `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&mkt=ja-JP&count=5`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Bing API error: ${response.status}`);
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      if (data.webPages?.value) {
        data.webPages.value.forEach((item: any) => {
          results.push({
            title: item.name,
            snippet: item.snippet,
            link: item.url,
            date: item.dateLastCrawled
          });
        });
      }

      return {
        query,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Bing API エラー:', error);
      return this.searchWithMock(query);
    }
  }

  /**
   * Google Custom Search API を使用した検索
   */
  private async searchWithGoogle(query: string): Promise<SearchResponse> {
    if (!this.apiKey) {
      console.warn('Google APIキーが設定されていません。モック結果を返します。');
      return this.searchWithMock(query);
    }

    // Google Custom Search は APIキーとSearch Engine IDが必要
    const searchEngineId = localStorage.getItem('google_search_engine_id');
    if (!searchEngineId) {
      console.warn('Google Search Engine IDが設定されていません。');
      return this.searchWithMock(query);
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&hl=ja&num=5`,
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      if (data.items) {
        data.items.forEach((item: any) => {
          results.push({
            title: item.title,
            snippet: item.snippet,
            link: item.link
          });
        });
      }

      return {
        query,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Google API エラー:', error);
      return this.searchWithMock(query);
    }
  }

  /**
   * モック検索（開発・テスト用）
   */
  private async searchWithMock(query: string): Promise<SearchResponse> {
    console.log('⚠️ モック検索結果を使用しています');

    // クエリに基づいて異なるモック結果を返す
    const lowerQuery = query.toLowerCase();
    let results: SearchResult[] = [];

    if (lowerQuery.includes('為替') || lowerQuery.includes('ドル') || lowerQuery.includes('円')) {
      results = [
        {
          title: '米ドル/円 リアルタイム為替レート',
          snippet: `現在の米ドル/円レート: ${(145 + Math.random() * 5).toFixed(2)}円 (${new Date().toLocaleTimeString('ja-JP')}時点)`,
          link: 'https://example.com/forex',
          date: new Date().toISOString()
        },
        {
          title: '為替相場の最新動向',
          snippet: '日銀の金融政策と米FRBの利上げ動向が為替相場に影響を与えています。',
          link: 'https://example.com/news',
          date: new Date().toISOString()
        }
      ];
    } else if (lowerQuery.includes('天気') || lowerQuery.includes('weather')) {
      const location = lowerQuery.includes('川崎') ? '川崎市' : 
                      lowerQuery.includes('東京') ? '東京' : '日本';
      results = [
        {
          title: `${location}の天気予報`,
          snippet: `${location} 今日の天気: 晴れ時々曇り、最高気温${18 + Math.floor(Math.random() * 10)}℃、最低気温${10 + Math.floor(Math.random() * 5)}℃`,
          link: 'https://example.com/weather',
          date: new Date().toISOString()
        },
        {
          title: '週間天気予報',
          snippet: '今週は概ね晴れの日が続きますが、週末は雨の可能性があります。',
          link: 'https://example.com/weekly-weather',
          date: new Date().toISOString()
        }
      ];
    } else if (lowerQuery.includes('ニュース') || lowerQuery.includes('news')) {
      results = [
        {
          title: '最新ニュース速報',
          snippet: `${new Date().toLocaleDateString('ja-JP')}の主要ニュース: 経済、政治、社会の最新情報をお届けします。`,
          link: 'https://example.com/news',
          date: new Date().toISOString()
        }
      ];
    } else {
      // デフォルトのモック結果
      results = [
        {
          title: 'Web検索機能（開発モード）',
          snippet: 'この機能は現在開発モードで動作しています。実際の検索APIを設定することで、リアルタイム情報を取得できます。',
          link: 'https://example.com',
          date: new Date().toISOString()
        },
        {
          title: `"${query}" の検索結果`,
          snippet: `検索クエリ "${query}" に関する情報です。APIキーを設定すると実際の検索結果が表示されます。`,
          link: 'https://example.com/search',
          date: new Date().toISOString()
        }
      ];
    }

    return {
      query,
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 検索結果を読みやすいテキストに変換
   */
  public formatResults(response: SearchResponse): string {
    if (response.results.length === 0) {
      return `「${response.query}」に関する情報は見つかりませんでした。`;
    }

    let formatted = `「${response.query}」の検索結果:\n\n`;
    
    response.results.forEach((result, index) => {
      formatted += `${index + 1}. ${result.title}\n`;
      formatted += `   ${result.snippet}\n`;
      if (result.date) {
        const date = new Date(result.date);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) {
          formatted += `   (数分前の情報)\n`;
        } else if (diffHours < 24) {
          formatted += `   (${diffHours}時間前の情報)\n`;
        } else {
          formatted += `   (${Math.floor(diffHours / 24)}日前の情報)\n`;
        }
      }
      formatted += '\n';
    });

    formatted += `\n検索実行時刻: ${new Date(response.timestamp).toLocaleString('ja-JP')}`;
    
    return formatted;
  }
}

// シングルトンインスタンス
export const webSearchService = new WebSearchService();