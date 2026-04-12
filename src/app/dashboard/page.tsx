'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GoalCard } from '@/components/GoalCard';
import { CreateGoalModal } from '@/components/CreateGoalModal';
import { DepositModal } from '@/components/DepositModal';
import { Goal, useGoalStore } from '@/store/useGoalStore';
import { Button } from '@/components/ui/button';
import { PortfolioView } from '@/components/PortfolioView';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserPositions, getWalletBalances } from '@/lib/lifi';
import { 
  Plus, 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  ArrowRight, 
  Target as TargetIcon,
  Sparkles,
  Loader2,
  Coins,
  Zap
} from 'lucide-react';

import { ShareCardModal } from '@/components/ShareCardModal';
import confetti from 'canvas-confetti';
import { getYieldEquivalent } from '@/lib/yield-utils';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'portfolio'>('dashboard');
  const [portfolioStats, setPortfolioStats] = useState<{ totalValue: number; idleAssets: number } | null>(null);
  
  // Milestone states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<1 | 25 | 50 | 75 | 100>(50);
  const [milestoneGoal, setMilestoneGoal] = useState<Goal | null>(null);

  const goals = useGoalStore((state) => state.goals);
  const _hasHydrated = useGoalStore((state) => state._hasHydrated);

  // Filter goals by current address
  const userGoals = React.useMemo(() => 
    goals.filter(g => g.ownerAddress?.toLowerCase() === address?.toLowerCase()),
    [goals, address]
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && !isConnected) {
      // Use window.location as a more aggressive redirect for disconnects
      // to ensure state is fully cleared and user is sent home immediately
      window.location.href = '/';
    }
  }, [mounted, isConnected]);

  const handleScanPortfolio = async () => {
    if (!address) return;
    setIsScanning(true);
    try {
      const [{ positions = [] }, balancesData] = await Promise.all([
        getUserPositions(address),
        getWalletBalances(address)
      ]);

      const rawBalances = (balancesData && typeof balancesData === 'object' && 'balances' in balancesData) 
        ? (balancesData as any).balances 
        : balancesData;

      const totalActiveUsd = positions.reduce((acc: number, p: any) => acc + (Number(p.amountUsd) || 0), 0);
      
      let totalIdleUsd = 0;
      // Defensive check: Ensure we have a valid balances record
      if (rawBalances && typeof rawBalances === 'object' && !Array.isArray(rawBalances)) {
        Object.entries(rawBalances).forEach(([_, tokens]: [string, any]) => {
          if (Array.isArray(tokens)) {
            tokens.forEach((token: any) => {
              const amount = Number(token.amount);
              const price = Number(token.priceUSD || 0);
              const usdValue = amount * price;

              // NaN safety and Dust filter
              if (!Number.isNaN(usdValue) && usdValue > 1.00) {
                const isInPosition = positions.some(
                  (p: any) => p.token?.address.toLowerCase() === token.address.toLowerCase()
                );
                if (!isInPosition) totalIdleUsd += usdValue;
              }
            });
          }
        });
      }
      
      setPortfolioStats({ 
        totalValue: (Number.isNaN(totalActiveUsd) ? 0 : totalActiveUsd) + (Number.isNaN(totalIdleUsd) ? 0 : totalIdleUsd), 
        idleAssets: Number.isNaN(totalIdleUsd) ? 0 : totalIdleUsd 
      });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCurrentView('portfolio');
    } catch (err) {
      console.error('Scan failed:', err);
      // Ensure we don't leave the UI in an inconsistent state on failure
      setPortfolioStats(prev => prev || { totalValue: 0, idleAssets: 0 });
    } finally {
      setIsScanning(false);
    }
  };

  React.useEffect(() => {
    async function fetchInsights() {
      if (!address || !isConnected) return;
      try {
        const [{ positions = [] }, balancesData] = await Promise.all([
          getUserPositions(address).catch(() => ({ positions: [] })),
          getWalletBalances(address).catch(() => ({})),
        ]);

        const totalActiveUsd = positions.reduce((acc: number, p: any) => acc + (Number(p.amountUsd) || 0), 0);
        
        const rawBalances = (balancesData && typeof balancesData === 'object' && 'balances' in balancesData) 
          ? (balancesData as any).balances 
          : balancesData;

        let totalIdleUsd = 0;
        // Defensive check: Ensure we have a valid balances record
        if (rawBalances && typeof rawBalances === 'object' && !Array.isArray(rawBalances)) {
          Object.entries(rawBalances).forEach(([_, tokens]: [string, any]) => {
            if (Array.isArray(tokens)) {
              tokens.forEach((token: any) => {
                const amount = Number(token.amount ?? 0);
                const price = Number(token.priceUSD ?? 0);
                const usdValue = amount * price;

                // Dust filter & NaN guard
                if (!Number.isNaN(usdValue) && usdValue > 1.00) {
                  const isInPosition = positions.some(
                    (p: any) => p.token?.address.toLowerCase() === token.address.toLowerCase()
                  );
                  if (!isInPosition) totalIdleUsd += usdValue;
                }
              });
            }
          });
        }

        setPortfolioStats({ 
          totalValue: (Number.isNaN(totalActiveUsd) ? 0 : totalActiveUsd) + (Number.isNaN(totalIdleUsd) ? 0 : totalIdleUsd), 
          idleAssets: Number.isNaN(totalIdleUsd) ? 0 : totalIdleUsd 
        });
      } catch (err) {
        console.error('Insight fetch failed:', err);
        // Reset to safe defaults on catch
        setPortfolioStats(p => p || { totalValue: 0, idleAssets: 0 });
      }
    }
    if (mounted && isConnected && address) fetchInsights();
  }, [address, isConnected, mounted]);

  const handleDepositSuccess = (prevAmount: number, newAmount: number) => {
    if (!selectedGoal) return;
    
    // Refresh goals from store might be needed or just use current goals state
    const goal = goals.find(g => g.id === selectedGoal.id);
    if (!goal) return;

    const prevProgress = (prevAmount / goal.targetAmountUsd) * 100;
    const newProgress = (newAmount / goal.targetAmountUsd) * 100;
    
    const milestones: (1 | 25 | 50 | 75 | 100)[] = [1, 25, 50, 75, 100];
    const crossed = [...milestones].reverse().find(m => prevProgress < m && newProgress >= m);
    
    if (crossed) {
      confetti({ 
        particleCount: crossed === 100 ? 200 : 100,
        spread: crossed === 100 ? 120 : 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#FFB800', '#ffffff']
      });
      
      setMilestoneGoal(goal);
      setActiveMilestone(crossed);
      setTimeout(() => setIsShareModalOpen(true), 1500);
    }
  };

  const handleAddFunds = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsDepositModalOpen(true);
  };

  const triggerDevMilestone = () => {
    if (goals.length > 0) {
      setMilestoneGoal(goals[0]);
      setActiveMilestone(50);
      setIsShareModalOpen(true);
    } else {
      alert("Create a goal first to test milestones!");
    }
  };

  if (!mounted || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className="font-display font-bold text-xl animate-pulse">Initializing StashFlow...</p>
      </div>
    );
  }

  const userGoalsCount = userGoals.length;
  const totalDeposited = userGoals.reduce((acc, goal) => 
    acc + goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0), 0
  );

  const avgApy = userGoalsCount > 0 
    ? userGoals.reduce((acc, goal) => acc + (goal.vault.analytics?.apy?.total || 0), 0) / userGoalsCount 
    : 0;

  const totalMonthlyYield = userGoalsCount > 0
    ? userGoals.reduce((acc, goal) => {
        const deposited = goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0);
        return acc + (deposited * (goal.vault.analytics?.apy?.total || 0)) / 12;
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-black font-display font-extrabold text-2xl">S</span>
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">Stashflow</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 mr-6 text-sm font-body">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 transition-colors ${currentView === 'dashboard' ? 'text-accent font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button 
                onClick={() => setCurrentView('portfolio')}
                className={`flex items-center gap-2 transition-colors ${currentView === 'portfolio' ? 'text-accent font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                <TrendingUp className="w-4 h-4" /> Portfolio
              </button>
            </div>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div
              key="goals-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                  <h1 className="font-display text-4xl font-extrabold mb-2 text-white">Your Dashboard</h1>
                  <p className="text-white/60 font-body">Manage your goals and watch your savings grow.</p>
                </div>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-accent text-black hover:bg-accent/90 font-bold px-6 h-12 rounded-xl glow-cyan"
                >
                  <Plus className="w-5 h-5 mr-2" /> New Goal
                </Button>
              </div>

              {goals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 border-accent/20"
                  >
                    <div className="flex items-center gap-3 text-white/70 mb-2 font-bold text-xs uppercase tracking-wider">
                      <Wallet className="w-4 h-4 text-accent" /> Total Stashed
                    </div>
                    <div className="text-3xl font-numeric font-bold text-white tracking-tight">
                      ${(Number.isNaN(totalDeposited) ? 0 : totalDeposited).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 border-accent/20"
                  >
                    <div className="flex items-center gap-3 text-white/70 mb-2 font-bold text-xs uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4 text-accent" /> Avg. APY
                    </div>
                    <div className="text-3xl font-numeric font-bold text-white tracking-tight">
                      {(Number.isNaN(avgApy) ? 0 : avgApy * 100).toFixed(2)}%
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6 border-secondary/20"
                  >
                    <div className="flex items-center gap-3 text-white/70 mb-2 font-bold text-xs uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4 text-secondary" /> Monthly Yield
                    </div>
                    <div className="text-3xl font-numeric font-bold text-secondary tracking-tight">
                      ${(Number.isNaN(totalMonthlyYield) ? 0 : totalMonthlyYield).toFixed(2)}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Optimization Opportunity Banner */}
              {isConnected && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-12 relative overflow-hidden rounded-3xl"
                >
                  {!portfolioStats ? (
                    // Skeleton State
                    <div className="p-8 bg-surface border border-border animate-pulse flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="space-y-3 w-full md:w-2/3">
                        <div className="h-4 w-32 bg-white/10 rounded-full" />
                        <div className="h-8 w-64 bg-white/20 rounded-full" />
                      </div>
                      <div className="h-12 w-40 bg-white/10 rounded-xl" />
                    </div>
                  ) : portfolioStats.idleAssets > 0 ? (
                    <div className="p-8 bg-gradient-to-r from-accent/20 via-surface to-surface border border-accent/20 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                        <Coins className="w-40 h-40 text-accent" />
                      </div>
                      
                      <div className="space-y-2 relative z-10">
                        <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                          <Zap className="w-4 h-4" /> Optimization Opportunity Found
                        </div>
                        <h2 className="text-2xl font-display font-bold text-white">
                          We found <span className="text-accent font-numeric">${Math.round(portfolioStats.idleAssets).toLocaleString()}</span> sitting idle in your wallet.
                        </h2>
                        <p className="text-gray-400 font-body">
                          Put this capital to work and earn up to <span className="text-white font-bold">12.5% APY</span> on stable assets.
                        </p>
                      </div>

                      <Button 
                        onClick={() => setCurrentView('portfolio')}
                        className="bg-white text-black hover:bg-white/90 font-bold px-8 h-14 rounded-2xl relative z-10 shadow-2xl shadow-accent/20"
                      >
                       Optimize Now <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {goals.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-12 p-4 bg-secondary/5 border border-secondary/20 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-body text-gray-300 leading-snug">
                        Yield is paying for <span className="text-accent font-bold underline decoration-accent/30">{getYieldEquivalent(totalMonthlyYield || 0)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase font-black tracking-widest">Passive Income • Optimized ⚡</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {userGoals.map((goal) => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onAddFunds={() => handleAddFunds(goal)} 
                  />
                ))}

                {userGoals.length === 0 && (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-center glass-card border-dashed">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6 border border-white/5">
                      <TargetIcon className="w-10 h-10 text-accent" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-2 text-white">No goals set yet</h2>
                    <p className="text-white/60 max-w-sm mb-8 font-body">
                      Ready to save with purpose? Create your first goal and we'll find the best vault for you.
                    </p>
                    <Button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-accent text-black hover:bg-accent/90 font-bold px-8 h-12 rounded-xl glow-cyan group"
                    >
                      Launch your first goal <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="portfolio-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <PortfolioView />
            </motion.div>
          )}
        </AnimatePresence>

        {isConnected && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="mt-16 p-8 bg-gradient-to-r from-accent/20 via-surface to-accent/5 rounded-3xl border border-accent/20 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-32 h-32 text-accent" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h3 className="font-display text-2xl font-bold mb-2 text-accent">Optimization Opportunity 🚀</h3>
              <p className="text-gray-300 mb-6 font-body">
                {portfolioStats?.idleAssets && portfolioStats.idleAssets > 0 ? (
                  <>We found approximately <span className="text-white font-bold">${portfolioStats.idleAssets.toFixed(2)}</span> in idle assets in your wallet. Moving them to your goals could increase your monthly yield by <span className="text-accent font-bold">15%</span>.</>
                ) : isScanning ? (
                  <>Deep scanning your wallet across 5+ chains for unallocated capital...</>
                ) : (
                  <>Scan your portfolio to find idle assets and optimize your yield strategies across 5+ chains.</>
                )}
              </p>
              <Button 
                onClick={handleScanPortfolio}
                disabled={isScanning}
                className="bg-white text-black hover:bg-white/90 font-bold px-6"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  portfolioStats ? 'View Portfolio' : 'Scan Portfolio'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      <CreateGoalModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <DepositModal 
        goal={selectedGoal} 
        open={isDepositModalOpen} 
        onOpenChange={setIsDepositModalOpen} 
        onDepositSuccess={handleDepositSuccess}
      />

      {milestoneGoal && (
        <ShareCardModal 
          goal={milestoneGoal}
          milestone={activeMilestone}
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
        />
      )}

      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <div className="bg-surface/90 backdrop-blur border border-border p-2 rounded-xl text-[10px] font-bold text-gray-400 text-center uppercase shadow-2xl">Visual Audit</div>
          <div className="flex gap-2">
            {[1, 25, 50, 75, 100].map((m: any) => {
              const demoGoal = userGoals[0] || { targetAmountUsd: 100 };
              const dollarValue = Math.round((m / 100) * (demoGoal?.targetAmountUsd || 100));
              return (
                <button 
                  key={m}
                  onClick={() => {
                    if (userGoals.length > 0) {
                      setMilestoneGoal(userGoals[0]);
                      setActiveMilestone(m);
                      setIsShareModalOpen(true);
                    }
                  }}
                  className="bg-surface border border-border px-3 h-10 rounded-xl text-gray-500 hover:text-accent transition-all flex flex-col items-center justify-center shadow-2xl hover:scale-110 active:scale-95"
                >
                  <span className="text-[9px] opacity-70 mb-0.5">{m}%</span>
                  <span className="font-bold text-xs">${dollarValue}</span>
                </button>
              );
            })}
          </div>
      </div>
    </div>
  );
}
