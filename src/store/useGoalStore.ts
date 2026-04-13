import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vault } from '@/lib/lifi';
import { supabase, GOALS_TABLE } from '@/lib/supabase';

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
  updateVaults: (vaultUpdates: Record<string, any>) => void;
  fetchGoalsForUser: (address: string) => Promise<void>;
  syncGoalToCloud: (goal: Goal) => Promise<void>;
  syncAllGoalsToCloud: (address: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      goals: [],
      _hasHydrated: false,
      addGoal: (goal) => {
        set((state) => ({ goals: [...state.goals, goal] }));
        useGoalStore.getState().syncGoalToCloud(goal);
      },
      updateGoal: (goalId, updates) =>
        set((state) => {
          const updatedGoals = state.goals.map((g) =>
            g.id === goalId ? { ...g, ...updates } : g
          );
          const target = updatedGoals.find(g => g.id === goalId);
          if (target) useGoalStore.getState().syncGoalToCloud(target);
          return { goals: updatedGoals };
        }),
      deleteGoal: (goalId) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== goalId),
        }));
        // Background delete from cloud
        if (supabase) {
          supabase.from(GOALS_TABLE).delete().eq('id', goalId).then(({ error }) => {
            if (error) console.error('Cloud Delete Error:', error);
          });
        }
      },
      addContribution: (goalId, contribution) => {
        set((state) => {
          const updatedGoals = state.goals.map((g) =>
            g.id === goalId
              ? { ...g, contributions: [...g.contributions, contribution] }
              : g
          );
          
          // Background sync
          const targetGoal = updatedGoals.find(g => g.id === goalId);
          if (targetGoal) {
            useGoalStore.getState().syncGoalToCloud(targetGoal);
          }
          
          return { goals: updatedGoals };
        });
      },
      updateVaults: (vaultUpdates) => 
        set((state) => ({
          goals: state.goals.map((g) => {
            const key = `${g.vault.chainId}-${g.vault.address.toLowerCase()}`;
            if (vaultUpdates[key]) {
              return { ...g, vault: { ...g.vault, analytics: vaultUpdates[key] } };
            }
            return g;
          })
        })),
      syncGoalToCloud: async (goal) => {
        if (!supabase) return;
        try {
          const { error } = await supabase
            .from(GOALS_TABLE)
            .upsert({
              id: goal.id,
              owner_address: goal.ownerAddress.toLowerCase(),
              name: goal.name,
              target_amount_usd: goal.targetAmountUsd,
              vault: goal.vault,
              risk_tier: goal.riskTier,
              contributions: goal.contributions,
              updated_at: new Date().toISOString()
            });
          if (error) console.error('Cloud Sync Error:', error);
        } catch (e) {
          console.error('Failed to sync goal to cloud', e);
        }
      },
      fetchGoalsForUser: async (address) => {
        if (!supabase || !address) return;
        try {
          const { data, error } = await supabase
            .from(GOALS_TABLE)
            .select('*')
            .eq('owner_address', address.toLowerCase());
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            const mappedGoals: Goal[] = data.map(row => ({
              id: row.id,
              ownerAddress: row.owner_address,
              name: row.name,
              targetAmountUsd: row.target_amount_usd,
              riskTier: row.risk_tier,
              vault: row.vault,
              contributions: row.contributions || [],
              createdAt: row.created_at
            }));

            // Merge with local goals to avoid dupes, prioritizing cloud
            set((state) => {
              const newGoals = [...state.goals];
              
              mappedGoals.forEach(cloudGoal => {
                const idx = newGoals.findIndex(g => g.id === cloudGoal.id);
                if (idx !== -1) {
                  newGoals[idx] = cloudGoal; // Overwrite local with cloud
                } else {
                  newGoals.push(cloudGoal);
                }
              });
              
              return { goals: newGoals };
            });
          }
        } catch (e) {
          console.error('Failed to fetch user goals', e);
        }
      },
      syncAllGoalsToCloud: async (address) => {
        if (!supabase || !address) return;
        const state = useGoalStore.getState();
        const userGoals = state.goals.filter(g => g.ownerAddress.toLowerCase() === address.toLowerCase());
        
        if (userGoals.length === 0) return;

        try {
          // Bulk upsert all local goals for this user
          const rows = userGoals.map(g => ({
            id: g.id,
            owner_address: g.ownerAddress.toLowerCase(),
            name: g.name,
            target_amount_usd: g.targetAmountUsd,
            vault: g.vault,
            risk_tier: g.riskTier,
            contributions: g.contributions,
            updated_at: new Date().toISOString()
          }));

          const { error } = await supabase.from(GOALS_TABLE).upsert(rows);
          if (error) throw error;
          console.log(`Successfully migrated ${rows.length} goals to cloud.`);
        } catch (e) {
          console.error('Failed to migrate local goals to cloud', e);
        }
      },
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
