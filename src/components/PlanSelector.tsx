
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, FileText, Globe } from 'lucide-react';
import { planService, PlanType, PLANS } from '@/utils/planService';
import { useToast } from '@/hooks/use-toast';

interface PlanSelectorProps {
  currentPlan: PlanType;
  onPlanChange: (plan: PlanType) => void;
}

const PlanSelector: React.FC<PlanSelectorProps> = ({ currentPlan, onPlanChange }) => {
  const { toast } = useToast();

  const handlePlanSelect = (plan: PlanType) => {
    planService.setPlan(plan);
    onPlanChange(plan);
    toast({
      title: "プランを変更しました",
      description: `${PLANS[plan].displayName}プランに変更されました。`
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {(Object.keys(PLANS) as PlanType[]).map((planKey) => {
        const plan = PLANS[planKey];
        const isCurrentPlan = currentPlan === planKey;
        
        return (
          <Card key={planKey} className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                {isCurrentPlan && (
                  <Badge variant="default">現在のプラン</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">通話時間: {plan.maxCallDuration}分</span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.canViewLogs ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">ログ閲覧: {plan.canViewLogs ? '可能' : '不可'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {plan.canUseRealtimeAI ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">リアルタイム情報: {plan.canUseRealtimeAI ? '可能' : '不可'}</span>
                </div>
              </div>
              
              <Button 
                onClick={() => handlePlanSelect(planKey)}
                disabled={isCurrentPlan}
                className="w-full"
                variant={isCurrentPlan ? "outline" : "default"}
              >
                {isCurrentPlan ? '選択中' : '選択する'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PlanSelector;
