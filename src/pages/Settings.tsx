
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { storageService, UserInstruction } from '@/utils/storage';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlanSelector from '@/components/PlanSelector';

const Settings = () => {
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [newInstruction, setNewInstruction] = useState({ title: '', content: '' });
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const savedInstructions = storageService.getInstructions();
    setInstructions(savedInstructions);
    
    const savedKey = storageService.getOpenAIKey();
    if (savedKey) setApiKey(savedKey);
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

  const sortedInstructions = [...instructions].sort((a, b) => a.order - b.order);

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
            <CardTitle>プラン設定</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanSelector />
          </CardContent>
        </Card>

        {/* Add New Instruction */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>新しい指示を追加</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                placeholder="例: 水を飲む"
                value={newInstruction.title}
                onChange={(e) => setNewInstruction(prev => ({ ...prev, title: e.target.value }))}
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
              />
            </div>
            <Button onClick={addInstruction} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              指示を追加
            </Button>
          </CardContent>
        </Card>

        {/* Instructions List */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>
              登録済み指示 ({instructions.filter(inst => inst.isActive).length}件がアクティブ)
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
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {instruction.content}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={instruction.isActive}
                              onCheckedChange={(checked) => toggleInstruction(instruction.id, checked)}
                            />
                            <Label className="text-xs">
                              {instruction.isActive ? 'ON' : 'OFF'}
                            </Label>
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
                <h4 className="font-medium text-foreground mb-1">指示の例:</h4>
                <ul className="space-y-1 ml-4">
                  <li>• 「ベッドから起き上がって、軽くストレッチをしてください」</li>
                  <li>• 「洗面所で顔を洗い、歯を磨いてください」</li>
                  <li>• 「キッチンで水を1杯飲んでください」</li>
                  <li>• 「今日の予定を確認してください」</li>
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
