
export interface UserInstruction {
  id: string;
  title: string;
  content: string;
  order: number;
  isActive: boolean;
}

export interface CallLog {
  id: string;
  date: string;
  duration: number;
  instructions: UserInstruction[];
  conversation: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export type PlanType = 'free' | 'plus' | 'premium';

export interface UserPlan {
  type: PlanType;
  name: string;
  nameJa: string;
  timeLimit: number; // seconds
  canViewLogs: boolean;
  canUseAdvancedAI: boolean;
  description: string;
}

export const PLAN_CONFIGS: Record<PlanType, UserPlan> = {
  free: {
    type: 'free',
    name: 'Free',
    nameJa: '無料',
    timeLimit: 60, // 1 minute
    canViewLogs: false,
    canUseAdvancedAI: false,
    description: '基本的な朝のアシスタント機能（1分間の会話制限）'
  },
  plus: {
    type: 'plus',
    name: 'Plus',
    nameJa: 'プラス',
    timeLimit: 180, // 3 minutes
    canViewLogs: true,
    canUseAdvancedAI: false,
    description: '通話ログ閲覧可能（3分間の会話制限）'
  },
  premium: {
    type: 'premium',
    name: 'Premium',
    nameJa: 'プレミアム',
    timeLimit: 300, // 5 minutes
    canViewLogs: true,
    canUseAdvancedAI: true,
    description: 'フル機能（5分間の会話制限、リアルタイム情報検索対応）'
  }
};

const STORAGE_KEYS = {
  INSTRUCTIONS: 'morning_assistant_instructions',
  CALL_LOGS: 'morning_assistant_call_logs',
  OPENAI_API_KEY: 'morning_assistant_openai_key',
  USER_PLAN: 'morning_assistant_user_plan'
};

export const storageService = {
  // Instructions management
  getInstructions(): UserInstruction[] {
    const stored = localStorage.getItem(STORAGE_KEYS.INSTRUCTIONS);
    return stored ? JSON.parse(stored) : [];
  },

  saveInstructions(instructions: UserInstruction[]): void {
    localStorage.setItem(STORAGE_KEYS.INSTRUCTIONS, JSON.stringify(instructions));
  },

  addInstruction(instruction: Omit<UserInstruction, 'id'>): void {
    const instructions = this.getInstructions();
    const newInstruction: UserInstruction = {
      ...instruction,
      id: Date.now().toString()
    };
    instructions.push(newInstruction);
    this.saveInstructions(instructions);
  },

  updateInstruction(id: string, updates: Partial<UserInstruction>): void {
    const instructions = this.getInstructions();
    const index = instructions.findIndex(inst => inst.id === id);
    if (index !== -1) {
      instructions[index] = { ...instructions[index], ...updates };
      this.saveInstructions(instructions);
    }
  },

  deleteInstruction(id: string): void {
    const instructions = this.getInstructions();
    const filtered = instructions.filter(inst => inst.id !== id);
    this.saveInstructions(filtered);
  },

  // Call logs management
  getCallLogs(): CallLog[] {
    const stored = localStorage.getItem(STORAGE_KEYS.CALL_LOGS);
    return stored ? JSON.parse(stored) : [];
  },

  saveCallLog(callLog: Omit<CallLog, 'id'>): void {
    const logs = this.getCallLogs();
    const newLog: CallLog = {
      ...callLog,
      id: Date.now().toString()
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(logs));
  },

  // API Key management
  getOpenAIKey(): string | null {
    return localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY);
  },

  saveOpenAIKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, key);
  },

  // Plan management
  getCurrentPlan(): UserPlan {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PLAN);
    const planType: PlanType = stored ? JSON.parse(stored) : 'free';
    return PLAN_CONFIGS[planType];
  },

  setPlan(planType: PlanType): void {
    localStorage.setItem(STORAGE_KEYS.USER_PLAN, JSON.stringify(planType));
  },

  getPlanType(): PlanType {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PLAN);
    return stored ? JSON.parse(stored) : 'free';
  }
};
