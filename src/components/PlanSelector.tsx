import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, FileText, Search } from 'lucide-react';
import { PlanType, PLANS } from '@/types/plans';
import { storageService } from '@/utils/storage';
import { useToast } from '@/hooks/use-toast';

interface PlanSelectorProps {
  onPlanChange?: (plan: PlanType) => void;
}

const PlanSelector: React.FC<PlanSelectorProps> = ({ onPlanChange }) => {
  const [currentPlan, setCurrentPlan] = useState<PlanType>('free');
  const { toast } = useToast();

  useEffect(() => {
    const savedPlan = storageService.getUserPlan();
    setCurrentPlan(savedPlan);
  }, []);

  const handlePlanSelect = (planType: PlanType) => {
    setCurrentPlan(planType);
    storageService.saveUserPlan(planType);
    onPlanChange?.(planType);
    
    toast({
      title: "プランを変更しました",
      description: `${PLANS[planType].nameJa}プランに変更されました。`,
    });
  };

  const formatTimeLimit = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分`;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">プラン選択</h3>
        <p className="text-sm text-muted-foreground">
          現在は検証用として無料で選択できます
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(PLANS).map((plan) => (
          <Card 
            key={plan.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              currentPlan === plan.id 
                ? 'ring-2 ring-primary border-primary' 
                : 'border-muted hover:border-primary/50'
            }`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-lg">{plan.nameJa}</CardTitle>
                {currentPlan === plan.id && (
                  <Badge variant="default" className="text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    選択中
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>通話時間: {formatTimeLimit(plan.timeLimit)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <FileText className={`w-4 h-4 ${plan.hasLogAccess ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={plan.hasLogAccess ? '' : 'text-muted-foreground'}>
                    ログ閲覧: {plan.hasLogAccess ? '可能' : '不可'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Search className={`w-4 h-4 ${plan.hasSearchMode ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={plan.hasSearchMode ? '' : 'text-muted-foreground'}>
                    AIサーチ: {plan.hasSearchMode ? '利用可能' : '利用不可'}
                  </span>
                </div>
              </div>
              
              <Button 
                variant={currentPlan === plan.id ? "default" : "outline"}
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect(plan.id);
                }}
              >
                {currentPlan === plan.id ? '選択中' : '選択する'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlanSelector;