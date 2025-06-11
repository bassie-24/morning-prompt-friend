
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { storageService, CallLog as CallLogType } from '@/utils/storage';
import { planService } from '@/utils/planService';
import { ArrowLeft, Clock, MessageSquare, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const CallLog = () => {
  const [logs, setLogs] = useState<CallLogType[]>([]);
  const planFeatures = planService.getPlanFeatures();

  useEffect(() => {
    if (planFeatures.canViewLogs) {
      const callLogs = storageService.getCallLogs();
      setLogs(callLogs);
    }
  }, [planFeatures.canViewLogs]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  if (!planFeatures.canViewLogs) {
    return (
      <div className="min-h-screen morning-gradient p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">通話ログ</h1>
              <p className="text-muted-foreground">通話履歴を確認できます</p>
            </div>
          </div>

          <Card className="fade-in">
            <CardContent className="p-8 text-center">
              <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">ログ機能はプラス以上のプランで利用できます</h2>
              <p className="text-muted-foreground mb-4">
                現在のプラン: {planFeatures.displayName}
              </p>
              <Link to="/settings">
                <Button>プランをアップグレード</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-foreground">通話ログ</h1>
            <p className="text-muted-foreground">通話履歴を確認できます</p>
          </div>
        </div>

        {/* Logs List */}
        {logs.length === 0 ? (
          <Card className="fade-in">
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">まだ通話ログがありません</h2>
              <p className="text-muted-foreground">
                朝のアシスタントとの通話を開始すると、ここに履歴が表示されます。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="fade-in">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {formatDate(log.date)}
                      </CardTitle>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(log.duration)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {log.conversation.length / 2} 回の会話
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Active Instructions */}
                  <div>
                    <h4 className="font-medium mb-2">使用した指示</h4>
                    <div className="flex flex-wrap gap-2">
                      {log.instructions.map((instruction) => (
                        <Badge key={instruction.id} variant="secondary">
                          {instruction.title}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Conversation */}
                  <div>
                    <h4 className="font-medium mb-2">会話内容</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {log.conversation.map((message, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary/10 ml-8'
                              : 'bg-secondary/10 mr-8'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm">{message.content}</p>
                            <Badge variant="outline" className="text-xs">
                              {message.role === 'user' ? 'あなた' : 'AI'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallLog;
