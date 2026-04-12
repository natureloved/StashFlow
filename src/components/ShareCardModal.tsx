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

  // For the share card, we show the milestone reached amount, not necessarily the current wallet balance
  // This makes the card look like a true "Milestone Card"
  const amountToDisplay = (goal.targetAmountUsd * milestone) / 100;
  const apy = (goal.vault.analytics.apy.total * 100).toFixed(1);

  const milestoneData = {
    1: { badge: '🌱', title: 'First Step Taken', color: '#00E5FF' },
    25: { badge: '🚀', title: 'Journey Started', color: '#00E5FF' },
    50: { badge: '🔥', title: 'Halfway Mark', color: '#FFB800' },
    75: { badge: '💎', title: 'Almost There', color: '#7C3AED' },
    100: { badge: '🏆', title: 'Goal Unlocked!', color: '#FFB800' }
  }[milestone] as { badge: string; title: string; color: string };

  const copyTweetText = () => {
    let text = "";
    if (milestone === 1) {
      text = `Just took my first step towards my ${goal.name} goal! 🌱 Saving on-chain with @stashflow, earning ${apy}% APY. The journey of a thousand miles starts with one click. Powered by @lifiprotocol #DeFi #Stashflow`;
    } else if (milestone === 25) {
      text = `25% of the way to my ${goal.name} goal! 🚀 $${Math.round(amountToDisplay).toLocaleString()} saved and earning ${apy}% APY automatically with @stashflow. DeFi yield hitting different. @lifiprotocol #DeFi`;
    } else if (milestone === 50) {
      text = `Halfway mark hit for ${goal.name}! 🔥 $${Math.round(amountToDisplay).toLocaleString()} secured on-chain. My @stashflow yield is already building up. Powered by @lifiprotocol #PassiveIncome #DeFi`;
    } else if (milestone === 75) {
      text = `75% DONE! 💎 Almost reached my ${goal.name} goal with @stashflow. Earning ${apy}% APY while I sleep. On-chain savings at its finest. @lifiprotocol #DeFi #Stashflow`;
    } else {
      text = `GOAL UNLOCKED 🏆 I just hit my ${goal.name} target! $${Math.round(amountToDisplay).toLocaleString()} saved on-chain with @stashflow, powered by @lifiprotocol. This is what DeFi UX should feel like. #DeFi #Stashflow`;
    }

    navigator.clipboard.writeText(text);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const saveCardImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    
    // Smooth transition
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0A0A0F', // Explicit background for capture
        scale: 3, // High quality
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // You can modify the clone before capture if needed
          const element = clonedDoc.querySelector('[data-card-container]');
          if (element) {
             (element as HTMLElement).style.borderRadius = '24px';
          }
        }
      });
      
      const link = document.createElement('a');
      link.download = `stashflow-${goal.name.toLowerCase().replace(/\s+/g, '-')}-${milestone}pct.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err: any) {
      console.error('Failed to save image:', err);
      alert('Could not generate image. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-[#0A0A0F]/95 backdrop-blur-2xl border-white/5 text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="p-6 sm:p-8 space-y-8">
          <div className="flex justify-between items-center">
             <div className="space-y-1">
               <h3 className="font-display font-black text-xl tracking-tight uppercase italic underline decoration-accent/30 decoration-4 underline-offset-8">Share Milestone</h3>
               <p className="text-gray-500 text-xs font-body">Download your custom card or share to Twitter</p>
             </div>
             <button onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
               <X className="w-5 h-5 text-gray-500" />
             </button>
          </div>

          {/* Milestone Card Container */}
          <div className="relative group">
            {/* Outer Glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-accent/40 via-secondary/20 to-accent/40 rounded-[32px] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            
            <div 
              ref={cardRef}
              data-card-container
              className="relative w-full min-h-[300px] rounded-[24px] bg-[#0A0A0F] border border-white/10 overflow-hidden p-8 sm:p-10 font-display flex flex-col justify-between shadow-2xl"
            >
              {/* Creative Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 via-transparent to-secondary/5 pointer-events-none" />
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />
              
              {/* Background Watermark Emoji */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none scale-[3] blur-[1px]">
                  {milestoneData.badge}
              </div>

              {/* Card Content Header */}
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                    <span className="text-black font-black text-lg italic">S</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.4em] font-black text-white/50 leading-none">STASHFLOW</span>
                    <span className="block text-[8px] uppercase tracking-[0.2em] font-bold text-accent mt-0.5">Yield Savings</span>
                  </div>
                </div>
                <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-[9px] font-black text-white/60 tracking-widest uppercase italic">
                  DEFI MILESTONE
                </div>
              </div>

              {/* Main Achievement */}
              <div className="relative z-10 text-center py-6">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  {milestoneData.badge}
                </motion.div>
                <h2 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">
                  {milestoneData.title}
                </h2>
                <div className="inline-block px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-accent font-black text-sm uppercase tracking-wider">{goal.name}</p>
                </div>
              </div>

              {/* Data Row */}
              <div className="relative z-10 space-y-6">
                <div className="relative h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${milestone}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-secondary rounded-full"
                    style={{ 
                      boxShadow: `0 0 20px ${milestone >= 50 ? '#FFB800' : '#00E5FF'}80` 
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none">Saved so far</p>
                    <p className="text-2xl font-numeric font-black text-white tracking-tighter leading-none">
                      ${Math.round(amountToDisplay).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10" />
                  <div className="flex-1 text-center space-y-1">
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none">Interest Rate</p>
                    <p className="text-2xl font-numeric font-black text-accent tracking-tighter leading-none italic">{apy}%</p>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10" />
                  <div className="text-right flex-1 space-y-1">
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none">Final Target</p>
                    <p className="text-2xl font-numeric font-black text-white/50 tracking-tighter leading-none">
                      ${goal.targetAmountUsd.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 flex justify-center pt-6 mt-4 border-t border-white/5">
                <span className="text-[8px] text-white/30 uppercase font-black tracking-[0.3em] flex items-center gap-2">
                   Powered by <span className="text-white/60">LI.FI Earn</span> <span className="opacity-30">•</span> @stashflow
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button 
               onClick={copyTweetText}
               className="bg-[#1DA1F2] text-white hover:bg-[#1A91DA] font-black h-14 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95"
             >
               {isCopying ? (
                 <span className="flex items-center gap-3"><Check className="w-5 h-5" /> Text Copied!</span>
               ) : (
                 <span className="flex items-center gap-3 italic"><Share2 className="w-5 h-5" /> Copy Tweet</span>
               )}
             </Button>
             <Button 
               onClick={saveCardImage}
               disabled={isSaving}
               className="bg-white text-black hover:bg-gray-100 font-black h-14 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 border-b-4 border-gray-300"
             >
               {isSaving ? (
                 <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> Rendering...</span>
               ) : (
                 <span className="flex items-center gap-3 italic"><Download className="w-5 h-5" /> Save Image</span>
               )}
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
