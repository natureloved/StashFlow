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
      <DialogContent className="sm:max-w-[420px] bg-[#111118] border-[#1E1E2E] text-white p-0 overflow-visible">
        <div className="p-6 pb-0">
          <Badge className={`${score.color}/10 ${score.text} border-${score.text.split('-')[1]}-500/20 px-3 py-1 mb-6 flex items-center gap-2 w-fit font-bold`}>
            <ScoreIcon className="w-4 h-4" /> Safety Score: {score.label}
          </Badge>
          
          <DialogHeader className="text-left mb-6">
            <DialogTitle className="font-display text-2xl font-bold">Vault Security</DialogTitle>
            <DialogDescription className="text-gray-400 font-body">
              Simple breakdown of the risks and setup of this yield strategy.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 space-y-4">
          {/* Fact Cards */}
          <div className="space-y-3">
            <div className="glass-card p-4 border-border flex items-center gap-4 bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                  <EducationPopover id="tvl" term="Total deposits">
                    This is how much money other users have 
                    deposited. Higher deposits generally mean the protocol 
                    is more trusted and battle-tested.
                  </EducationPopover>
                </div>
                <p className="text-sm font-bold text-white">{formattedTvl} deposited by other users</p>
              </div>
            </div>

            <div className="glass-card p-4 border-border flex items-center gap-4 bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Your yearly earn rate</div>
                <p className="text-sm font-bold text-white">{(vault.analytics.apy.total * 100).toFixed(1)}% — $1,000 grows to ~${(1000 * (1 + vault.analytics.apy.total)).toLocaleString()} in a year</p>
              </div>
            </div>

            <div className="glass-card p-4 border-border flex items-center gap-4 bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Powered by</div>
                <p className="text-sm font-bold text-white">{getProtocolExplainer(vault.protocol.name)}</p>
              </div>
            </div>
          </div>

          <div className="pt-6 pb-2">
            <h4 className="font-display font-bold text-white mb-2">What happens to my money?</h4>
            <div className="text-sm text-gray-400 font-body leading-relaxed">
              Your deposit is held in a smart contract — a self-executing program 
              on the blockchain. No company controls it. You can withdraw at any time.
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 space-y-4">
          <div className="text-[10px] text-gray-600 font-body border-t border-border/50 pt-4 leading-relaxed italic">
            "DeFi protocols carry smart contract risk. Only deposit 
            what you can afford to lose. This is not financial advice."
          </div>
          
          <div className="flex flex-col gap-2">
            <a 
              href={vault.protocol.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center h-10 px-4 bg-surface border border-border rounded-lg hover:bg-surface/80 text-white text-sm font-medium transition-colors"
            >
              View protocol <ExternalLink className="w-4 h-4 ml-2" />
            </a>
            <Button onClick={() => onOpenChange(false)} className="w-full bg-transparent hover:bg-white/5 text-gray-400" variant="ghost">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
