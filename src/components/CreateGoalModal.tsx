'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EducationPopover } from '@/components/EducationPopover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskTier, findBestVault } from '@/lib/matching';
import { Vault } from '@/lib/lifi';
import { useGoalStore } from '@/store/useGoalStore';
import { Loader2, ShieldCheck, Scale, Flame, ChevronRight, Target, AlertCircle, HelpCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAccount } from 'wagmi';
import { VaultSafetyModal } from '@/components/VaultSafetyModal';

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGoalModal({ open, onOpenChange }: CreateGoalModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [riskTier, setRiskTier] = useState<RiskTier | null>(null);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const { address } = useAccount();

  const addGoal = useGoalStore((state) => state.addGoal);

  const handleRiskSelect = async (tier: RiskTier) => {
    setRiskTier(tier);
    setIsLoadingVault(true);
    try {
      const bestVault = await findBestVault(tier);
      setSelectedVault(bestVault as any);
      setStep(3);
    } catch (error) {
      console.error('Failed to match vault:', error);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleConfirm = () => {
    if (!riskTier || !selectedVault) return;

    addGoal({
      id: uuidv4(),
      ownerAddress: address || '0x0000000000000000000000000000000000000000',
      name,
      targetAmountUsd: Number(amount),
      riskTier,
      vault: selectedVault,
      contributions: [],
      createdAt: new Date().toISOString(),
    });

    onOpenChange(false);
    reset();
  };

  const reset = () => {
    setStep(1);
    setName('');
    setAmount('');
    setRiskTier(null);
    setSelectedVault(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className="sm:max-w-[500px] bg-surface border-border text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create New Goal</DialogTitle>
          <DialogDescription className="text-white/60">
            {step === 1 && "What are you saving for?"}
            {step === 2 && "Choose a risk level that fits your goal."}
            {step === 3 && "We've matched you with the best strategy."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Japan Trip 2027 ✈️" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#0A0A0F] border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Target Amount (USD)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="3000" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-[#0A0A0F] border-border"
                  />
                </div>
                <Button 
                  disabled={!name || !amount} 
                  onClick={() => setStep(2)} 
                  className="w-full bg-accent text-black hover:bg-accent/90 font-bold"
                >
                  Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 gap-4"
              >
                {[
                  { id: 'safe', title: 'SAFE', icon: ShieldCheck, desc: 'Stablecoins · Blue-chip · Low risk', color: 'text-green-400' },
                  { id: 'balanced', title: 'BALANCED', icon: Scale, desc: 'ETH-correlated · Medium risk', color: 'text-amber-400' },
                  { id: 'degen', title: 'DEGEN', icon: Flame, desc: 'Max APY · Higher risk', color: 'text-red-500' },
                ].map((tier) => (
                  <Card 
                    key={tier.id}
                    className={`p-4 bg-[#0A0A0F] border-border hover:border-accent cursor-pointer transition-all group ${isLoadingVault ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleRiskSelect(tier.id as RiskTier)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg bg-surface ${tier.color}`}>
                        <tier.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-lg text-white">{tier.title}</h4>
                        <p className="text-sm text-gray-400">{tier.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}

            {step === 3 && selectedVault && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-4 bg-[#0A0A0F] rounded-xl border border-accent/30 glow-cyan">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-display font-bold text-xl">
                        <EducationPopover id="vault" term="vault">
                          A vault is a smart contract that pools 
                          deposits and puts them to work in DeFi lending markets. 
                          Think of it like a high-yield savings account, 
                          but on the blockchain.
                        </EducationPopover>
                        : {selectedVault.name}
                      </h4>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        Powered by {selectedVault.protocol.name}
                        <button 
                          onClick={() => setIsSafetyModalOpen(true)}
                          className="text-gray-500 hover:text-accent transition-colors"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </p>
                    </div>
                    <Badge className="bg-accent text-black">
                      <EducationPopover id="apy" term={`${(selectedVault.analytics.apy.total).toFixed(2)}% APY`}>
                        APY means you earn {(selectedVault.analytics.apy.total).toFixed(2)}% of your deposit 
                        per year, paid continuously. $1,000 today becomes 
                        ~${(1000 * (1 + selectedVault.analytics.apy.total / 100)).toLocaleString()} in a year — automatically, no action needed.
                      </EducationPopover>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm font-body">
                    <div className="space-y-1">
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Total Deposits</div>
                      <div className="text-white font-bold">
                        <EducationPopover id="tvl" term={`$${Number(selectedVault.analytics.tvl.usd).toLocaleString()}`}>
                          This is how much money other users have 
                          deposited. Higher deposits generally mean the protocol 
                          is more trusted and battle-tested.
                        </EducationPopover>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Network</div>
                      <div className="text-white font-bold">{selectedVault.network}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface/50 p-3 rounded-lg border border-border flex items-center gap-3">
                  <Target className="w-5 h-5 text-accent" />
                  <p className="text-xs text-gray-300">
                    This vault was selected because it offers the best {riskTier} risk-adjusted yield for your goal.
                  </p>
                </div>

                {riskTier === 'degen' && (
                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-xs text-red-400 font-bold">
                      Warning: Degen strategies have no TVL floor and high volatility. Not for the faint-hearted.
                    </p>
                  </div>
                )}

                <Button onClick={handleConfirm} className="w-full bg-accent text-black hover:bg-accent/90 font-bold">
                  Start Saving
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isLoadingVault && (
          <div className="absolute inset-0 bg-surface/80 flex flex-col items-center justify-center z-50 rounded-lg">
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
            <p className="font-display font-bold">Finding best vault...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
