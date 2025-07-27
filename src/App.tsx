
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlanProvider } from "@/contexts/PlanContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import CallLog from "./pages/CallLog";
import NotFound from "./pages/NotFound";
import { registerSW } from 'virtual:pwa-register';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // PWA Service Worker の自動更新設定
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('新しいバージョンが利用可能です');
        // 自動更新を実行
        updateSW(true);
      },
      onOfflineReady() {
        console.log('アプリがオフラインで利用可能になりました');
      },
      onRegisterError(error) {
        console.log('Service Worker登録エラー:', error);
      },
    });
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
