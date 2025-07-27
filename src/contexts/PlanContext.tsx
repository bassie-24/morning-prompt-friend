import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storageService, UserPlan, PlanType, PLAN_LIMITS } from '@/utils/storage';

interface PlanContextType {
  userPlan: UserPlan;
  updatePlan: (planType: UserPlan) => void;
  planLimits: typeof PLAN_LIMITS[keyof typeof PLAN_LIMITS];
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};

interface PlanProviderProps {
  children: ReactNode;
}

export const PlanProvider: React.FC<PlanProviderProps> = ({ children }) => {
  const [userPlan, setUserPlan] = useState<UserPlan>(() => storageService.getUserPlan());

  const updatePlan = (planType: UserPlan) => {
    storageService.setUserPlan(planType);
    setUserPlan(planType);
  };

  // UserPlanをPLAN_LIMITSのキーにマッピング
  const getPlanLimits = (plan: UserPlan) => {
    if (plan === 'premium') return PLAN_LIMITS.premium;
    return PLAN_LIMITS.free; // デフォルトは free
  };

  const planLimits = getPlanLimits(userPlan);

  useEffect(() => {
    // 初期プランがない場合はfreeプランを設定
    const storedPlan = storageService.getUserPlan();
    setUserPlan(storedPlan);
  }, []);

  return (
    <PlanContext.Provider value={{ userPlan, updatePlan, planLimits }}>
      {children}
    </PlanContext.Provider>
  );
};