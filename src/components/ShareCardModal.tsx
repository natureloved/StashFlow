'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Goal } from '@/store/useGoalStore';
import { Copy, Download, X, Share2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ShareCardModalProps {
  goal: Goal;
  milestone: 1 | 25 | 50 | 75 | 100;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCardModal({ goal, milestone, open, onOpenChange }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentAmountUsd = goal.contributions.reduce((acc, c) => acc + c.amountUsd, 0);
  const apy = (goal.vault.analytics.apy.total * 100).toFixed(1);

  const milestoneData = {
    1: { badge: '🌱', title: 'First Step Taken' },
    25: { badge: '🚀', title: 'Journey Started' },
    50: { badge: '🔥', title: 'Halfway Mark' },
    75: { badge: '💎', title: 'Almost There' },
    100: { badge: '🏆', title: 'Goal Unlocked!' }
  }[milestone] as { badge: string; title: string };

  const copyTweetText = () => {
    let text = "";
    if (milestone === 1) {
      text = `Just took my first step towards my ${goal.name} goal! 🌱 Saving on-chain with @stashflow, earning ${apy}% APY. The journey of a thousand miles starts with one click. Powered by @lifiprotocol #DeFi #Stashflow`;
    } else if (milestone === 25) {
      text = `25% of the way to my ${goal.name} goal! 🚀 $${Math.round(currentAmountUsd).toLocaleString()} saved and earning ${apy}% APY automatically with @stashflow. DeFi yield hitting different. @lifiprotocol #DeFi`;
    } else if (milestone === 50) {
      text = `Halfway mark hit for ${goal.name}! 🔥 $${Math.round(currentAmountUsd).toLocaleString()} secured on-chain. My @stashflow yield is already building up. Powered by @lifiprotocol #PassiveIncome #DeFi`;
    } else if (milestone === 75) {
      text = `75% DONE! 💎 Almost reached my ${goal.name} goal with @stashflow. Earning ${apy}% APY while I sleep. On-chain savings at its finest. @lifiprotocol #DeFi #Stashflow`;
    } else {
      text = `GOAL UNLOCKED 🏆 I just hit my ${goal.name} target! $${Math.round(currentAmountUsd).toLocaleString()} saved on-chain with @stashflow, powered by @lifiprotocol. This is what DeFi UX should feel like. #DeFi #Stashflow`;
    }

    navigator.clipboard.writeText(text);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const saveCardImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `stashflow-${goal.name.toLowerCase().replace(/\s+/g, '-')}-${milestone}pct.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#0A0A0F] border-border text-white p-0 overflow-hidden">
        <div className="p-6 space-y-8">
          {/* Milestone Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent via-secondary to-accent rounded-[24px] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <div 
              ref={cardRef}
              className="relative w-full aspect-[400/230] rounded-[22px] bg-gradient-to-br from-[#0A0A0F] to-[#0D1621] border border-white/5 overflow-hidden p-6 sm:p-7 font-display"
            >
              {/* Mesh Gradient / Grid */}
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              
              <div className="relative h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
                      <span className="text-black font-extrabold text-xs">S</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40">STASHFLOW</span>
                  </div>
                  <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold text-white/60">
                    DEFI MILESTONE
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="text-4xl">{milestoneData.badge}</div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">{milestoneData.title}</h2>
                  <p className="text-accent font-bold text-lg">{goal.name}</p>
                </div>

                <div className="space-y-4">
                  <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="absolute top-0 left-0 h-full bg-accent glow-cyan rounded-full"
                      style={{ width: `${milestone}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Saved so far</p>
                      <p className="text-lg font-numeric font-black text-white tracking-tight">${Math.round(currentAmountUsd).toLocaleString()}</p>
                    </div>
                    <div className="text-center space-y-0.5">
                      <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Earning</p>
                      <p className="text-lg font-numeric font-black text-accent tracking-tight">{apy}% APY</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Goal</p>
                      <p className="text-lg font-numeric font-black text-white tracking-tight">${goal.targetAmountUsd.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-[-10px] left-0 right-0 h-4 bg-accent/20 blur-xl opacity-30" />
                <div className="flex justify-center pt-3 border-t border-white/5">
                  <span className="text-[7px] text-gray-700 uppercase font-black tracking-[0.2em]">
                    Saving on-chain with LI.FI Earn • @stashflow
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Button 
               onClick={copyTweetText}
               className="bg-white text-black hover:bg-white/90 font-bold"
             >
               {isCopying ? (
                 <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Copied!</span>
               ) : (
                 <span className="flex items-center gap-2"><Share2 className="w-4 h-4" /> Copy Tweet Text</span>
               )}
             </Button>
             <Button 
               onClick={saveCardImage}
               disabled={isSaving}
               className="bg-accent text-black hover:bg-accent/90 font-bold"
             >
               {isSaving ? (
                 <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
               ) : (
                 <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Save Card Image</span>
               )}
             </Button>
             <Button 
               onClick={() => onOpenChange(false)}
               variant="ghost" 
               className="col-span-2 text-gray-500 hover:text-white"
             >
               ✕ Close
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
  );
}
