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
  const apy = (goal.vault.analytics.apy.total || 0).toFixed(1);

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
      text = `Just took my first step towards my Goal - ${goal.name}! 🌱 Saving on-chain with @stashflow, earning ${apy}% APY. The journey of a thousand miles starts with one click. Powered by @lifiprotocol #DeFi #Stashflow`;
    } else if (milestone === 25) {
      text = `25% of the way to my Goal - ${goal.name}! 🚀 $${Math.round(amountToDisplay).toLocaleString()} saved and earning ${apy}% APY automatically with @stashflow. DeFi yield hitting different. @lifiprotocol #DeFi`;
    } else if (milestone === 50) {
      text = `Halfway mark hit for Goal - ${goal.name}! 🔥 $${Math.round(amountToDisplay).toLocaleString()} secured on-chain. My @stashflow yield is already building up. Powered by @lifiprotocol #PassiveIncome #DeFi`;
    } else if (milestone === 75) {
      text = `75% DONE! 💎 Almost reached my Goal - ${goal.name} with @stashflow. Earning ${apy}% APY while I sleep. On-chain savings at its finest. @lifiprotocol #DeFi #Stashflow`;
    } else {
      text = `GOAL UNLOCKED 🏆 I just hit my Goal - ${goal.name} target! $${Math.round(amountToDisplay).toLocaleString()} saved on-chain with @stashflow, powered by @lifiprotocol. This is what DeFi UX should feel like. #DeFi #Stashflow`;
    }

    navigator.clipboard.writeText(text);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const shareOnTwitter = () => {
    let text = "";
    if (milestone === 1) {
      text = `Just took my first step towards my Goal - ${goal.name}! 🌱 \nSaving on-chain with StashFlow built by @adejoke_btc, earning ${apy}% APY. Powered by @lifiprotocol \n\nCheck it out here : https://stashflow-two.vercel.app/dashboard`;
    } else if (milestone === 25) {
      text = `25% of the way to my Goal - ${goal.name}! 🚀 $${amountToDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} saved on-chain. Powered by @lifiprotocol #DeFi`;
    } else if (milestone === 50) {
      text = `Halfway mark hit for Goal - ${goal.name}! 🔥 $${amountToDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} secured on-chain. Powered by @lifiprotocol #PassiveIncome #DeFi`;
    } else if (milestone === 75) {
      text = `75% DONE! 💎 Almost reached my Goal - ${goal.name} with @stashflow. Earning ${apy}% APY while I sleep. #DeFi #Stashflow`;
    } else {
      text = `GOAL UNLOCKED 🏆 I just hit my Goal - ${goal.name} target! $${amountToDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} saved on-chain with @stashflow. #DeFi #Stashflow`;
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  const copyCardImage = async () => {
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
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const element = clonedDoc.querySelector('[data-card-container]');
          if (element) {
            (element as HTMLElement).style.borderRadius = '24px';
          }
        }
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        try {
          // Check for ClipboardItem support which is required for images
          if (typeof ClipboardItem !== 'undefined') {
            const data = [new ClipboardItem({ [blob.type]: blob })];
            await navigator.clipboard.write(data);
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
          } else {
            throw new Error('ClipboardItem not supported');
          }
        } catch (err) {
          console.error('Clipboard copy failed:', err);
          // Fallback: Download the image if copy fails
          const link = document.createElement('a');
          link.download = `stashflow-${goal.name.toLowerCase().replace(/\s+/g, '-')}.png`;
          link.href = canvas.toDataURL();
          link.click();
          // Still show some feedback
          setIsCopying(true);
          setTimeout(() => setIsCopying(false), 2000);
        }
      }, 'image/png');
    } catch (err: any) {
      console.error('Failed to capture image:', err);
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
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent via-secondary to-accent rounded-[32px] blur-2xl opacity-10 group-hover:opacity-25 transition duration-1000"></div>
            
            <div 
              ref={cardRef}
              data-card-container
              className="relative w-full min-h-[290px] rounded-[24px] bg-[#0A0A0F] border border-white/10 overflow-hidden p-6 sm:p-8 font-body flex flex-col justify-between shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.08),transparent_50%)] pointer-events-none" />
              <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,rgba(255,184,0,0.08),transparent_50%)] pointer-events-none" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] select-none pointer-events-none scale-[4] blur-[1px]">
                  {milestoneData.badge}
              </div>
 
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.4)]" style={{ backgroundColor: '#00E5FF' }}>
                    <span className="text-black font-black text-lg italic">S</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.4em] font-black text-white/70 leading-none">STASHFLOW</span>
                    <span className="block text-[7px] uppercase tracking-[0.2em] font-bold mt-1" style={{ color: '#00E5FF' }}>Goal-based DeFi savings</span>
                  </div>
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 text-[9px] font-black text-white/50 tracking-widest uppercase italic">
                  DEFI MILESTONE
                </div>
              </div>
 
              <div className="relative z-10 text-center py-4">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl mb-3 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  {milestoneData.badge}
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">
                  {milestoneData.title}
                </h2>
                <div className="inline-block px-3 py-1 bg-white/5 rounded-lg border border-white/5 backdrop-blur-md">
                  <p className="font-black text-[10px] uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,229,255,0.3)]" style={{ color: '#00E5FF' }}>{goal.name}</p>
                </div>
              </div>
 
              <div className="relative z-10 space-y-4">
                <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${milestone}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-[length:200%_auto] animate-gradient-x rounded-full shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                    style={{ background: 'linear-gradient(to right, #00E5FF, #FFB800, #00E5FF)' }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none">Status</p>
                    <p className="text-xl font-black text-white tracking-tighter leading-none">
                      {milestone}%
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none">APY</p>
                    <p className="text-xl font-black tracking-tighter leading-none italic drop-shadow-[0_0_5px_rgba(0,229,255,0.2)]" style={{ color: '#00E5FF' }}>{apy}%</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none">Saved</p>
                    <p className="text-xl font-black text-white tracking-tighter leading-none">
                      ${amountToDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 flex justify-center pt-6 mt-4 border-t border-white/5">
                <span className="text-[9px] text-white/20 uppercase font-black tracking-[0.4em] flex items-center gap-2">
                   Save with purpose. <span className="text-white/40">Earn while you wait.</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button 
               onClick={copyTweetText}
               className="bg-[#1DA1F2] text-white hover:bg-[#1A91DA] font-black h-12 rounded-xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 group"
             >
               {isCopying ? (
                 <span className="flex items-center gap-3"><Check className="w-5 h-5" /> Copied!</span>
               ) : (
                 <span className="flex items-center gap-3 italic text-xs"><Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Copy Text</span>
               )}
             </Button>
             <Button 
               onClick={shareOnTwitter}
               className="bg-[#1DA1F2] text-white hover:bg-[#1A91DA] font-black h-12 rounded-xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 group"
             >
               <span className="flex items-center gap-3 italic text-xs">
                 <svg className="w-4 h-4 fill-current group-hover:rotate-12 transition-transform" viewBox="0 0 24 24">
                   <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                 </svg>
                 Share to X
               </span>
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
