import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Send, Loader2 } from 'lucide-react';
import { webSearchService } from '@/services/WebSearchService';
import OpenAI from 'openai';

import { storageService } from '@/utils/storage';

export const WebSearchTest: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTest, setShowTest] = useState(false);

  const testWebSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResult('');

    try {
      // 直接Web検索を実行
      console.log('🔍 テスト検索実行:', query);
      const searchResponse = await webSearchService.search(query);
      const formattedResults = webSearchService.formatResults(searchResponse);
      
      setResult(formattedResults);
      console.log('🔍 検索結果:', searchResponse);
    } catch (error) {
      console.error('検索エラー:', error);
      const errorMsg = '検索エラーが発生しました: ' + error;
      setResult(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithResponsesAPI = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResult('');

    try {
      const apiKey = storageService.getOpenAIKey();
      if (!apiKey) {
        const errorMsg = 'OpenAI APIキーが設定されていません';
        setResult(errorMsg);
        return;
      }

      console.log('🔄 Responses API でテスト実行:', query);

      // OpenAI クライアントを初期化
      const client = new OpenAI({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true
      });

      // Responses API を使用してリクエストを実行
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        tools: [
          { type: "web_search_preview" },
        ],
        input: `Please search for current information about: ${query}. I need the most up-to-date data available.`,
      });

      console.log('🔄 Responses API レスポンス:', response);

      // レスポンスからテキストを取得
      const finalResult = response.output_text || 'Responses APIから有効なレスポンスが取得できませんでした';

      // Format result
      const timestamp = new Date().toLocaleString('ja-JP');
      const formattedResult = `【Responses API結果】\n${finalResult}\n\n検索実行時刻: ${timestamp}`;
      
      setResult(formattedResult);
      console.log('🔄 Responses API 最終結果:', formattedResult);

    } catch (error) {
      console.error('Responses API エラー:', error);
      const errorMsg = 'Responses API エラーが発生しました: ' + error;
      setResult(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };






  const sampleQueries = [
    '現在の日米為替レート',
    '川崎市の今日の天気',
    '最新のニュース',
    'USD JPY exchange rate',
    'Tokyo weather today'
  ];

  if (!showTest) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setShowTest(true)}
          variant="outline"
          size="sm"
          className="shadow-lg"
        >
          <Search className="w-4 h-4 mr-2" />
          Web検索テスト
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[400px]">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Web検索テスト
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTest(false)}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="検索クエリを入力..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && testWebSearch()}
              disabled={isLoading}
            />
            <Button
              onClick={testWebSearch}
              disabled={isLoading || !query.trim()}
              size="sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testWithResponsesAPI}
              disabled={isLoading || !query.trim()}
              variant="default"
              className="min-w-[120px]"
            >
              {isLoading ? 'テスト中...' : 'Responses API'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>サンプル:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {sampleQueries.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(sample)}
                  className="px-2 py-1 bg-muted rounded hover:bg-muted/80 text-xs"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {result && (
            <div className="max-h-[300px] overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded">
                {result}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebSearchTest;