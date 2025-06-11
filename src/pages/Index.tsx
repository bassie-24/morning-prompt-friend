import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { storageService, UserInstruction } from '@/utils/storage';
import { planService } from '@/utils/planService';
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
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const speechServiceRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 最新の isCallActive 状態を useRef で管理（クロージャ問題を解決）
  const isCallActiveRef = useRef(false);
  
  const { toast } = useToast();
  const currentPlan = planService.getCurrentPlan();
  const planFeatures = planService.getPlanFeatures();

  // isCallActive を安全に更新する関数
  const updateCallActiveState = (active: boolean) => {
    console.log(`📱 通話状態を更新: ${active}`);
    setIsCallActive(active);
    isCallActiveRef.current = active;
  };

  useEffect(() => {
    const savedKey = storageService.getOpenAIKey();
    if (savedKey) setApiKey(savedKey);
    
    const savedInstructions = storageService.getInstructions();
    setInstructions(savedInstructions);
    
    speechServiceRef.current = new SpeechService();
  }, []);

  // タイマー管理
  useEffect(() => {
    if (isCallActive && callStartTime) {
      const maxDuration = planFeatures.maxCallDuration * 60; // 秒に変換
      setRemainingTime(maxDuration);
      
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
        const remaining = maxDuration - elapsed;
        
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          endCall();
          toast({
            title: "通話時間終了",
            description: `${planFeatures.displayName}プランの時間制限（${planFeatures.maxCallDuration}分）に達しました。`,
            variant: "destructive"
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive, callStartTime, planFeatures]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      storageService.saveOpenAIKey(apiKey.trim());
      toast({
        title: "APIキーを保存しました",
        description: "OpenAI APIキーが正常に保存されました。"
      });
    }
  };

  const startCall = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "エラー",
        description: "OpenAI APIキーを入力してください。",
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
      speechServiceRef.current?.resetConversation();
      
      setCurrentMessage("おはようございます！朝の準備を始めましょう。");
      setIsSpeaking(true);
      await speechServiceRef.current?.speak("おはようございます！朝の準備を始めましょう。");
      setIsSpeaking(false);

      // 最初の指示を取得
      console.log('OpenAI APIを呼び出します...');
      const response = await speechServiceRef.current?.sendToOpenAI(
        "おはようございます。朝の準備を始めます。最初の指示をお願いします。",
        activeInstructions,
        planFeatures.canUseRealtimeAI
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
          throw speakError;
        }
        setIsSpeaking(false);
      }

      console.log('startListeningを呼び出します...');
      if (sessionActive) {
        console.log('📞 セッションがアクティブです - 音声認識を開始します');
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
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentMessage('');
    
    // 通話ログを保存（プラン制限をチェック）
    if (callStartTime && speechServiceRef.current && planFeatures.canViewLogs) {
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
    } else if (callStartTime && !planFeatures.canViewLogs) {
      toast({
        title: "通話が終了しました",
        description: "ログの保存にはプラス以上のプランが必要です。"
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

      console.log('🤖 OpenAI APIからの応答を待機中...');
      const response = await speechServiceRef.current.sendToOpenAI(
        userInput,
        instructions.filter(inst => inst.isActive),
        planFeatures.canUseRealtimeAI
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
      
      console.log('🔄 音声認識を再試行します...');
      
      setTimeout(() => {
        console.log('🔄 startListeningを再呼び出しします');
        startListening();
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen morning-gradient p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">朝のAIアシスタント</h1>
            <p className="text-muted-foreground">音声で朝の準備をサポートします</p>
            <p className="text-sm text-muted-foreground mt-1">
              現在のプラン: {planFeatures.displayName} (最大{planFeatures.maxCallDuration}分)
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                設定
              </Button>
            </Link>
            {planFeatures.canViewLogs ? (
              <Link to="/logs">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  ログ
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <FileText className="w-4 h-4 mr-2" />
                ログ (プラス以上)
              </Button>
            )}
          </div>
        </div>

        {/* API Key Setup */}
        {!storageService.getOpenAIKey() && (
          <Card className="fade-in">
            <CardHeader>
              <CardTitle>初期設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="apiKey">OpenAI APIキー</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={saveApiKey} variant="outline">
                    保存
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Call Interface */}
        <Card className="fade-in">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Call Status */}
              <div className="space-y-4">
                {!isCallActive ? (
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">通話を開始する準備ができました</h2>
                    <p className="text-muted-foreground">
                      アクティブな指示: {instructions.filter(inst => inst.isActive).length}件
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">通話中</h2>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-lg">
                          残り時間: {formatTime(remainingTime)}
                        </span>
                      </div>
                      {isSpeaking && (
                        <p className="text-primary font-medium">🎤 AIが話しています...</p>
                      )}
                      {isListening && (
                        <p className="text-secondary font-medium">👂 あなたの声を待っています...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Current Message Display */}
              {currentMessage && (
                <Card className="bg-accent/20 border-accent">
                  <CardContent className="p-4">
                    <p className="text-sm">{currentMessage}</p>
                  </CardContent>
                </Card>
              )}

              {/* Call Control Button */}
              <div className="flex justify-center">
                {!isCallActive ? (
                  <Button
                    onClick={startCall}
                    size="lg"
                    className="w-32 h-32 rounded-full text-lg font-semibold"
                    disabled={!apiKey.trim() || instructions.filter(inst => inst.isActive).length === 0}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Phone className="w-8 h-8" />
                      <span>通話開始</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={endCall}
                    size="lg"
                    variant="destructive"
                    className={`w-32 h-32 rounded-full text-lg font-semibold ${
                      isSpeaking ? 'speaking-animation' : 
                      isListening ? 'listening-animation' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <PhoneOff className="w-8 h-8" />
                      <span>通話終了</span>
                    </div>
                  </Button>
                )}
              </div>

              {/* Status Icons */}
              {isCallActive && (
                <div className="flex justify-center gap-4 text-muted-foreground">
                  <div className={`flex items-center gap-2 ${isListening ? 'text-primary' : ''}`}>
                    {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    <span className="text-sm">
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
                <li>• {planFeatures.canViewLogs ? '通話ログは自動的に保存され、後で確認できます' : 'ログ機能はプラス以上のプランで利用できます'}</li>
                {planFeatures.canUseRealtimeAI && (
                  <li>• プレミアムプランではリアルタイム情報（天気、ニュース等）にアクセスできます</li>
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
