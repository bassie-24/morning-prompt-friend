
export type PlanType = 'free' | 'plus' | 'premium';

export interface PlanFeatures {
  name: string;
  displayName: string;
  maxCallDuration: number; // 分
  canViewLogs: boolean;
  canUseRealtimeAI: boolean;
  description: string;
}

export const PLANS: Record<PlanType, PlanFeatures> = {
  free: {
    name: 'free',
    displayName: '無料',
    maxCallDuration: 1,
    canViewLogs: false,
    canUseRealtimeAI: false,
    description: '基本的な朝のアシスタント機能'
  },
  plus: {
    name: 'plus',
    displayName: 'プラス',
    maxCallDuration: 3,
    canViewLogs: true,
    canUseRealtimeAI: false,
    description: '通話時間延長とログ機能'
  },
  premium: {
    name: 'premium',
    displayName: 'プレミアム',
    maxCallDuration: 5,
    canViewLogs: true,
    canUseRealtimeAI: true,
    description: 'フル機能とリアルタイム情報アクセス'
  }
};

const STORAGE_KEY = 'morning_assistant_plan';

export const planService = {
  getCurrentPlan(): PlanType {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as PlanType) || 'free';
  },

  setPlan(plan: PlanType): void {
    localStorage.setItem(STORAGE_KEY, plan);
  },

  getPlanFeatures(plan?: PlanType): PlanFeatures {
    const currentPlan = plan || this.getCurrentPlan();
    return PLANS[currentPlan];
  },

  canAccessFeature(feature: keyof PlanFeatures): boolean {
    const features = this.getPlanFeatures();
    return features[feature] as boolean;
  }
};
