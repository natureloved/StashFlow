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
    
    // Give more time for styles and fonts to settle
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0A0A0F',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: true, // Helpful for debugging
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
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
      // More descriptive error for logging
      alert(`Could not generate image: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-[#0A0A0F]/95 backdrop-blur-3xl border-white/5 text-white p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]">
        <div className="p-6 sm:p-8 space-y-8">
          <div className="flex justify-between items-center">
             <div className="space-y-1">
               <h3 className="font-display font-black text-xl tracking-tight uppercase italic decoration-accent/30 decoration-4 underline-offset-8">Share Milestone</h3>
               <p className="text-gray-500 text-xs font-body font-medium">Download your custom card or share your success</p>
             </div>
             <button onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
               <X className="w-5 h-5 text-gray-400" />
             </button>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent via-secondary to-accent rounded-[32px] blur-2xl opacity-10 group-hover:opacity-25 transition duration-1000"></div>
            
            <div 
              ref={cardRef}
              data-card-container
              className="relative w-full min-h-[340px] rounded-[24px] bg-[#0A0A0F] border border-white/10 overflow-hidden p-8 sm:p-10 font-body flex flex-col justify-between shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.08),transparent_50%)] pointer-events-none" />
              <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,rgba(255,184,0,0.08),transparent_50%)] pointer-events-none" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] select-none pointer-events-none scale-[4] blur-[1px]">
                  {milestoneData.badge}
              </div>

              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.4)]">
                    <span className="text-black font-black text-xl italic">S</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase tracking-[0.4em] font-black text-white/70 leading-none">STASHFLOW</span>
                    <span className="block text-[8px] uppercase tracking-[0.2em] font-bold text-accent mt-1">On-Chain Wealth</span>
                  </div>
                </div>
                <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black text-white/50 tracking-widest uppercase italic">
                  DEFI MILESTONE
                </div>
              </div>

              <div className="relative z-10 text-center py-6">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  {milestoneData.badge}
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase leading-none mb-3">
                  {milestoneData.title}
                </h2>
                <div className="inline-block px-4 py-1.5 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md">
                  <p className="text-accent font-black text-sm uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,229,255,0.3)]">{goal.name}</p>
                </div>
              </div>

              <div className="relative z-10 space-y-6">
                <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${milestone}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent via-secondary to-accent bg-[length:200%_auto] animate-gradient-x rounded-full shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none">Status</p>
                    <p className="text-2xl font-black text-white tracking-tighter leading-none">
                      {milestone}%
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none">APY</p>
                    <p className="text-2xl font-black text-accent tracking-tighter leading-none italic drop-shadow-[0_0_5px_rgba(0,229,255,0.2)]">{apy}%</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none">Saved</p>
                    <p className="text-2xl font-black text-white tracking-tighter leading-none">
                      ${Math.round(amountToDisplay).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 flex justify-center pt-6 mt-4 border-t border-white/5">
                <span className="text-[9px] text-white/20 uppercase font-black tracking-[0.4em] flex items-center gap-2">
                   Visualizing your yield as <span className="text-white/40">real-world value</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button 
               onClick={copyTweetText}
               className="bg-[#1DA1F2] text-white hover:bg-[#1A91DA] font-black h-16 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 group"
             >
               {isCopying ? (
                 <span className="flex items-center gap-3"><Check className="w-5 h-5" /> Copied!</span>
               ) : (
                 <span className="flex items-center gap-3 italic"><Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Copy Text</span>
               )}
             </Button>
             <Button 
               onClick={saveCardImage}
               disabled={isSaving}
               className="bg-white text-black hover:bg-gray-100 font-black h-16 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 border-b-8 border-gray-200"
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
