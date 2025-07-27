import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { storageService, UserInstruction, UserPlan } from '@/utils/storage';
import { ArrowLeft, Plus, Trash2, GripVertical, Crown, Zap, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Settings = () => {
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [newInstruction, setNewInstruction] = useState({ title: '', content: '' });
  const [apiKey, setApiKey] = useState('');
  const [userPlan, setUserPlan] = useState<UserPlan>('free');
  const { toast } = useToast();
  const { userPlan, updatePlan } = usePlan();

  useEffect(() => {
    const savedInstructions = storageService.getInstructions();
    setInstructions(savedInstructions);
    
    const savedKey = storageService.getOpenAIKey();
    if (savedKey) setApiKey(savedKey);

    const currentPlan = storageService.getUserPlan();
    setUserPlan(currentPlan);
  }, []);

  const addInstruction = () => {
    if (!newInstruction.title.trim() || !newInstruction.content.trim()) {
      toast({
        title: "エラー",
        description: "タイトルと内容を入力してください。",
        variant: "destructive"
      });
      return;
    }

    const maxOrder = Math.max(...instructions.map(inst => inst.order), 0);
    storageService.addInstruction({
      title: newInstruction.title.trim(),
      content: newInstruction.content.trim(),
      order: maxOrder + 1,
      isActive: true
    });

    setInstructions(storageService.getInstructions());
    setNewInstruction({ title: '', content: '' });
    
    toast({
      title: "指示を追加しました",
      description: "新しい指示が正常に追加されました。"
    });
  };

  const deleteInstruction = (id: string) => {
    storageService.deleteInstruction(id);
    setInstructions(storageService.getInstructions());
    
    toast({
      title: "指示を削除しました",
      description: "指示が正常に削除されました。"
    });
  };

  const toggleInstruction = (id: string, isActive: boolean) => {
    storageService.updateInstruction(id, { isActive });
    setInstructions(storageService.getInstructions());
  };

  const updateInstructionOrder = (id: string, newOrder: number) => {
    storageService.updateInstruction(id, { order: newOrder });
    setInstructions(storageService.getInstructions());
  };

  const moveUp = (id: string, currentOrder: number) => {
    const prevInstruction = instructions.find(inst => inst.order === currentOrder - 1);
    if (prevInstruction) {
      updateInstructionOrder(id, currentOrder - 1);
      updateInstructionOrder(prevInstruction.id, currentOrder);
      setInstructions(storageService.getInstructions());
    }
  };

  const moveDown = (id: string, currentOrder: number) => {
    const nextInstruction = instructions.find(inst => inst.order === currentOrder + 1);
    if (nextInstruction) {
      updateInstructionOrder(id, currentOrder + 1);
      updateInstructionOrder(nextInstruction.id, currentOrder);
      setInstructions(storageService.getInstructions());
    }
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

  const toggleWebSearch = (id: string, useWebSearch: boolean) => {
    const planInfo = storageService.getUserPlanInfo();
    
    if (useWebSearch && !planInfo.hasSearch) {
      toast({
        title: "プレミアムプラン限定機能",
        description: "Web検索機能はプレミアムプランでのみ利用できます。",
        variant: "destructive"
      });
      return;
    }

    const updatedInstructions = instructions.map(inst =>
      inst.id === id ? { ...inst, useWebSearch } : inst
    );
    setInstructions(updatedInstructions);
    storageService.saveInstructions(updatedInstructions);
  };

  const changePlan = (newPlan: UserPlan) => {
    storageService.setUserPlan(newPlan);
    setUserPlan(newPlan);
    
    const planInfo = storageService.getUserPlanInfo();
    
    // 無料プランに変更した場合、全てのweb検索モードをOFFにする
    if (newPlan === 'free') {
      const updatedInstructions = instructions.map(inst => ({
        ...inst,
        useWebSearch: false
      }));
      setInstructions(updatedInstructions);
      storageService.saveInstructions(updatedInstructions);
    }
    
    toast({
      title: "プランを変更しました",
      description: `${planInfo.planDisplayName}に変更されました。使用モデル: ${planInfo.modelUsed}`
    });
  };

  const sortedInstructions = [...instructions].sort((a, b) => a.order - b.order);
  const planInfo = storageService.getUserPlanInfo();

  return (
    <div className="min-h-screen morning-gradient p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">設定</h1>
            <p className="text-muted-foreground">AIに実行してもらう指示を管理します</p>
          </div>
        </div>

        {/* Plan Selection */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              プラン選択
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 無料プラン */}
              <Card className={`cursor-pointer transition-all ${
                planInfo.plan === 'free' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-primary/50'
              }`} onClick={() => changePlan('free')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">無料プラン</h3>
                    {planInfo.plan === 'free' && (
                      <Badge variant="default">現在のプラン</Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• 使用モデル: gpt-4o-mini</p>
                    <p>• 最大指示数: 20件</p>
                    <p>• Web検索機能: なし</p>
                  </div>
                </CardContent>
              </Card>

              {/* プレミアムプラン */}
              <Card className={`cursor-pointer transition-all ${
                planInfo.plan === 'premium' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-primary/50'
              }`} onClick={() => changePlan('premium')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-1">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      プレミアムプラン
                    </h3>
                    {planInfo.plan === 'premium' && (
                      <Badge variant="default">現在のプラン</Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• 使用モデル: gpt-4.1 (最新)</p>
                    <p>• 最大指示数: 50件</p>
                    <p>• Web検索機能: 対応</p>
                    <p>• リアルタイム情報取得</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 p-4 bg-accent/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-primary" />
                <span className="font-medium">現在の設定</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">プラン:</span>
                  <span className="ml-2 font-medium">{planInfo.planDisplayName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">使用モデル:</span>
                  <span className="ml-2 font-medium">{planInfo.modelUsed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">最大指示数:</span>
                  <span className="ml-2 font-medium">{planInfo.maxInstructions}件</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Web検索機能:</span>
                  <span className="ml-2 font-medium">{planInfo.hasSearch ? '対応' : '非対応'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Key Settings */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>OpenAI API設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apiKey">APIキー</Label>
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
              <p className="text-xs text-muted-foreground mt-1">
                OpenAIのAPIキーはローカルストレージに保存されます
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Plan Selection */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>プラン選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Free Plan */}
              <Card 
                className={`cursor-pointer transition-all ${
                  userPlan.type === 'free' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => handlePlanChange('free')}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
                    <h3 className="font-semibold">無料プラン</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      会話時間: {formatTime(PLAN_LIMITS.free.timeLimit)}
                    </p>
                    <p className="text-muted-foreground">
                      ログアクセス: なし
                    </p>
                    <p className="text-muted-foreground">
                      外部データ: なし
                    </p>
                  </div>
                  {userPlan.type === 'free' && (
                    <Badge className="mt-2">現在のプラン</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Plus Plan */}
              <Card 
                className={`cursor-pointer transition-all ${
                  userPlan.type === 'plus' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => handlePlanChange('plus')}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-5 h-5 mr-2 text-blue-500" />
                    <h3 className="font-semibold">プラスプラン</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      会話時間: {formatTime(PLAN_LIMITS.plus.timeLimit)}
                    </p>
                    <p className="text-green-600">
                      ログアクセス: 可能
                    </p>
                    <p className="text-muted-foreground">
                      外部データ: なし
                    </p>
                  </div>
                  {userPlan.type === 'plus' && (
                    <Badge className="mt-2">現在のプラン</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Premium Plan */}
              <Card 
                className={`cursor-pointer transition-all ${
                  userPlan.type === 'premium' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => handlePlanChange('premium')}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                    <h3 className="font-semibold">プレミアムプラン</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      会話時間: {formatTime(PLAN_LIMITS.premium.timeLimit)}
                    </p>
                    <p className="text-green-600">
                      ログアクセス: 可能
                    </p>
                    <p className="text-green-600">
                      外部データ: 可能
                    </p>
                  </div>
                  {userPlan.type === 'premium' && (
                    <Badge className="mt-2">現在のプラン</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">
              現在はテスト環境のため、すべてのプランを無料でお試しいただけます
            </p>
          </CardContent>
        </Card>

        {/* Add New Instruction */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>新しい指示を追加</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructions.length >= planInfo.maxInstructions && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">制限に達しました:</span> 
                  {planInfo.planDisplayName}では最大{planInfo.maxInstructions}件までの指示を登録できます。
                  {planInfo.plan === 'free' && ' プレミアムプランにアップグレードすると50件まで登録できます。'}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                placeholder="例: 水を飲む"
                value={newInstruction.title}
                onChange={(e) => setNewInstruction(prev => ({ ...prev, title: e.target.value }))}
                disabled={instructions.length >= planInfo.maxInstructions}
              />
            </div>
            <div>
              <Label htmlFor="content">指示内容</Label>
              <Textarea
                id="content"
                placeholder="例: コップ1杯の水を飲んで、体を目覚めさせてください"
                value={newInstruction.content}
                onChange={(e) => setNewInstruction(prev => ({ ...prev, content: e.target.value }))}
                rows={3}
                disabled={instructions.length >= planInfo.maxInstructions}
              />
            </div>
            <Button 
              onClick={addInstruction} 
              className="w-full"
              disabled={instructions.length >= planInfo.maxInstructions}
            >
              <Plus className="w-4 h-4 mr-2" />
              指示を追加
            </Button>
          </CardContent>
        </Card>

        {/* Instructions List */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>
              登録済み指示 ({instructions.filter(inst => inst.isActive).length}件がアクティブ / {planInfo.maxInstructions}件まで)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedInstructions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                まだ指示が登録されていません。上のフォームから追加してください。
              </p>
            ) : (
              <div className="space-y-3">
                {sortedInstructions.map((instruction, index) => (
                  <Card key={instruction.id} className={`transition-all ${
                    instruction.isActive ? 'border-primary/30 bg-primary/5' : 'border-muted bg-muted/10'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex flex-col gap-1 mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveUp(instruction.id, instruction.order)}
                              disabled={index === 0}
                              className="p-1 h-auto"
                            >
                              <GripVertical className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{instruction.title}</h3>
                              <span className="text-xs bg-muted px-2 py-1 rounded">
                                {instruction.order}
                              </span>
                              {instruction.useWebSearch && (
                                <Badge variant="secondary" className="text-xs">
                                  <Search className="w-3 h-3 mr-1" />
                                  Web検索
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {instruction.content}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={instruction.isActive}
                                onCheckedChange={(checked) => toggleInstruction(instruction.id, checked)}
                              />
                              <Label className="text-xs">
                                {instruction.isActive ? 'ON' : 'OFF'}
                              </Label>
                            </div>
                            {planInfo.hasSearch && (
                              <div className="flex items-center space-x-2">
                                                                 <Switch
                                   checked={instruction.useWebSearch || false}
                                   onCheckedChange={(checked) => toggleWebSearch(instruction.id, checked)}
                                 />
                                <Label className="text-xs text-muted-foreground">
                                  Web検索
                                </Label>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInstruction(instruction.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Guide */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>指示作成のガイド</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1">効果的な指示のポイント:</h4>
                <ul className="space-y-1 ml-4">
                  <li>• 具体的で分かりやすい動作を含める</li>
                  <li>• 一つの指示につき一つの行動に絞る</li>
                  <li>• 時間の目安があれば含める</li>
                  <li>• ユーザーが報告しやすい内容にする</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Web検索機能について:</h4>
                <ul className="space-y-1 ml-4">
                  <li>• プレミアムプランでのみ利用可能</li>
                  <li>• 最新の天気、ニュース、為替情報などを取得</li>
                  <li>• 「今日の天気を確認してください」などの指示に最適</li>
                  <li>• 必要に応じてリアルタイム情報を検索して回答</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
