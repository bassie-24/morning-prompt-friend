#!/bin/bash

# iOS Deployment Targetを26.0に更新するスクリプト

echo "🔄 iOS Deployment Targetを26.0に更新中..."

# 1. Xcodeプロジェクトファイル内の全ての14.0を26.0に変更
PROJECT_FILE="ios/App/App.xcodeproj/project.pbxproj"

if [ -f "$PROJECT_FILE" ]; then
    echo "📝 $PROJECT_FILE を更新中..."
    sed -i.bak 's/IPHONEOS_DEPLOYMENT_TARGET = 14\.0;/IPHONEOS_DEPLOYMENT_TARGET = 26.0;/g' "$PROJECT_FILE"
    echo "✅ Xcodeプロジェクトファイル更新完了"
else
    echo "❌ エラー: $PROJECT_FILE が見つかりません"
    exit 1
fi

# 2. Podfileの確認（既に26.0になっているはず）
PODFILE="ios/App/Podfile"
if [ -f "$PODFILE" ]; then
    if grep -q "platform :ios, '26.0'" "$PODFILE"; then
        echo "✅ Podfile は既に iOS 26.0 に設定済み"
    else
        echo "⚠️  Podfile のiOSバージョンを確認してください"
    fi
fi

# 3. CocoaPodsの再インストール
echo "🔄 CocoaPodsを再インストール中..."
cd ios/App
if command -v pod &> /dev/null; then
    pod install
    echo "✅ CocoaPods再インストール完了"
else
    echo "⚠️  CocoaPodsがインストールされていません。手動で 'pod install' を実行してください"
fi

cd ../..

echo "🎉 iOS Deployment Target の更新が完了しました!"
echo ""
echo "📋 次のステップ:"
echo "1. Xcodeでプロジェクトを開いて設定を確認"
echo "2. iOS 18.0以上のシミュレーターでテスト"
echo "3. AlarmKit機能を再テスト"