'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGoalStore } from '@/store/useGoalStore';
import { useVaultDetails, usePortfolio } from '@/hooks/useLifi';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ExternalLink,
  History,
  Calculator,
  ShieldCheck,
  TrendingUp,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';

function getTxExplorerUrl(txHash: string, chainId: number): string {
  switch (chainId) {
    case 8453: return `https://basescan.org/tx/${txHash}`;
    case 42161: return `https://arbiscan.io/tx/${txHash}`;
    case 10: return `https://optimistic.etherscan.io/tx/${txHash}`;
    case 137: return `https://polygonscan.com/tx/${txHash}`;
    default: return `https://etherscan.io/tx/${txHash}`;
  }
}
import { WithdrawModal } from '@/components/WithdrawModal';
import Link from 'next/link';

export default function GoalDetailPage() {
  const { id } = useParams();
  const { address, status, isConnecting, isReconnecting } = useAccount();
  const [mounted, setMounted] = React.useState(false);
  const [canRedirect, setCanRedirect] = React.useState(false);
  const goal = useGoalStore((state) => state.goals.find((g) => g.id === id));
  
  const { data: vaultDetails, isLoading: isLoadingVault } = useVaultDetails(
    goal?.vault.chainId, 
    goal?.vault.address
  );
  
  const { data: portfolio } = usePortfolio(address);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Give wagmi/rainbowkit 1.5 seconds to restore session before allowing redirect
    const timer = setTimeout(() => setCanRedirect(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    // Robust status check: only redirect if definitely NOT connected
    // We also wait for the canRedirect grace period to end to avoid refresh "kicks"
    if (mounted && canRedirect && status === 'disconnected' && !isReconnecting && !isConnecting) {
      window.location.href = '/';
    }
  }, [mounted, canRedirect, status, isReconnecting, isConnecting]);

  if (!mounted) return null; // Wait for hydration

  if (!goal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="font-display text-2xl font-bold">Goal not found</h1>
        <Link href="/dashboard" className="mt-4 text-accent hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentSaved = goal.contributions.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const progress = Math.min((currentSaved / goal.targetAmountUsd) * 100, 100);
  
  // Find live position balance if available
  const matchVaultAddress = (addr?: string) =>
    typeof addr === 'string' && addr.toLowerCase() === goal.vault.address.toLowerCase();

  const livePosition = portfolio?.positions?.find((p: any) =>
    p.chainId === goal.vault.chainId && (
      matchVaultAddress(p.vaultAddress) ||
      matchVaultAddress(p.address) ||
      matchVaultAddress(p.token?.address) ||
      matchVaultAddress(p.asset?.address) ||
      (p.protocol?.name?.toLowerCase() === goal.vault.protocol.name.toLowerCase() &&
        p.asset?.symbol?.toLowerCase() ===
          goal.vault.underlyingTokens?.[0]?.symbol?.toLowerCase())
    )
  );

  const apy = vaultDetails?.analytics?.apy?.total || goal.vault.analytics.apy.total;
  const monthlyYield = (currentSaved * (apy / 100)) / 12;

  // Simple projection: days = (remaining) / (daily yield)
  // Assuming no more deposits for simplicity in this calculation
  const remaining = Math.max(goal.targetAmountUsd - currentSaved, 0);
  const dailyYield = (currentSaved * (apy / 100)) / 365;
  const daysToComplete = dailyYield > 0 ? Math.ceil(remaining / dailyYield) : Infinity;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md h-20 flex items-center">
        <div className="container mx-auto px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-body text-sm font-bold uppercase tracking-wider">Back to Dashboard</span>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Overview & Progress */}
          <div className="lg:col-span-2 space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h1 className="font-display text-4xl md:text-5xl font-extrabold">{goal.name}</h1>
                <Badge className="bg-accent/10 text-accent border-accent/20 px-4 py-1.5 font-bold text-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Live: {apy.toFixed(2)}% APY
                </Badge>
              </div>
              <p className="text-xl text-gray-400 font-body">
                Targeting ${goal.targetAmountUsd.toLocaleString()} 
                {goal.targetDate && ` by ${new Date(goal.targetDate).toLocaleDateString()}`}
              </p>
            </div>

            <div className="glass-card p-10 space-y-8 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-accent" />
               <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Current Balance</div>
                  <div className="text-5xl font-display font-bold">${currentSaved.toLocaleString()}</div>
                  {livePosition && (
                    <div className="text-sm text-accent flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Live: ${Number(livePosition.balanceUsd).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-5xl font-display font-bold text-gray-800">{Math.round(progress)}%</div>
                </div>
               </div>

               <div className="space-y-4">
                 <div className="h-4 w-full bg-surface rounded-full overflow-hidden border border-border">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-accent shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                    />
                 </div>
                 <div className="flex justify-between text-sm text-gray-500 font-bold">
                    <span>$0</span>
                    <span>Goal: ${goal.targetAmountUsd.toLocaleString()}</span>
                 </div>
               </div>
            </div>

            {/* History Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-accent" />
                <h2 className="font-display text-3xl font-bold">Contribution History</h2>
              </div>
              
              <div className="space-y-4">
                {goal.contributions.length > 0 ? (
                  [...goal.contributions].reverse().map((c) => {
                    const isWithdrawal = c.amountUsd < 0;
                    return (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-surface/30 rounded-xl border border-border hover:bg-surface/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full bg-[#0A0A0F] border border-border flex items-center justify-center ${isWithdrawal ? 'border-red-500/30' : ''}`}>
                            {isWithdrawal
                              ? <Upload className="w-5 h-5 text-red-400" />
                              : <Download className="w-5 h-5 text-accent" />
                            }
                          </div>
                          <div>
                            <p className="font-bold text-sm">
                              {isWithdrawal ? `Withdrawal to wallet` : `Deposit from ${c.fromToken}`}
                            </p>
                            <p className="text-xs text-gray-500">{new Date(c.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isWithdrawal ? 'text-red-400' : 'text-accent'}`}>
                            {isWithdrawal ? `-$${Math.abs(c.amountUsd).toLocaleString()}` : `+$${c.amountUsd.toLocaleString()}`}
                          </p>
                          <a
                            href={getTxExplorerUrl(c.txHash, c.fromChain)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-gray-600 hover:text-white flex items-center gap-1 justify-end"
                          >
                            View TX <ExternalLink className="w-2 h-2" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-gray-500 italic">No contributions yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Vault Details & Projections */}
          <div className="space-y-8">
            <Card className="glass-card p-6 border-accent/20">
              <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" /> Vault Analytics
              </h3>
              
              <div className="space-y-6">
                <div className="flex justify-between pb-4 border-b border-border">
                  <span className="text-gray-400 text-sm font-body">Protocol</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    {goal.vault.protocol.name} <ExternalLink className="w-3 h-3 text-gray-400" />
                  </span>
                </div>
                <div className="flex justify-between pb-4 border-b border-border">
                  <span className="text-gray-400 text-sm font-body">Network</span>
                  <span className="font-bold text-white capitalize">{goal.vault.network}</span>
                </div>
                <div className="flex justify-between pb-4 border-b border-border">
                  <span className="text-gray-400 text-sm font-body">Vault TVL</span>
                  <div className="text-right">
                    <span className="font-bold text-white">${Number(vaultDetails?.analytics?.tvl?.usd || goal.vault.analytics.tvl.usd).toLocaleString()}</span>
                    <p className="text-[10px] text-gray-600 mt-0.5">This vault only</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm font-body">Risk Tier</span>
                  <Badge variant="outline" className="border-accent text-accent uppercase font-bold text-[10px]">{goal.riskTier}</Badge>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6 border-secondary/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-secondary/10 transition-all" />
              <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-secondary" /> Projections
              </h3>
              
              <div className="space-y-6">
                <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/30 relative">
                  <p className="text-[10px] text-secondary font-bold uppercase mb-1 tracking-widest">Passive Income Boost 🚀</p>
                  <p className="text-3xl font-display font-bold text-secondary animate-pulse">
                    +${monthlyYield.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 italic">Per Month (Estimated)</p>
                </div>

                <div className="space-y-3 bg-surface/30 p-4 rounded-xl border border-border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-body">Days to Celebration 🥂</span>
                    <span className="font-bold text-white text-lg">
                      {daysToComplete === Infinity ? 'N/A' : `${daysToComplete.toLocaleString()}`}
                    </span>
                  </div>
                  <Progress value={daysToComplete === Infinity ? 0 : Math.min(45, progress)} className="h-1.5 bg-surface" />
                  <p className="text-[10px] text-gray-500 leading-relaxed italic">
                    Based on current yield and zero additional contributions.
                  </p>
                </div>
              </div>
            </Card>

            <Button 
              onClick={() => setIsWithdrawModalOpen(true)}
              className="w-full h-14 bg-surface border border-border text-gray-400 hover:text-white hover:border-accent/50 group transition-all"
            >
              Withdraw Funds <AlertCircle className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <p className="text-[10px] text-center text-gray-600">
              Vault: {goal.vault.address}
            </p>
          </div>

        </div>
      </main>
      <WithdrawModal 
        goal={goal} 
        open={isWithdrawModalOpen} 
        onOpenChange={setIsWithdrawModalOpen}
        currentBalanceUsd={currentSaved}
        livePosition={livePosition}
      />
    </div>
  );
}
