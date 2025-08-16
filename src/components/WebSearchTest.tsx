import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Send, Loader2 } from 'lucide-react';
import { webSearchService } from '@/services/WebSearchService';

import { storageService } from '@/utils/storage';

export const WebSearchTest: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [webSearchResult, setWebSearchResult] = useState<string>('');
  const [openAIResult, setOpenAIResult] = useState<string>('');

  const testWebSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    if (!comparisonMode) setResult('');

    try {
      // 直接Web検索を実行
      console.log('🔍 テスト検索実行:', query);
      const searchResponse = await webSearchService.search(query);
      const formattedResults = webSearchService.formatResults(searchResponse);
      
      if (comparisonMode) {
        setWebSearchResult(formattedResults);
      } else {
        setResult(formattedResults);
      }
      console.log('🔍 検索結果:', searchResponse);
    } catch (error) {
      console.error('検索エラー:', error);
      const errorMsg = '検索エラーが発生しました: ' + error;
      if (comparisonMode) {
        setWebSearchResult(errorMsg);
      } else {
        setResult(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testWithAI = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    if (!comparisonMode) setResult('');

    try {
      // OpenAI検索可能モデルを直接使用
      const apiKey = storageService.getOpenAIKey();
      
      if (!apiKey) {
        setResult('OpenAI APIキーが設定されていません');
        return;
      }

      console.log('🤖 OpenAI検索可能モデルでテスト実行:', query);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-search-preview', // 検索専用モデルに変更
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that always searches the web for current, up-to-date information. When asked about current data like exchange rates, weather, or news, you must search the web to provide accurate and recent information.'
            },
            {
              role: 'user',
              content: `Please search the web for current information about: ${query}. I need the most up-to-date data available.`
            }
          ],
          web_search_options: {}, // 検索オプションを追加
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API エラー:', response.status, errorText);
        throw new Error(`OpenAI API エラー: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('🤖 OpenAI API レスポンス:', data);

      let aiResponse = '';
      let messages = [
        {
          role: 'system',
          content: 'あなたは最新情報を検索して正確に回答するアシスタントです。ユーザーからの質問に対して、必要に応じてweb_search機能を使用して最新の情報を取得し、正確で詳細な回答を提供してください。検索結果を基に、具体的な数値や時刻を含めて回答してください。'
        },
        {
          role: 'user',
          content: query
        }
      ];

      // Tool callsがある場合の処理
      if (data.choices?.[0]?.message?.tool_calls) {
        console.log('🔧 Tool calls検出:', data.choices[0].message.tool_calls);
        
        // アシスタントのメッセージを追加
        messages.push(data.choices[0].message);
        
        // Tool callsを実行
        for (const toolCall of data.choices[0].message.tool_calls) {
          if (toolCall.function.name === 'web_search') {
            const searchArgs = JSON.parse(toolCall.function.arguments);
            console.log('🔍 検索実行:', searchArgs.query);
            
            try {
              // 実際の検索を実行（モックサービスを使用）
              const searchResponse = await webSearchService.search(searchArgs.query);
              const formattedResults = webSearchService.formatResults(searchResponse);
              
              // Tool結果をメッセージに追加
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  query: searchArgs.query,
                  results: searchResponse.results,
                  timestamp: searchResponse.timestamp
                })
              });
            } catch (error) {
              console.error('検索エラー:', error);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  error: '検索に失敗しました',
                  query: searchArgs.query
                })
              });
            }
          }
        }

        // Tool結果を含めて再度OpenAIに送信
        const followupResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 1000,
            temperature: 0.1
          })
        });

        if (followupResponse.ok) {
          const followupData = await followupResponse.json();
          console.log('🔄 フォローアップレスポンス:', followupData);
          aiResponse = followupData.choices?.[0]?.message?.content || '検索結果の処理に失敗しました';
        } else {
          aiResponse = 'Tool結果の処理中にエラーが発生しました';
        }
      } else if (data.choices?.[0]?.message?.content) {
        aiResponse = data.choices[0].message.content;
      } else {
        aiResponse = 'OpenAIから有効な応答を取得できませんでした';
      }

      // 検索実行時刻を追加
      const timestamp = new Date().toLocaleString('ja-JP');
      const finalResult = `【OpenAI検索可能モデルの結果】\n${aiResponse}\n\n検索実行時刻: ${timestamp}`;
      
      if (comparisonMode) {
        setOpenAIResult(finalResult);
      } else {
        setResult(finalResult);
      }
      console.log('🤖 AI応答:', finalResult);
    } catch (error) {
      console.error('OpenAI API エラー:', error);
      const errorMsg = 'OpenAI API エラーが発生しました: ' + error;
      if (comparisonMode) {
        setOpenAIResult(errorMsg);
      } else {
        setResult(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const runComparison = async () => {
    if (!query.trim()) return;

    setComparisonMode(true);
    setWebSearchResult('');
    setOpenAIResult('');
    setResult('');

    // 両方の検索を並行実行
    await Promise.all([
      testWebSearch(),
      testWithAI()
    ]);
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
              onClick={testWithAI}
              disabled={isLoading || !query.trim()}
              variant="secondary"
              size="sm"
            >
              OpenAI検索
            </Button>
            <Button
              onClick={runComparison}
              disabled={isLoading || !query.trim()}
              variant="default"
              size="sm"
            >
              比較検証
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

          {comparisonMode && (webSearchResult || openAIResult) && (
            <div className="space-y-3">
              <div className="text-sm font-medium">📊 比較結果</div>
              
              {webSearchResult && (
                <div>
                  <div className="text-xs font-medium text-blue-600 mb-1">🔍 Web検索結果（モック）</div>
                  <pre className="text-xs whitespace-pre-wrap bg-blue-50 p-2 rounded max-h-[150px] overflow-y-auto">
                    {webSearchResult}
                  </pre>
                </div>
              )}
              
              {openAIResult && (
                <div>
                  <div className="text-xs font-medium text-green-600 mb-1">🤖 OpenAI検索可能モデル</div>
                  <pre className="text-xs whitespace-pre-wrap bg-green-50 p-2 rounded max-h-[150px] overflow-y-auto">
                    {openAIResult}
                  </pre>
                </div>
              )}

              {webSearchResult && openAIResult && (
                <Button
                  onClick={() => {
                    setComparisonMode(false);
                    setWebSearchResult('');
                    setOpenAIResult('');
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  比較終了
                </Button>
              )}
            </div>
          )}

          {!comparisonMode && result && (
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