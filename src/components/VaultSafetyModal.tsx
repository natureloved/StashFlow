'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, ShieldX, Info, ExternalLink, Calculator, Landmark, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EducationPopover } from '@/components/EducationPopover';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

interface VaultSafetyModalProps {
  vault: {
    name: string;
    protocol: { name: string; url: string };
    network: string;
    analytics: {
      apy: { total: number };
      tvl: { usd: string };
      apy30d: number | null;
    };
    tags: string[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VaultSafetyModal({ vault, open, onOpenChange }: VaultSafetyModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tvl = Number(vault.analytics.tvl.usd);
  
  const getSafetyScore = () => {
    if (tvl > 500_000_000) return { label: 'Very Safe', color: 'bg-green-500', text: 'text-green-500', icon: ShieldCheck };
    if (tvl > 100_000_000) return { label: 'Safe', color: 'bg-green-500', text: 'text-green-500', icon: ShieldCheck };
    if (tvl > 10_000_000) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-500', icon: ShieldAlert };
    return { label: 'Higher Risk', color: 'bg-red-500', text: 'text-red-500', icon: ShieldX };
  };

  const score = getSafetyScore();
  const ScoreIcon = score.icon;

  const getProtocolExplainer = (name: string) => {
    const raw = name.toLowerCase();
    if (raw.includes('morpho')) return 'Morpho — a leading DeFi lending protocol';
    if (raw.includes('aave')) return 'Aave — one of DeFi\'s most trusted protocols';
    if (raw.includes('euler')) return 'Euler — an advanced lending marketplace';
    if (raw.includes('spark')) return 'Spark — built on top of MakerDAO';
    return `${name.charAt(0).toUpperCase() + name.slice(1)} — a decentralized protocol on ${vault.network}`;
  };

  const formattedTvl = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(tvl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-[calc(100%-2.5rem)] sm:max-w-[420px] p-0 overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#111118] border-[#1E1E2E] text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
      )}>
        <div className="max-h-[85vh] overflow-y-auto w-full thin-scrollbar">
        <div className="p-6 pb-0">
          <Badge className={`${score.color}/10 ${score.text} border-${score.text.split('-')[1]}-500/20 px-3 py-1 mb-6 flex items-center gap-2 w-fit font-bold`}>
            <ScoreIcon className="w-4 h-4" /> Safety Score: {score.label}
          </Badge>
          
          <DialogHeader className="text-left mb-6">
            <DialogTitle className={cn("font-display text-2xl font-bold", !isDark && "text-slate-900")}>Vault Security</DialogTitle>
            <DialogDescription className={isDark ? "text-gray-400 font-body" : "text-slate-500 font-body"}>
              Simple breakdown of the risks and setup of this yield strategy.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 space-y-4">
          {/* Fact Cards */}
          <div className="space-y-3">
            <div className={cn(
              "p-3 rounded-xl border flex items-center gap-4 transition-all",
              isDark ? "bg-white/5 border-border" : "bg-slate-50 border-slate-200"
            )}>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className={cn("text-[10px] uppercase font-bold tracking-wider", isDark ? "text-gray-500" : "text-slate-500")}>
                  <EducationPopover id="tvl" term="Total deposits">
                    This is how much money other users have 
                    deposited. Higher deposits generally mean the protocol 
                    is more trusted and battle-tested.
                  </EducationPopover>
                </div>
                <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{formattedTvl} deposited by other users</p>
              </div>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex items-center gap-4 transition-all",
              isDark ? "bg-white/5 border-border" : "bg-slate-50 border-slate-200"
            )}>
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className={cn("text-[10px] uppercase font-bold tracking-wider", isDark ? "text-gray-400" : "text-slate-500")}>Your yearly earn rate</div>
                <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{(vault.analytics.apy.total).toFixed(1)}% — $1,000 grows to ~${(1000 * (1 + vault.analytics.apy.total / 100)).toLocaleString()} in a year</p>
              </div>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex items-center gap-4 transition-all",
              isDark ? "bg-white/5 border-border" : "bg-slate-50 border-slate-200"
            )}>
              <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className={cn("text-[10px] uppercase font-bold tracking-wider", isDark ? "text-gray-400" : "text-slate-500")}>Powered by</div>
                <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{getProtocolExplainer(vault.protocol.name)}</p>
              </div>
            </div>
          </div>

          <div className="pt-6 pb-2">
            <h4 className={cn("font-display font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>What happens to my money?</h4>
            <div className={cn("text-sm font-body leading-relaxed", isDark ? "text-gray-400" : "text-slate-500")}>
              Your deposit is held in a smart contract — a self-executing program 
              on the blockchain. No company controls it. You can withdraw at any time.
            </div>
          </div>
        </div>

        <div className="p-6 pt-2">
          <div className="flex flex-col gap-2">
            <a 
              href={vault.protocol.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                "w-full flex items-center justify-center h-10 px-4 rounded-lg transition-colors text-sm font-medium border",
                isDark 
                  ? "bg-surface border-border text-white hover:bg-surface/80" 
                  : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
              )}
            >
              View protocol <ExternalLink className="w-4 h-4 ml-2" />
            </a>
            <Button onClick={() => onOpenChange(false)} className={cn("w-full transition-all", isDark ? "bg-transparent hover:bg-white/5 text-gray-400" : "bg-transparent hover:bg-slate-100 text-slate-500")} variant="ghost">
              Close
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
