import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { storageService, UserInstruction } from '@/utils/storage';
import { planService, PlanType } from '@/utils/planService';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlanSelector from '@/components/PlanSelector';

const Settings = () => {
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [newInstruction, setNewInstruction] = useState({ title: '', content: '' });
  const [apiKey, setApiKey] = useState('');
  const [currentPlan, setCurrentPlan] = useState<PlanType>('free');
  const { toast } = useToast();

  useEffect(() => {
    const savedInstructions = storageService.getInstructions();
    setInstructions(savedInstructions);
    
    const savedApiKey = storageService.getOpenAIKey();
    if (savedApiKey) setApiKey(savedApiKey);

    setCurrentPlan(planService.getCurrentPlan());
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

    const instruction: Omit<UserInstruction, 'id'> = {
      ...newInstruction,
      order: instructions.length,
      isActive: true
    };

    storageService.addInstruction(instruction);
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

  const toggleInstruction = (id: string) => {
    const instruction = instructions.find(inst => inst.id === id);
    if (instruction) {
      storageService.updateInstruction(id, { isActive: !instruction.isActive });
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

  const handlePlanChange = (plan: PlanType) => {
    setCurrentPlan(plan);
  };

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
            <p className="text-muted-foreground">アプリの設定を管理します</p>
          </div>
        </div>

        {/* Plan Selection */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>プラン選択</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanSelector currentPlan={currentPlan} onPlanChange={handlePlanChange} />
          </CardContent>
        </Card>

        {/* API Key Setup */}
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
            </div>
          </CardContent>
        </Card>

        {/* Instructions Management */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>指示管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Instruction */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">新しい指示を追加</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    placeholder="例：歯磨き"
                    value={newInstruction.title}
                    onChange={(e) => setNewInstruction(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="content">内容</Label>
                  <Textarea
                    id="content"
                    placeholder="例：歯磨きを2分間行ってください。フロスも忘れずに。"
                    value={newInstruction.content}
                    onChange={(e) => setNewInstruction(prev => ({ ...prev, content: e.target.value }))}
                    rows={3}
                  />
                </div>
                <Button onClick={addInstruction} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  指示を追加
                </Button>
              </div>
            </div>

            {/* Existing Instructions */}
            <div className="space-y-3">
              <h3 className="font-semibold">登録済みの指示</h3>
              {instructions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  まだ指示が登録されていません。上記のフォームから指示を追加してください。
                </p>
              ) : (
                <div className="space-y-3">
                  {instructions
                    .sort((a, b) => a.order - b.order)
                    .map((instruction) => (
                      <div
                        key={instruction.id}
                        className="flex items-start gap-3 p-4 border rounded-lg"
                      >
                        <GripVertical className="w-5 h-5 text-muted-foreground mt-1" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">{instruction.title}</h4>
                            <Switch
                              checked={instruction.isActive}
                              onCheckedChange={() => toggleInstruction(instruction.id)}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {instruction.content}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInstruction(instruction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
