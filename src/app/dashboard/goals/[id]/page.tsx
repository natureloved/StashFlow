'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  History as HistoryIcon,
  Calculator,
  ShieldCheck,
  TrendingUp,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { WithdrawModal } from '@/components/WithdrawModal';
import Link from 'next/link';

function getTxExplorerUrl(txHash: string, chainId: number): string {
  switch (chainId) {
    case 8453: return `https://basescan.org/tx/${txHash}`;
    case 42161: return `https://arbiscan.io/tx/${txHash}`;
    case 10: return `https://optimistic.etherscan.io/tx/${txHash}`;
    case 137: return `https://polygonscan.com/tx/${txHash}`;
    default: return `https://etherscan.io/tx/${txHash}`;
  }
}

export default function GoalDetailPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    const timer = setTimeout(() => setCanRedirect(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (mounted && canRedirect && status === 'disconnected' && !isReconnecting && !isConnecting) {
      window.location.href = '/';
    }
  }, [mounted, canRedirect, status, isReconnecting, isConnecting]);

  if (!mounted) return null;

  if (!goal) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-6 text-center", isDark ? "bg-[#0A0A0F] text-white" : "bg-slate-50 text-slate-900")}>
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
  
  const matchVaultAddress = (addr?: string) =>
    typeof addr === 'string' && addr.toLowerCase() === goal.vault.address.toLowerCase();

  const livePosition = portfolio?.positions?.find((p: any) =>
    p.chainId === goal.vault.chainId && (
      matchVaultAddress(p.vaultAddress) ||
      matchVaultAddress(p.address) ||
      matchVaultAddress(p.token?.address) ||
      matchVaultAddress(p.asset?.address) ||
      (p.protocol?.name?.toLowerCase() === goal.vault.protocol.name.toLowerCase() &&
        p.asset?.symbol?.toLowerCase() === goal.vault.underlyingTokens?.[0]?.symbol?.toLowerCase())
    )
  );

  const apy = vaultDetails?.analytics?.apy?.total || goal.vault.analytics.apy.total;
  const monthlyYield = (currentSaved * (apy / 100)) / 12;
  const remainingRemaining = Math.max(goal.targetAmountUsd - currentSaved, 0);
  const dailyYield = (currentSaved * (apy / 100)) / 365;
  const daysToComplete = dailyYield > 0 ? Math.ceil(remainingRemaining / dailyYield) : Infinity;

  return (
    <div className={cn("min-h-screen transition-all duration-500", isDark ? "bg-[#0A0A0F] text-white" : "bg-slate-50 text-slate-900")}>
      <nav className={cn(
        "border-b backdrop-blur-md h-20 flex items-center transition-colors",
        isDark ? "border-border bg-surface/50" : "border-slate-200 bg-white/80"
      )}>
        <div className="container mx-auto px-6">
          <Link href="/dashboard" className={cn(
            "flex items-center gap-2 transition-colors group",
            isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
          )}>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-body text-sm font-bold uppercase tracking-wider">Back to Dashboard</span>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-2 space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h1 className={cn("font-display text-4xl md:text-5xl font-extrabold", !isDark && "text-slate-900")}>{goal.name}</h1>
                <Badge className="bg-accent/10 text-accent border-accent/20 px-4 py-1.5 font-bold text-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Live: {apy.toFixed(2)}% APY
                </Badge>
              </div>
              <p className={cn("text-xl font-body", isDark ? "text-gray-400" : "text-slate-500")}>
                Targeting ${goal.targetAmountUsd.toLocaleString()} 
                {goal.targetDate && ` by ${new Date(goal.targetDate).toLocaleDateString()}`}
              </p>
            </div>

            <div className={cn(
               "p-10 space-y-8 relative overflow-hidden transition-all",
               isDark ? "glass-card" : "bg-white border border-slate-200 shadow-xl rounded-3xl"
             )}>
               <div className="absolute top-0 left-0 w-2 h-full bg-accent" />
               <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Current Balance</div>
                  <div className={cn("text-5xl font-display font-bold", !isDark && "text-slate-900")}>${currentSaved.toLocaleString()}</div>
                  {livePosition && (
                    <div className="text-sm text-accent flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Live: ${Number(livePosition.balanceUsd).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={cn("text-5xl font-display font-bold text-gray-800", !isDark && "text-slate-100")}>{Math.round(progress)}%</div>
                </div>
               </div>

               <div className="space-y-4">
                 <div className={cn(
                    "h-4 w-full rounded-full overflow-hidden border transition-all",
                    isDark ? "bg-surface border-border" : "bg-slate-100 border-slate-200 shadow-inner"
                  )}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={cn(
                        "h-full bg-accent",
                        isDark && "shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                      )}
                    />
                 </div>
                 <div className="flex justify-between text-sm text-gray-500 font-bold">
                    <span>$0</span>
                    <span className={!isDark ? "text-slate-400" : ""}>Goal: ${goal.targetAmountUsd.toLocaleString()}</span>
                 </div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <HistoryIcon className="w-6 h-6 text-accent" />
                <h2 className={cn("font-display text-3xl font-bold", !isDark && "text-slate-900")}>Contribution History</h2>
              </div>
              
              <div className="space-y-4">
                {goal.contributions.length > 0 ? (
                  [...goal.contributions].reverse().map((c) => {
                    const isWithdrawal = c.amountUsd < 0;
                    return (
                      <div key={c.id} className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        isDark ? "bg-surface/30 border-border hover:bg-surface/50" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full border flex items-center justify-center transition-colors",
                            isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-100",
                            isWithdrawal && (isDark ? 'border-red-500/30' : 'border-red-100')
                          )}>
                            {isWithdrawal
                              ? <Upload className="w-5 h-5 text-red-400" />
                              : <Download className="w-5 h-5 text-accent" />
                            }
                          </div>
                          <div>
                            <p className={cn("font-bold text-sm", !isDark && "text-slate-900")}>
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
                            className={cn(
                              "text-[10px] flex items-center gap-1 justify-end transition-colors",
                              isDark ? "text-gray-600 hover:text-white" : "text-slate-400 hover:text-slate-900"
                            )}
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

          <div className="space-y-8">
            <Card className={cn(
                "p-6 transition-all",
                isDark ? "glass-card border-accent/20" : "bg-white border-slate-200 shadow-xl rounded-3xl"
              )}>
              <h3 className={cn("font-display text-xl font-bold mb-6 flex items-center gap-2", !isDark && "text-slate-900")}>
                <ShieldCheck className="w-5 h-5 text-accent" /> Vault Analytics
              </h3>
              
              <div className="space-y-6">
                <div className={cn("flex justify-between pb-4 border-b transition-all", isDark ? "border-border" : "border-slate-100")}>
                  <span className="text-gray-400 text-sm font-body">Protocol</span>
                  <span className={cn("font-bold flex items-center gap-1", isDark ? "text-white" : "text-slate-900")}>
                    {goal.vault.protocol.name} <ExternalLink className="w-3 h-3 text-gray-400" />
                  </span>
                </div>
                <div className={cn("flex justify-between pb-4 border-b transition-all", isDark ? "border-border" : "border-slate-100")}>
                  <span className="text-gray-400 text-sm font-body">Network</span>
                  <span className={cn("font-bold capitalize", isDark ? "text-white" : "text-slate-900")}>{goal.vault.network}</span>
                </div>
                <div className={cn("flex justify-between pb-4 border-b transition-all", isDark ? "border-border" : "border-slate-100")}>
                  <span className="text-gray-400 text-sm font-body">Vault TVL</span>
                  <div className="text-right">
                    <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>${Number(vaultDetails?.analytics?.tvl?.usd || goal.vault.analytics.tvl.usd).toLocaleString()}</span>
                    <p className="text-[10px] text-gray-600 mt-0.5">This vault only</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm font-body">Risk Tier</span>
                  <Badge variant="outline" className="border-accent text-accent uppercase font-bold text-[10px]">{goal.riskTier}</Badge>
                </div>
              </div>
            </Card>

            <Card className={cn(
                "p-6 relative overflow-hidden group transition-all",
                isDark ? "glass-card border-secondary/20" : "bg-white border-slate-200 shadow-xl rounded-3xl"
              )}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-secondary/10 transition-all" />
              <h3 className={cn("font-display text-xl font-bold mb-6 flex items-center gap-2", !isDark && "text-slate-900")}>
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

                <div className={cn(
                  "space-y-3 p-4 rounded-xl border transition-all",
                  isDark ? "bg-surface/30 border-border" : "bg-slate-50 border-slate-100 shadow-inner"
                )}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-body">Days to Celebration 🥂</span>
                    <span className={cn("font-bold text-lg", !isDark && "text-slate-900")}>
                      {daysToComplete === Infinity ? 'N/A' : `${daysToComplete.toLocaleString()}`}
                    </span>
                  </div>
                  <Progress value={daysToComplete === Infinity ? 0 : Math.min(100, progress)} className={cn("h-1.5 transition-all", isDark ? "bg-surface" : "bg-slate-200")} />
                  <p className="text-[10px] text-gray-500 leading-relaxed italic">
                    Based on current yield and zero additional contributions.
                  </p>
                </div>
              </div>
            </Card>

            <Button 
              onClick={() => setIsWithdrawModalOpen(true)}
              className={cn(
                "w-full h-14 border transition-all group",
                isDark 
                  ? "bg-surface border-border text-gray-400 hover:text-white hover:border-accent/50" 
                  : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-lg"
              )}
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
