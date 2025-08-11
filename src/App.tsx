
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlanProvider } from "@/contexts/PlanContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import { initializePlatform, getPlatformInfo, platformLog } from "@/utils/platformUtils";
import NotificationService from "@/services/NotificationService";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import CallLog from "./pages/CallLog";
import Alarm from "./pages/Alarm";
import NotFound from "./pages/NotFound";
import { registerSW } from 'virtual:pwa-register';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // プラットフォーム初期化
        await initializePlatform();
        const platform = getPlatformInfo();
        
        platformLog('App initialized', {
          platform: platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : platform.isPWA ? 'PWA' : 'Web',
          isNative: platform.isNative,
          isDev: import.meta.env.DEV
        });

        // 通知サービス初期化（ネイティブまたはPWA環境）
        if (platform.isNative || platform.isPWA) {
          const notificationService = NotificationService.getInstance();
          const initialized = await notificationService.initialize();
          platformLog('Notification service initialized:', initialized);
        }

        // PWA Service Worker 設定（Web/PWA環境）
        if (!platform.isNative) {
          const updateSW = registerSW({
            onNeedRefresh() {
              platformLog('新しいバージョンが利用可能です');
              updateSW(true);
            },
            onOfflineReady() {
              platformLog('アプリがオフラインで利用可能になりました');
            },
            onRegisterError(error) {
              platformLog('Service Worker登録エラー:', error);
            },
          });
        }

      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PlanProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <BrowserRouter>
                    <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/logs" element={<CallLog />} />
          <Route path="/alarm" element={<Alarm />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
          </BrowserRouter>
          <PWAInstallPrompt />
        </TooltipProvider>
      </PlanProvider>
    </QueryClientProvider>
  );
};

export default App;
