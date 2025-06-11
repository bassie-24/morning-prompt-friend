
import { PlanType, DEFAULT_PLAN } from '@/types/plans';

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
  getUserPlan(): PlanType {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PLAN);
    return stored ? (stored as PlanType) : DEFAULT_PLAN;
  },

  saveUserPlan(plan: PlanType): void {
    localStorage.setItem(STORAGE_KEYS.USER_PLAN, plan);
  }
};
