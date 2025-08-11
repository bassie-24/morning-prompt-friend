import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Clock, Calendar, Volume2, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { storageService } from '@/utils/storage';
import NotificationService from '@/services/NotificationService';

export interface AlarmSettings {
  id: string;
  enabled: boolean;
  time: string; // HH:MM形式
  days: number[]; // 0=日曜日, 1=月曜日, ... 6=土曜日
  label: string;
  sound: 'default' | 'custom';
  snooze: boolean;
  snoozeDuration: number; // 分単位
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const Alarm = () => {
  const [alarms, setAlarms] = useState<AlarmSettings[]>([]);
  const [isAddingAlarm, setIsAddingAlarm] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<string | null>(null);
  const [newAlarm, setNewAlarm] = useState<Partial<AlarmSettings>>({
    time: '07:00',
    days: [1, 2, 3, 4, 5], // 平日のデフォルト
    label: '朝の準備',
    sound: 'default',
    snooze: true,
    snoozeDuration: 5,
  });
  const [editAlarm, setEditAlarm] = useState<Partial<AlarmSettings>>({});
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);
  
  const { toast } = useToast();
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    // ローカルストレージからアラーム設定を読み込み
    loadAlarms();
    checkNotificationPermission();
  }, []);

  const loadAlarms = () => {
    const savedAlarms = localStorage.getItem('morning_assistant_alarms');
    if (savedAlarms) {
      setAlarms(JSON.parse(savedAlarms));
    }
  };

  const saveAlarms = (updatedAlarms: AlarmSettings[]) => {
    localStorage.setItem('morning_assistant_alarms', JSON.stringify(updatedAlarms));
    setAlarms(updatedAlarms);
  };

  const checkNotificationPermission = async () => {
    const result = await notificationService.requestPermissions();
    setNotificationPermission(result.granted);
  };

  const addAlarm = async () => {
    if (!newAlarm.time || !newAlarm.label) {
      toast({
        title: 'エラー',
        description: '時刻とラベルを入力してください。',
        variant: 'destructive',
      });
      return;
    }

    const alarm: AlarmSettings = {
      id: Date.now().toString(),
      enabled: true,
      time: newAlarm.time!,
      days: newAlarm.days || [],
      label: newAlarm.label!,
      sound: newAlarm.sound || 'default',
      snooze: newAlarm.snooze || false,
      snoozeDuration: newAlarm.snoozeDuration || 5,
    };

    const updatedAlarms = [...alarms, alarm];
    saveAlarms(updatedAlarms);
    
    // 通知をスケジュール
    if (alarm.enabled) {
      await scheduleAlarmNotification(alarm);
    }

    toast({
      title: 'アラームを追加しました',
      description: `${alarm.time} - ${alarm.label}`,
    });

    setIsAddingAlarm(false);
    setNewAlarm({
      time: '07:00',
      days: [1, 2, 3, 4, 5],
      label: '朝の準備',
      sound: 'default',
      snooze: true,
      snoozeDuration: 5,
    });
  };

  const updateAlarm = async (id: string) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;

    const updated = {
      ...alarm,
      ...editAlarm,
    };

    const updatedAlarms = alarms.map(a => a.id === id ? updated : a);
    saveAlarms(updatedAlarms);

    // 通知を再スケジュール
    await cancelAlarmNotification(id);
    if (updated.enabled) {
      await scheduleAlarmNotification(updated);
    }

    toast({
      title: 'アラームを更新しました',
      description: `${updated.time} - ${updated.label}`,
    });

    setEditingAlarm(null);
    setEditAlarm({});
  };

  const deleteAlarm = async (id: string) => {
    const updatedAlarms = alarms.filter(a => a.id !== id);
    saveAlarms(updatedAlarms);
    
    // 通知をキャンセル
    await cancelAlarmNotification(id);

    toast({
      title: 'アラームを削除しました',
    });
  };

  const toggleAlarm = async (id: string, enabled: boolean) => {
    const updatedAlarms = alarms.map(a => 
      a.id === id ? { ...a, enabled } : a
    );
    saveAlarms(updatedAlarms);

    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
      if (enabled) {
        await scheduleAlarmNotification({ ...alarm, enabled });
      } else {
        await cancelAlarmNotification(id);
      }
    }
  };

  const scheduleAlarmNotification = async (alarm: AlarmSettings) => {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    
    // 今日のアラーム時刻を計算
    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);
    
    // 過去の時刻なら明日に設定
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    // 曜日の確認
    const dayOfWeek = alarmTime.getDay();
    if (alarm.days.length > 0 && !alarm.days.includes(dayOfWeek)) {
      // 次の有効な曜日を探す
      for (let i = 1; i <= 7; i++) {
        alarmTime.setDate(alarmTime.getDate() + 1);
        if (alarm.days.includes(alarmTime.getDay())) {
          break;
        }
      }
    }

    const result = await notificationService.scheduleAlarm({
      id: parseInt(alarm.id),
      title: '朝のAIアシスタント',
      body: alarm.label,
      at: alarmTime,
      sound: alarm.sound === 'custom' ? 'alarm_custom.wav' : 'default',
      repeats: alarm.days.length > 0,
      actionTypeId: 'start_call',
      extra: {
        alarmId: alarm.id,
        autoStart: true,
      }
    });

    console.log('📅 アラームをスケジュール:', {
      id: alarm.id,
      time: alarmTime.toLocaleString(),
      result
    });

    return result;
  };

  const cancelAlarmNotification = async (alarmId: string) => {
    const result = await notificationService.cancelAlarm(parseInt(alarmId));
    console.log('❌ アラームをキャンセル:', { alarmId, result });
    return result;
  };

  const formatDays = (days: number[]) => {
    if (days.length === 0) return '1回のみ';
    if (days.length === 7) return '毎日';
    if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return '平日';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return '週末';
    return days.map(d => DAYS_OF_WEEK[d]).join(', ');
  };

  return (
    <div className="min-h-screen morning-gradient p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              設定に戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">アラーム設定</h1>
            <p className="text-muted-foreground">指定時刻に朝のAIアシスタントを起動します</p>
          </div>
        </div>

        {/* 通知権限の確認 */}
        {!notificationPermission && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">通知権限が必要です</p>
                  <p className="text-xs text-muted-foreground">
                    アラーム機能を利用するには通知権限を許可してください。
                  </p>
                </div>
                <Button size="sm" onClick={checkNotificationPermission}>
                  権限を確認
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* アラーム追加フォーム */}
        {isAddingAlarm && (
          <Card className="fade-in">
            <CardHeader>
              <CardTitle>新しいアラーム</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-time">時刻</Label>
                  <input
                    id="new-time"
                    type="time"
                    value={newAlarm.time}
                    onChange={(e) => setNewAlarm({ ...newAlarm, time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <Label htmlFor="new-label">ラベル</Label>
                  <input
                    id="new-label"
                    type="text"
                    value={newAlarm.label}
                    onChange={(e) => setNewAlarm({ ...newAlarm, label: e.target.value })}
                    placeholder="例: 朝の準備"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <Label>繰り返し</Label>
                <div className="flex gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        const days = newAlarm.days || [];
                        if (days.includes(index)) {
                          setNewAlarm({
                            ...newAlarm,
                            days: days.filter(d => d !== index)
                          });
                        } else {
                          setNewAlarm({
                            ...newAlarm,
                            days: [...days, index].sort()
                          });
                        }
                      }}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        (newAlarm.days || []).includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newAlarm.snooze}
                    onCheckedChange={(checked) => setNewAlarm({ ...newAlarm, snooze: checked })}
                  />
                  <Label>スヌーズ機能</Label>
                </div>
                {newAlarm.snooze && (
                  <select
                    value={newAlarm.snoozeDuration}
                    onChange={(e) => setNewAlarm({ ...newAlarm, snoozeDuration: parseInt(e.target.value) })}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="5">5分</option>
                    <option value="10">10分</option>
                    <option value="15">15分</option>
                    <option value="30">30分</option>
                  </select>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={addAlarm} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingAlarm(false);
                    setNewAlarm({
                      time: '07:00',
                      days: [1, 2, 3, 4, 5],
                      label: '朝の準備',
                      sound: 'default',
                      snooze: true,
                      snoozeDuration: 5,
                    });
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* アラームリスト */}
        <Card className="fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>アラーム一覧</CardTitle>
              {!isAddingAlarm && (
                <Button onClick={() => setIsAddingAlarm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  アラームを追加
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alarms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>アラームが設定されていません</p>
                <p className="text-sm mt-2">
                  「アラームを追加」ボタンから新しいアラームを設定してください。
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className={`border rounded-lg p-4 transition-opacity ${
                      !alarm.enabled ? 'opacity-50' : ''
                    }`}
                  >
                    {editingAlarm === alarm.id ? (
                      // 編集モード
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`edit-time-${alarm.id}`}>時刻</Label>
                            <input
                              id={`edit-time-${alarm.id}`}
                              type="time"
                              value={editAlarm.time || alarm.time}
                              onChange={(e) => setEditAlarm({ ...editAlarm, time: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-label-${alarm.id}`}>ラベル</Label>
                            <input
                              id={`edit-label-${alarm.id}`}
                              type="text"
                              value={editAlarm.label || alarm.label}
                              onChange={(e) => setEditAlarm({ ...editAlarm, label: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => updateAlarm(alarm.id)} size="sm">
                            <Save className="w-4 h-4 mr-1" />
                            保存
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingAlarm(null);
                              setEditAlarm({});
                            }}
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-1" />
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={alarm.enabled}
                            onCheckedChange={(checked) => toggleAlarm(alarm.id, checked)}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold">{alarm.time}</span>
                              <Badge variant={alarm.enabled ? 'default' : 'secondary'}>
                                {alarm.enabled ? '有効' : '無効'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{alarm.label}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs">{formatDays(alarm.days)}</span>
                              {alarm.snooze && (
                                <>
                                  <span className="text-xs">•</span>
                                  <Clock className="w-3 h-3" />
                                  <span className="text-xs">スヌーズ {alarm.snoozeDuration}分</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAlarm(alarm.id);
                              setEditAlarm(alarm);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAlarm(alarm.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使い方の説明 */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              アラーム機能について
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 指定時刻になると通知が表示され、タップすると朝のAIアシスタントが起動します</li>
              <li>• 曜日ごとに繰り返し設定が可能です</li>
              <li>• スヌーズ機能を有効にすると、指定時間後に再通知されます</li>
              <li>• アプリがバックグラウンドでも動作します（ネイティブアプリ版）</li>
              <li>• PWA版では通知権限の許可が必要です</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Alarm;