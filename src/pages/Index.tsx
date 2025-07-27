import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { storageService, UserInstruction } from '@/utils/storage';
import { usePlan } from '@/contexts/PlanContext';
import { SpeechService } from '@/utils/speechService';
import { Mic, MicOff, Phone, PhoneOff, Settings, FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const speechServiceRef = useRef<SpeechService | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 最新の isCallActive 状態を useRef で管理（クロージャ問題を解決）
  const isCallActiveRef = useRef(false);
  
  const { toast } = useToast();
  const { userPlan, planLimits } = usePlan();

  // isCallActive を安全に更新する関数
  const updateCallActiveState = (active: boolean) => {
    console.log(`📱 通話状態を更新: ${active}`);
    setIsCallActive(active);
    isCallActiveRef.current = active;
  };

  // 時間フォーマット関数
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // タイマー開始
  const startTimer = () => {
    setRemainingTime(planLimits.timeLimit);
    timeIntervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          // 時間切れ
          endCall();
          toast({
            title: "通話時間終了",
            description: "プランの制限時間に達したため通話を終了しました。",
            variant: "destructive"
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // タイマー停止
  const stopTimer = () => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
    setRemainingTime(0);
  };

  useEffect(() => {
    const savedKey = storageService.getOpenAIKey();
    if (savedKey) setApiKey(savedKey);
    
    let savedInstructions = storageService.getInstructions();
    
    // 指示が0件の場合、デフォルト指示を自動追加
    if (savedInstructions.length === 0) {
      const defaultInstructions = [
        {
          title: '朝の基本準備',
          content: '朝の基本的な準備についてアドバイスしてください。天気、予定の確認、健康チェック、朝食の提案など、一般的な朝のルーティンをサポートしてください。',
          order: 1,
          isActive: true,
          useWebSearch: false
        },
        {
          title: 'モチベーション向上',
          content: '1日を前向きに始められるような励ましの言葉や、やる気を引き出すアドバイスを提供してください。',
          order: 2,
          isActive: true,
          useWebSearch: false
        }
      ];
      
      // デフォルト指示を保存
      defaultInstructions.forEach(instruction => {
        storageService.addInstruction(instruction);
      });
      
      savedInstructions = storageService.getInstructions();
      console.log('🎯 デフォルト指示を追加しました:', savedInstructions.length + '件');
    }
    
    setInstructions(savedInstructions);
    
    speechServiceRef.current = new SpeechService();

    // クリーンアップ: コンポーネントアンマウント時にタイマーをクリア
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      const trimmedKey = apiKey.trim();
      console.log('🔑 Saving API Key length:', trimmedKey.length);
      console.log('🔑 Saving API Key starts with:', trimmedKey.substring(0, 10));
      
      storageService.saveOpenAIKey(trimmedKey);
      
      // 保存後の確認
      const savedKey = storageService.getOpenAIKey();
      console.log('🔑 Saved API Key verification length:', savedKey?.length || 0);
      console.log('🔑 Saved API Key verification starts with:', savedKey?.substring(0, 10) || 'none');
      
      toast({
        title: "APIキーを保存しました",
        description: "OpenAI APIキーが正常に保存されました。"
      });
    }
  };

  const startCall = async () => {
    // APIキーの詳細チェック
    const stateApiKey = apiKey.trim();
    const storageApiKey = storageService.getOpenAIKey();
    
    console.log('🔑 State API Key length:', stateApiKey.length);
    console.log('🔑 State API Key starts with:', stateApiKey.substring(0, 10) || 'none');
    console.log('🔑 Storage API Key length:', storageApiKey?.length || 0);
    console.log('🔑 Storage API Key starts with:', storageApiKey?.substring(0, 10) || 'none');
    console.log('🔑 Keys match:', stateApiKey === storageApiKey);
    
    if (!stateApiKey) {
      toast({
        title: "エラー",
        description: "OpenAI APIキーを入力してください。",
        variant: "destructive"
      });
      return;
    }
    
    if (!storageApiKey) {
      toast({
        title: "エラー",
        description: "APIキーが保存されていません。設定画面で保存してください。",
        variant: "destructive"
      });
      return;
    }

    const activeInstructions = instructions.filter(inst => inst.isActive);
    if (activeInstructions.length === 0) {
      toast({
        title: "エラー",
        description: "アクティブな指示が設定されていません。設定ページで指示を追加してください。",
        variant: "destructive"
      });
      return;
    }

    // セッション開始フラグをローカル変数で管理
    let sessionActive = true;

    try {
      console.log('✅ isCallActiveをtrueに設定します');
      updateCallActiveState(true);
      console.log('isCallActive (状態):', isCallActive);
      console.log('isCallActiveRef (最新値):', isCallActiveRef.current);
      setCallStartTime(new Date());
      startTimer(); // タイマー開始
      speechServiceRef.current?.resetConversation();
      
      setCurrentMessage("おはようございます！朝の準備を始めましょう。");
      setIsSpeaking(true);
      await speechServiceRef.current?.speak("おはようございます！朝の準備を始めましょう。");
      setIsSpeaking(false);

      // 最初の指示を取得
      console.log('OpenAI APIを呼び出します...');
      const response = await speechServiceRef.current?.sendToOpenAI(
        "おはようございます。朝の準備を始めます。最初の指示をお願いします。",
        activeInstructions
      );
      console.log('OpenAI APIからの応答:', response);

      if (response) {
        setCurrentMessage(response);
        setIsSpeaking(true);
        console.log('AIが話し始めます...');
        try {
          await speechServiceRef.current?.speak(response);
          console.log('AIが話し終わりました');
        } catch (speakError) {
          console.error('🔊 音声合成エラー:', speakError);
          throw speakError; // エラーを再スローしてcatchブロックに伝播
        }
        setIsSpeaking(false);
      }

      console.log('startListeningを呼び出します...');
      // セッションがアクティブな場合のみ音声認識を開始
      if (sessionActive) {
        console.log('📞 セッションがアクティブです - 音声認識を開始します');
        // 状態更新を待つために少し遅らせる
        setTimeout(() => {
          startListening();
        }, 100);
      } else {
        console.log('❌ セッションが非アクティブ - 音声認識をスキップします');
      }
          } catch (error) {
        console.error('❌❌❌ 通話開始エラーが発生しました:', error);
        console.error('❌ エラーの詳細:', error.message, error.stack);
        console.log('❌ セッションを終了します');
        sessionActive = false;
        updateCallActiveState(false);
        toast({
          title: "エラー",
          description: "通話の開始に失敗しました。",
          variant: "destructive"
        });
      }
  };

  const endCall = () => {
    console.log('🛑 endCall: isCallActiveをfalseに設定します');
    updateCallActiveState(false);
    stopTimer(); // タイマー停止
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentMessage('');
    
    // 通話ログを保存
    if (callStartTime && speechServiceRef.current) {
      const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      const conversation = speechServiceRef.current.getConversationHistory();
      
      storageService.saveCallLog({
        date: callStartTime.toISOString(),
        duration,
        instructions: instructions.filter(inst => inst.isActive),
        conversation
      });
      
      toast({
        title: "通話が終了しました",
        description: "通話ログが保存されました。"
      });
    }
  };

  const startListening = async () => {
    console.log('=== Index.tsx startListening が呼び出されました ===');
    console.log('speechServiceRef.current:', speechServiceRef.current);
    console.log('isCallActive (状態):', isCallActive);
    console.log('isCallActiveRef (最新値):', isCallActiveRef.current);
    
    if (!speechServiceRef.current) {
      console.log('startListeningを終了します（speechServiceRef.currentがnull）');
      return;
    }
    
    if (!isCallActiveRef.current) {
      console.log('startListeningを終了します（isCallActiveRefがfalse）');
      return;
    }
    
    // isCallActive の状態を再確認
    if (!isCallActiveRef.current) {
      console.log('⚠️ isCallActive が false です。状態を再確認中...');
      return;
    }

    try {
      console.log('音声認識を開始しようとしています...');
      setIsListening(true);
      const userInput = await speechServiceRef.current.startListening();
      setIsListening(false);

      console.log('ユーザー入力:', userInput);
      setCurrentMessage(`あなた: ${userInput}`);

      // AIからの応答を取得
      console.log('🤖 OpenAI APIからの応答を待機中...');
      const response = await speechServiceRef.current.sendToOpenAI(
        userInput,
        instructions.filter(inst => inst.isActive)
      );
      console.log('🤖 OpenAI APIからの応答:', response);

      if (response) {
        console.log('🎬 AIの応答があります - 音声合成を開始します');
        setCurrentMessage(response);
        setIsSpeaking(true);
        console.log('🔊 AIが話し始めます...');
        await speechServiceRef.current.speak(response);
        console.log('🔊 AIが話し終わりました');
        setIsSpeaking(false);
        
        // 次の音声入力を待機
        console.log('⏰ 1秒後に次の音声認識を開始します');
        setTimeout(() => {
          console.log('⏰ タイムアウト後 - isCallActive (状態):', isCallActive);
          console.log('⏰ タイムアウト後 - isCallActiveRef (最新値):', isCallActiveRef.current);
          if (isCallActiveRef.current) {
            console.log('🔄 次の音声認識を開始します');
            startListening();
          } else {
            console.log('❌ isCallActiveがfalseのため、音声認識を開始しません');
          }
        }, 1000);
      } else {
        console.log('❌ AIからの応答がありません');
      }
    } catch (error) {
      console.error('🔊 音声認識エラーが発生しました:', error);
      setIsListening(false);
      
      // ネットワークエラーの場合の特別な処理
      if (error.message && error.message.includes('network')) {
        console.log('🌐 ネットワークエラーです - 再試行します');
        toast({
          title: "ネットワークエラー",
          description: "音声認識サービスへの接続に失敗しました。再試行中...",
          variant: "destructive"
        });
      } else {
        toast({
          title: "音声認識エラー",
          description: "音声の認識に失敗しました。もう一度お試しください。",
          variant: "destructive"
        });
      }
      
      // エラー後も通話を継続（endCallは呼ばない）
      console.log('🔄 音声認識を再試行します...');
      
      setTimeout(() => {
        console.log('🔄 startListeningを再呼び出しします');
        startListening();
      }, 3000); // ネットワークエラーの場合は少し長めに待つ
    }
  };

  const planInfo = storageService.getUserPlanInfo();
  const webSearchInstructions = instructions.filter(inst => inst.isActive && inst.useWebSearch).length;

  return (
    <div className="min-h-screen morning-gradient p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header - Mobile First Responsive */}
        <div className="space-y-4 sm:space-y-0 sm:flex sm:justify-between sm:items-start">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">朝のAIアシスタント</h1>
            <p className="text-sm sm:text-base text-muted-foreground">音声で朝の準備をサポートします</p>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 text-xs sm:text-sm">
              <span className="text-muted-foreground">プラン:</span>
              <span className="font-medium">{planInfo.planDisplayName}</span>
              <span className="text-muted-foreground hidden sm:inline">• モデル: {planInfo.modelUsed}</span>
              <span className="text-muted-foreground sm:hidden">• {planInfo.modelUsed}</span>
              {planInfo.hasSearch && webSearchInstructions > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded whitespace-nowrap">
                  Web検索対応 ({webSearchInstructions}件)
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 sm:ml-4">
            <Link to="/settings" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px] text-sm">
                <Settings className="w-4 h-4 mr-2" />
                <span className="sm:inline">設定</span>
              </Button>
            </Link>
            {planLimits.hasLogAccess ? (
              <Link to="/logs" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px] text-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="sm:inline">ログ</span>
                </Button>
              </Link>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                disabled 
                title="プラス以上のプランでログが閲覧できます"
                className="flex-1 sm:flex-none w-full sm:w-auto min-h-[44px] text-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="sm:inline">ログ</span>
              </Button>
            )}
          </div>
        </div>

        {/* API Key Setup - Mobile Optimized */}
        {!storageService.getOpenAIKey() && (
          <Card className="fade-in">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">初期設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="apiKey" className="text-sm sm:text-base">OpenAI APIキー</Label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 min-h-[44px] text-sm sm:text-base"
                  />
                  <Button 
                    onClick={saveApiKey} 
                    variant="outline"
                    className="min-h-[44px] px-6 sm:px-4 w-full sm:w-auto"
                  >
                    保存
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Call Interface - Mobile Optimized */}
        <Card className="fade-in">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="text-center space-y-4 sm:space-y-6">
              {/* Call Status */}
              <div className="space-y-3 sm:space-y-4">
                {!isCallActive ? (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold mb-2">通話を開始する準備ができました</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      アクティブな指示: {instructions.filter(inst => inst.isActive).length}件 / {planInfo.maxInstructions}件まで
                    </p>
                    {planInfo.hasSearch && webSearchInstructions > 0 && (
                      <p className="text-xs sm:text-sm text-primary font-medium mt-2">
                        ✨ Web検索機能: {webSearchInstructions}件の指示でリアルタイム情報検索が利用できます
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold mb-2">通話中</h2>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className={`font-mono text-base sm:text-lg ${remainingTime <= 30 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          残り: {formatTime(remainingTime)}
                        </span>
                      </div>
                      {isSpeaking && (
                        <p className="text-sm sm:text-base text-primary font-medium">🎤 AIが話しています...</p>
                      )}
                      {isListening && (
                        <p className="text-sm sm:text-base text-secondary font-medium">👂 あなたの声を待っています...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Current Message Display - Mobile Optimized */}
              {currentMessage && (
                <Card className="bg-accent/20 border-accent">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs sm:text-sm leading-relaxed">{currentMessage}</p>
                  </CardContent>
                </Card>
              )}

              {/* Call Control Button - Mobile Touch Optimized */}
              <div className="flex justify-center">
                {!isCallActive ? (
                  <Button
                    onClick={startCall}
                    size="lg"
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full text-base sm:text-lg font-semibold touch-manipulation"
                    disabled={!apiKey.trim() || instructions.filter(inst => inst.isActive).length === 0}
                  >
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      <Phone className="w-6 h-6 sm:w-8 sm:h-8" />
                      <span className="text-xs sm:text-sm">通話開始</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={endCall}
                    size="lg"
                    variant="destructive"
                    className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full text-base sm:text-lg font-semibold touch-manipulation ${
                      isSpeaking ? 'speaking-animation' : 
                      isListening ? 'listening-animation' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      <PhoneOff className="w-6 h-6 sm:w-8 sm:h-8" />
                      <span className="text-xs sm:text-sm">通話終了</span>
                    </div>
                  </Button>
                )}
              </div>

              {/* Status Icons - Mobile Optimized */}
              {isCallActive && (
                <div className="flex justify-center gap-3 sm:gap-4 text-muted-foreground">
                  <div className={`flex items-center gap-2 ${isListening ? 'text-primary' : ''}`}>
                    {isListening ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                    <span className="text-xs sm:text-sm">
                      {isListening ? '音声認識中' : '待機中'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        {!isCallActive && (
          <Card className="fade-in">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">使い方のヒント</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 設定ページでAIに指示してほしい内容を事前に登録してください</li>
                <li>• 通話中はAIの指示に従って行動し、完了したら口頭で報告してください</li>
                <li>• 音声認識がうまくいかない場合は、はっきりと話してください</li>
                <li>• 通話ログは自動的に保存され、後で確認できます</li>
                {planInfo.hasSearch && webSearchInstructions > 0 && (
                  <>
                    <li>• <strong>Web検索機能:</strong> 「今日の天気は？」「何時ですか？」「最新ニュースは？」などの質問もできます</li>
                    <li>• AIが必要に応じてリアルタイム情報を検索して回答します</li>
                  </>
                )}
                {planInfo.hasSearch && webSearchInstructions === 0 && (
                  <li>• 設定で個別の指示にWeb検索機能を有効にすると、リアルタイム情報が利用できます</li>
                )}
                {!planInfo.hasSearch && (
                  <li>• プレミアムプランにアップグレードすると、Web検索機能が利用できます</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
