
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { storageService, CallLog } from '@/utils/storage';
import { usePlan } from '@/contexts/PlanContext';
import { ArrowLeft, ChevronDown, ChevronRight, Clock, MessageSquare, Calendar, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const CallLogPage = () => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const { planLimits } = usePlan();

  useEffect(() => {
    const logs = storageService.getCallLogs();
    setCallLogs(logs);
  }, []);

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
            <h1 className="text-3xl font-bold text-foreground">通話ログ</h1>
            <p className="text-muted-foreground">過去の通話履歴を確認できます</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="fade-in">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{callLogs.length}</div>
              <div className="text-sm text-muted-foreground">総通話回数</div>
            </CardContent>
          </Card>
          <Card className="fade-in">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {callLogs.reduce((total, log) => total + log.duration, 0) > 0 
                  ? formatDuration(callLogs.reduce((total, log) => total + log.duration, 0))
                  : '0分0秒'}
              </div>
              <div className="text-sm text-muted-foreground">総通話時間</div>
            </CardContent>
          </Card>
          <Card className="fade-in">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {callLogs.length > 0 
                  ? Math.round(callLogs.reduce((total, log) => total + log.duration, 0) / callLogs.length)
                  : 0}秒
              </div>
              <div className="text-sm text-muted-foreground">平均通話時間</div>
            </CardContent>
          </Card>
        </div>

        {/* Call Logs */}
        <div className="space-y-4">
          {!planLimits.hasLogAccess ? (
            <Card className="fade-in">
              <CardContent className="p-8 text-center">
                <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">ログアクセスが制限されています</h3>
                <p className="text-muted-foreground mb-4">
                  通話ログを閲覧するにはプラス以上のプランが必要です。
                </p>
                <Link to="/settings">
                  <Button>
                    プランを変更する
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : callLogs.length === 0 ? (
            <Card className="fade-in">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">まだ通話履歴がありません</h3>
                <p className="text-muted-foreground">
                  初回の通話を行うと、ここに履歴が表示されます。
                </p>
              </CardContent>
            </Card>
          ) : (
            callLogs.map((log) => (
              <Card key={log.id} className="fade-in">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {formatDate(log.date)}
                            </CardTitle>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {formatDuration(log.duration)}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MessageSquare className="w-4 h-4" />
                                {log.conversation.length}メッセージ
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(log.id);
                          }}
                        >
                          詳細を見る
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-6">
                        {/* Instructions Used */}
                        <div>
                          <h4 className="font-semibold mb-3">使用された指示</h4>
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
                          <h4 className="font-semibold mb-3">会話内容</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {log.conversation.map((message, index) => (
                              <div
                                key={index}
                                className={`flex ${
                                  message.role === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg p-3 ${
                                    message.role === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <div className="text-sm">{message.content}</div>
                                  <div className="text-xs opacity-70 mt-1">
                                    {formatTime(message.timestamp)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CallLogPage;
