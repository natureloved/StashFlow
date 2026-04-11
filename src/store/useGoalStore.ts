import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { Vault } from '@/lib/lifi';

export interface Contribution {
  id: string;
  date: string;
  amountUsd: number;
  txHash: string;
  fromChain: number;
  fromToken: string;
}

export interface Goal {
  id: string;
  ownerAddress: string;
  name: string;
  targetAmountUsd: number;
  targetDate?: string;
  riskTier: 'safe' | 'balanced' | 'degen';
  vault: Vault;
  contributions: Contribution[];
  createdAt: string;
}

interface GoalState {
  goals: Goal[];
  _hasHydrated: boolean;
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
  addContribution: (goalId: string, contribution: Contribution) => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      goals: [],
      _hasHydrated: false,
      addGoal: (goal) =>
        set((state) => ({ goals: [...state.goals, goal] })),
      updateGoal: (goalId, updates) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId ? { ...g, ...updates } : g
          ),
        })),
      deleteGoal: (goalId) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== goalId),
        })),
      addContribution: (goalId, contribution) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? { ...g, contributions: [...g.contributions, contribution] }
              : g
          ),
        })),
    }),
    {
      name: 'stashflow-goals',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);
