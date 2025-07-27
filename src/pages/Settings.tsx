import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Settings = () => {
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

        {/* Coming Soon Card */}
        <Card className="fade-in">
          <CardHeader>
            <CardTitle>設定ページ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              設定機能は現在開発中です。PWA機能のテストが完了次第、すべての設定機能を復元いたします。
            </p>
            <div className="mt-4">
              <Link to="/">
                <Button>
                  メインページに戻る
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
