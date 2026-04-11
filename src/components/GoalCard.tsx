'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Goal } from '@/store/useGoalStore';
import { TrendingUp, Plus, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { MilestoneBadge } from '@/components/MilestoneBadge';
import { getYieldEquivalent } from '@/lib/yield-utils';
import { calculateGoalCompletionDate, formatCompletionDate } from '@/lib/projection-utils';

interface GoalCardProps {
  goal: Goal;
  onAddFunds: () => void;
}

export function GoalCard({ goal, onAddFunds }: GoalCardProps) {
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const currentSaved = goal.contributions.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const progress = Math.min((currentSaved / goal.targetAmountUsd) * 100, 100);
  
  const apy = goal.vault.analytics.apy.total;
  const yearlyYield = currentSaved * apy;
  const monthlyYield = yearlyYield / 12;

  // Projection logic
  const weeklySave = 50; // Default coach assumption
  const completionDate = calculateGoalCompletionDate(currentSaved, goal.targetAmountUsd, apy, weeklySave);
  const completionStr = formatCompletionDate(completionDate);

  return (
    <Card className="glass-card flex flex-col gap-4 md:gap-6 relative overflow-visible group border-border hover:border-accent/50 transition-colors h-full">
      <Link href={`/dashboard/goals/${goal.id}`} className="px-3 py-4 md:p-6 pb-0 flex flex-col gap-4 md:gap-6 flex-grow">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/5 rounded-full blur-3xl transition-all group-hover:bg-accent/10" />

        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <MilestoneBadge progress={progress} />
            <h3 className="font-display text-2xl font-bold tracking-tight text-white mb-1">
              {goal.name || 'Untitled Goal'}
            </h3>
            <div className="text-sm text-gray-400 font-body">
              Target <span className="font-numeric font-bold">${goal.targetAmountUsd.toLocaleString()}</span>
            </div>
          </div>
          <Badge className="bg-accent/10 text-accent border-accent/20 px-3 py-1">
            <EducationPopover 
              id="apy" 
              term={<span className="font-numeric font-bold">{Math.round(apy * 1000) / 10}% APY</span>}
            >
              APY means you earn {Math.round(apy * 1000) / 10}% of your deposit 
              per year, paid continuously. $1,000 today becomes 
              ~${(1000 * (1 + apy)).toLocaleString()} in a year — automatically, no action needed.
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

        <div className="bg-[#0A0A0F]/50 p-4 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-tighter font-bold">
              <TrendingUp className="w-3 h-3 text-accent" /> Yield Insight
            </div>
            <div className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-bold">
              PASSIVE
            </div>
          </div>
          <div className="text-sm font-body text-gray-300 leading-snug">
            Your yield is currently covering <span className="text-secondary font-bold">{getYieldEquivalent(monthlyYield)}</span>
          </div>
        </div>

        <div className="bg-accent/5 p-4 rounded-xl border border-accent/10">
          <div className="text-[10px] text-accent/70 uppercase font-black tracking-widest mb-1 flex items-center gap-1">
            <Plus className="w-2.5 h-2.5" /> Coach Insight
          </div>
          <p className="text-sm font-body text-gray-300">
            Add <span className="text-white font-bold">${weeklySave}/wk</span> to reach your goal by <span className="text-accent font-bold">{completionStr}</span>.
          </p>
        </div>
      </Link>

      <div className="p-4 md:p-6 pt-2 flex items-center justify-between border-t border-border mt-auto">
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
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
          <div className="flex items-center gap-2 text-xs">
            <EducationPopover 
              id="protocol" 
              term={goal.vault.protocol.name}
            >
              {goal.vault.protocol.name} is the protocol managing your 
              yield. It's a smart contract running on the blockchain 
              — no company controls your funds.
            </EducationPopover>
            <span className="text-gray-500">•</span>
            <span className="capitalize">{goal.vault.network}</span>
          </div>
        </div>
        <Button 
          size="sm" 
          className="bg-accent text-black hover:bg-accent/90 font-bold px-4"
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
  );
}
