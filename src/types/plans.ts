export type PlanType = 'free' | 'plus' | 'premium';

export interface Plan {
  id: PlanType;
  name: string;
  nameJa: string;
  description: string;
  timeLimit: number; // in seconds
  hasLogAccess: boolean;
  hasSearchMode: boolean;
  price?: number; // for future use
}

export const PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    nameJa: '無料',
    description: '基本的な音声アシスタント機能',
    timeLimit: 60, // 1 minute
    hasLogAccess: false,
    hasSearchMode: false,
    price: 0
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    nameJa: 'プラス',
    description: '通話時間延長 + ログ閲覧',
    timeLimit: 180, // 3 minutes
    hasLogAccess: true,
    hasSearchMode: false,
    price: 500 // for future use
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    nameJa: 'プレミアム',
    description: '全機能利用可能 + AIサーチモード',
    timeLimit: 300, // 5 minutes
    hasLogAccess: true,
    hasSearchMode: true,
    price: 1000 // for future use
  }
};

export const DEFAULT_PLAN: PlanType = 'free';