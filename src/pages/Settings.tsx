import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { storageService, UserInstruction } from '@/utils/storage';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [apiKey, setApiKey] = useState('');
  const [instructions, setInstructions] = useState<UserInstruction[]>([]);
  const [isAddingInstruction, setIsAddingInstruction] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<string | null>(null);
  const [newInstruction, setNewInstruction] = useState({
    title: '',
    content: '',
    useWebSearch: false
  });
  const [editContent, setEditContent] = useState({
    title: '',
    content: '',
    useWebSearch: false
  });
  
  const { toast } = useToast();

  useEffect(() => {
    // 初期データ読み込み
    const savedKey = storageService.getOpenAIKey();
    if (savedKey) setApiKey(savedKey);
    
    const savedInstructions = storageService.getInstructions();
    setInstructions(savedInstructions);
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      storageService.saveOpenAIKey(apiKey.trim());
      toast({
        title: "APIキーを保存しました",
        description: "OpenAI APIキーが正常に保存されました。"
      });
    }
  };

  const addInstruction = () => {
    if (newInstruction.title.trim() && newInstruction.content.trim()) {
      const instructionData = {
        title: newInstruction.title.trim(),
        content: newInstruction.content.trim(),
        order: instructions.length + 1,
        isActive: true,
        useWebSearch: newInstruction.useWebSearch
      };
      
      storageService.addInstruction(instructionData);
      const updatedInstructions = storageService.getInstructions();
      setInstructions(updatedInstructions);
      
      setNewInstruction({ title: '', content: '', useWebSearch: false });
      setIsAddingInstruction(false);
      
      toast({
        title: "指示を追加しました",
        description: `「${instructionData.title}」を追加しました。`
      });
    }
  };

  const startEdit = (instruction: UserInstruction) => {
    setEditingInstruction(instruction.id);
    setEditContent({
      title: instruction.title,
      content: instruction.content,
      useWebSearch: instruction.useWebSearch || false
    });
  };

  const saveEdit = (id: string) => {
    if (editContent.title.trim() && editContent.content.trim()) {
      storageService.updateInstruction(id, {
        title: editContent.title.trim(),
        content: editContent.content.trim(),
        useWebSearch: editContent.useWebSearch
      });
      
      const updatedInstructions = storageService.getInstructions();
      setInstructions(updatedInstructions);
      setEditingInstruction(null);
      
      toast({
        title: "指示を更新しました",
        description: "指示の内容を保存しました。"
      });
    }
  };

  const cancelEdit = () => {
    setEditingInstruction(null);
    setEditContent({ title: '', content: '', useWebSearch: false });
  };

  const deleteInstruction = (id: string, title: string) => {
    storageService.deleteInstruction(id);
    const updatedInstructions = storageService.getInstructions();
    setInstructions(updatedInstructions);
    
    toast({
      title: "指示を削除しました",
      description: `「${title}」を削除しました。`
    });
  };

  const toggleInstructionActive = (id: string, isActive: boolean) => {
    storageService.updateInstruction(id, { isActive });
    const updatedInstructions = storageService.getInstructions();
    setInstructions(updatedInstructions);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">設定</h1>
        </div>

        {/* API Key Settings */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>OpenAI API設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="api-key">APIキー</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={saveApiKey}>保存</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Management */}
        <Card className="fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>指示管理</CardTitle>
              <Button 
                onClick={() => setIsAddingInstruction(true)}
                disabled={isAddingInstruction}
              >
                <Plus className="w-4 h-4 mr-2" />
                指示を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Add New Instruction Form */}
            {isAddingInstruction && (
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">新しい指示を追加</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="new-title">タイトル</Label>
                    <Input
                      id="new-title"
                      placeholder="指示のタイトル"
                      value={newInstruction.title}
                      onChange={(e) => setNewInstruction(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-content">内容</Label>
                    <Textarea
                      id="new-content"
                      placeholder="AIに対する具体的な指示内容を入力してください"
                      value={newInstruction.content}
                      onChange={(e) => setNewInstruction(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="new-web-search"
                      checked={newInstruction.useWebSearch}
                      onCheckedChange={(checked) => setNewInstruction(prev => ({ ...prev, useWebSearch: checked }))}
                    />
                    <Label htmlFor="new-web-search">Web検索を使用</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addInstruction}>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddingInstruction(false);
                        setNewInstruction({ title: '', content: '', useWebSearch: false });
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions List */}
            {instructions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                指示が登録されていません。「指示を追加」ボタンから新しい指示を作成してください。
              </p>
            ) : (
              <div className="space-y-4">
                {instructions.map((instruction) => (
                  <Card key={instruction.id} className={`${instruction.isActive ? 'border-green-200' : 'border-gray-200'}`}>
                    <CardContent className="pt-4">
                      {editingInstruction === instruction.id ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div>
                            <Label>タイトル</Label>
                            <Input
                              value={editContent.title}
                              onChange={(e) => setEditContent(prev => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>内容</Label>
                            <Textarea
                              value={editContent.content}
                              onChange={(e) => setEditContent(prev => ({ ...prev, content: e.target.value }))}
                              rows={4}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editContent.useWebSearch}
                              onCheckedChange={(checked) => setEditContent(prev => ({ ...prev, useWebSearch: checked }))}
                            />
                            <Label>Web検索を使用</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(instruction.id)}>
                              <Save className="w-4 h-4 mr-2" />
                              保存
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="w-4 h-4 mr-2" />
                              キャンセル
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{instruction.title}</h3>
                            <div className="flex items-center gap-2">
                              {instruction.isActive ? (
                                <Badge variant="default">有効</Badge>
                              ) : (
                                <Badge variant="secondary">無効</Badge>
                              )}
                              {instruction.useWebSearch && (
                                <Badge variant="outline">Web検索</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {instruction.content}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={instruction.isActive}
                                onCheckedChange={(checked) => toggleInstructionActive(instruction.id, checked)}
                              />
                              <Label className="text-sm">この指示を有効にする</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => startEdit(instruction)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                編集
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteInstruction(instruction.id, instruction.title)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                削除
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
