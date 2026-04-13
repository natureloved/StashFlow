'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DepositModal } from '@/components/DepositModal';
import { EducationPopover } from '@/components/EducationPopover';
import { HelpCircle as InfoCircle } from 'lucide-react';
import { Goal } from '@/store/useGoalStore';
import { TrendingUp, Plus, HelpCircle, Trash2, AlertTriangle, X, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useGoalStore } from '@/store/useGoalStore';
import { MilestoneBadge } from '@/components/MilestoneBadge';
import { VaultSafetyModal } from '@/components/VaultSafetyModal';
import { getYieldEquivalent } from '@/lib/yield-utils';
import { calculateGoalCompletionDate, formatCompletionDate } from '@/lib/projection-utils';

interface GoalCardProps {
  goal: Goal;
  onAddFunds: () => void;
}

function DeleteConfirmModal({ goalName, onConfirm, onCancel }: { goalName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-[#0F0F18] border border-red-500/20 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.15)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-red-500/10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg">Remove Goal</h3>
                <p className="text-xs text-gray-500 font-body">"{goalName}"</p>
              </div>
            </div>
            <button onClick={onCancel} className="text-gray-600 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Warning */}
          <div className="p-6 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-400">Withdraw your funds first!</p>
                <p className="text-xs text-gray-400 font-body leading-relaxed">
                  This only removes the goal from your dashboard. Your funds
                  <span className="text-white font-bold"> will remain locked in the vault</span> until
                  you manually withdraw them — even after this goal is deleted.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-400 font-body">
              To safely exit, go into this goal, <span className="text-white font-bold">withdraw all funds</span>, then delete it.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-2">
            <Button
              onClick={onConfirm}
              className="w-full bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 font-bold rounded-xl transition-all"
            >
              I understand — delete anyway
            </Button>
            <Button
              onClick={onCancel}
              className="w-full bg-accent text-black hover:bg-accent/90 font-bold rounded-xl"
            >
              Go back & withdraw funds first
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function GoalCard({ goal, onAddFunds }: GoalCardProps) {
  const deleteGoal = useGoalStore(state => state.deleteGoal);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const currentSaved = goal.contributions.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const progress = Math.min((currentSaved / goal.targetAmountUsd) * 100, 100);
  
  const apy = goal.vault.analytics?.apy?.total ?? 0;
  const yearlyYield = currentSaved * (apy / 100);
  const monthlyYield = yearlyYield / 12;
  
  // Custom Subscription State
  const [customSubscription, setCustomSubscription] = useState<{name: string, price: number} | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`stashflow_sub_${goal.id}`);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const presets = [
    { name: 'Coffee', price: 4, emoji: '☕' },
    { name: 'Spotify Premium', price: 6, emoji: '🎵' },
    { name: 'Netflix Plan', price: 15, emoji: '🎬' },
    { name: 'Gym Membership', price: 25, emoji: '💪' },
    { name: 'Phone Bill', price: 50, emoji: '📱' }
  ];

  const handleSelectPreset = (p: any) => {
    setCustomSubscription(p);
    localStorage.setItem(`stashflow_sub_${goal.id}`, JSON.stringify(p));
    setIsPickerOpen(false);
  };

  // Dynamic Projection Logic
  const remaining = Math.max(goal.targetAmountUsd - currentSaved, 0);
  const weeklySave = remaining > 0 ? Math.ceil(remaining / 52) : 0;
  const completionDate = calculateGoalCompletionDate(currentSaved, goal.targetAmountUsd, apy / 100, weeklySave || 50);
  const completionStr = formatCompletionDate(completionDate);

  return (
    <>
      {isDeleteModalOpen && (
        <DeleteConfirmModal
          goalName={goal.name}
          onConfirm={() => {
            deleteGoal(goal.id);
            setIsDeleteModalOpen(false);
          }}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}

      <Card className="glass-card flex flex-col gap-4 md:gap-6 relative !overflow-visible group border-border hover:border-accent/50 transition-colors h-full">
        <Link href={`/dashboard/goals/${goal.id}`} className="px-3 py-4 md:p-6 pb-0 flex flex-col gap-4 md:gap-6 flex-grow">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/5 rounded-full blur-3xl transition-all group-hover:bg-accent/10" />

          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MilestoneBadge progress={progress} />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-1 text-gray-600 hover:text-red-500 transition-colors"
                  title="Remove goal tracking"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="font-kalam text-3xl font-bold tracking-tight text-white mb-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {goal.name || 'Untitled Goal'}
              </h3>
              <div className="text-sm text-gray-400 font-body">
                Target <span className="font-numeric font-bold">${goal.targetAmountUsd.toLocaleString()}</span>
              </div>
            </div>
            <Badge className="bg-accent/10 text-accent border-accent/20 px-3 py-1 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <EducationPopover 
                id="apy" 
                term={<span className="font-numeric font-bold uppercase text-[10px] tracking-tight">Live: {apy.toFixed(2)}% APY</span>}
              >
                APY means you earn {apy.toFixed(2)}% of your deposit 
                per year, paid continuously. $1,000 today becomes 
                ~${(1000 * (1 + apy / 100)).toLocaleString()} in a year — automatically, no action needed.
              </EducationPopover>
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm font-body">
              <span className="text-gray-400">
                <span className="text-white font-numeric font-bold">${currentSaved.toLocaleString()}</span> saved
              </span>
              <span className="text-accent font-numeric font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-3 w-full bg-surface rounded-full overflow-hidden border border-border">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-secondary rounded-full shadow-[0_0_15px_rgba(255,184,0,0.5)]"
              />
            </div>
          </div>

          <div className="bg-[#0A0A0F]/50 p-4 rounded-xl border border-white/5 space-y-3 relative group/yield">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-accent uppercase font-black tracking-widest">
                <TrendingUp className="w-3 h-3" /> Yield Equivalent
              </div>
              <div className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">
                PASSIVE
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-body text-gray-300 leading-snug">
                Monthly yield: <span className="text-white font-bold">~${monthlyYield.toFixed(2)}</span> · 
                That's <span className="text-accent font-bold underline decoration-accent/30 lowercase">
                  {customSubscription 
                    ? `a ${customSubscription.name}` 
                    : getYieldEquivalent(monthlyYield)}
                </span> each month 🎁
              </div>
              
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsPickerOpen(!isPickerOpen);
                  }}
                  className="text-[10px] text-gray-500 hover:text-accent transition-colors flex items-center gap-1 font-bold"
                >
                  <Settings2 className="w-2.5 h-2.5" /> 
                  {customSubscription ? "Change preference →" : "Not your subscription? Pick one →"}
                </button>

                <AnimatePresence>
                  {isPickerOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-2 w-48 bg-[#0F0F18] border border-border rounded-xl shadow-2xl p-2 z-50 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest p-2 border-b border-border/50 mb-1">
                        Select Preference
                      </div>
                      <div className="space-y-1">
                        {presets.map((p) => (
                          <button
                            key={p.name}
                            onClick={() => handleSelectPreset(p)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between group"
                          >
                            <span className="text-xs text-gray-300 group-hover:text-white">{p.emoji} {p.name}</span>
                            <span className="text-[10px] text-gray-500">${p.price}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setCustomSubscription(null);
                            localStorage.removeItem(`stashflow_sub_${goal.id}`);
                            setIsPickerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 text-[10px] font-bold mt-1"
                        >
                          Reset to Auto-detect
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/10">
            <div className="text-[10px] text-secondary uppercase font-black tracking-widest mb-1 flex items-center gap-1">
              <Plus className="w-2.5 h-2.5" /> Projections
            </div>
            <p className="text-sm font-body text-gray-300">
              Recommend <span className="text-white font-bold">${weeklySave}/wk</span> to reach your goal by <span className="text-secondary font-bold">{completionStr}</span>.
            </p>
          </div>
        </Link>

        <div className="px-4 md:px-6 py-3 flex items-center justify-between border-t border-border mt-auto font-body">
          <div className="min-w-0 flex-1 mr-3">
            <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1 mb-0.5">
              Vault Info 
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSafetyModalOpen(true);
                }}
                className="text-gray-400 hover:text-accent transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-300 flex-wrap">
              <EducationPopover 
                id="protocol" 
                term={goal.vault.protocol.name}
              >
                {goal.vault.protocol.name} is the protocol managing your 
                yield. It's a smart contract running on the blockchain 
                — no company controls your funds.
              </EducationPopover>
              <span className="text-gray-600">•</span>
              <span className="capitalize text-gray-300">{goal.vault.network}</span>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-accent text-black hover:bg-accent/90 font-bold px-4 flex-shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddFunds?.();
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Funds
          </Button>
        </div>

        <VaultSafetyModal 
          vault={goal.vault as any} 
          open={isSafetyModalOpen} 
          onOpenChange={setIsSafetyModalOpen} 
        />
      </Card>
    </>
  );
}
