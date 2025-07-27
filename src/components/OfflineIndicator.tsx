import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // オンラインに戻った時は一時的に表示してから隠す
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初期状態でオフラインの場合は表示
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) {
    return null;
  }

  return (
    <div className={`offline-indicator ${showIndicator ? 'show' : ''} ${isOnline ? 'bg-green-500 text-green-900' : 'bg-yellow-500 text-yellow-900'}`}>
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>オンラインに戻りました</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>オフラインモードで動作中</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator; 