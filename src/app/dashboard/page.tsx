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
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getUserPositions, getWalletBalances, getVaultDetails } from '@/lib/lifi';
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
  Zap,
  RefreshCw
} from 'lucide-react';

import { ShareCardModal } from '@/components/ShareCardModal';
import confetti from 'canvas-confetti';
import { getYieldEquivalent, getAllYieldEquivalents } from '@/lib/yield-utils';

function YieldBannerSlider({ monthlyYield }: { monthlyYield: number }) {
  const allEquivalents = React.useMemo(() => getAllYieldEquivalents(monthlyYield), [monthlyYield]);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (allEquivalents.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % allEquivalents.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [allEquivalents]);

  return (
    <div className="space-y-0.5 min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-[8px] md:text-[10px] text-secondary font-black uppercase tracking-[0.2em] opacity-80">Live Yield Insight</span>
        <div className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
      </div>
      
      <div className="relative min-h-[3rem] md:min-h-[1.5rem] flex items-center overflow-visible">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-sm md:text-lg font-display font-medium text-white leading-normal"
          >
            Monthly yield is equivalent to <span className="text-secondary font-bold underline decoration-secondary/30 decoration-2 underline-offset-4">{allEquivalents[index]}</span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { address, status, isConnecting, isReconnecting } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [canRedirect, setCanRedirect] = React.useState(false);
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
  const [isSyncing, setIsSyncing] = useState(false);

  const updateVaults = useGoalStore((state) => state.updateVaults);
  const fetchGoalsForUser = useGoalStore((state) => state.fetchGoalsForUser);
  const syncAllGoalsToCloud = useGoalStore((state) => state.syncAllGoalsToCloud);

  const goals = useGoalStore((state) => state.goals);
  const _hasHydrated = useGoalStore((state) => state._hasHydrated);

  // Filter goals by current address
  const userGoals = React.useMemo(() => 
    goals.filter(g => g.ownerAddress?.toLowerCase() === address?.toLowerCase()),
    [goals, address]
  );

  React.useEffect(() => {
    setMounted(true);
    // Give wagmi/rainbowkit 1.5 seconds to restore session before allowing redirect
    const timer = setTimeout(() => setCanRedirect(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  React.useEffect(() => {
    if (tab === 'portfolio') {
      setCurrentView('portfolio');
    } else if (tab === 'dashboard') {
      setCurrentView('dashboard');
    }
  }, [tab]);

  React.useEffect(() => {
    if (mounted && canRedirect && status === 'disconnected' && !isReconnecting && !isConnecting) {
      router.push('/');
    }
  }, [mounted, canRedirect, status, isReconnecting, isConnecting, router]);

  // LIVE APY SYNC - DISABLED FOR DEMO STABILITY (Reduces 429 Errors)
  /*
  React.useEffect(() => {
    async function syncVaults() {
      if (!mounted || userGoals.length === 0 || isSyncing) return;
      
      setIsSyncing(true);
      try {
        const uniqueVaults = Array.from(new Set(userGoals.map(g => `${g.vault.chainId}-${g.vault.address.toLowerCase()}`)));
        const updates: Record<string, any> = {};

        await Promise.all(uniqueVaults.map(async (key) => {
          const [chainId, address] = key.split('-');
          try {
            const data = await getVaultDetails(Number(chainId), address);
            if (data && data.analytics) {
              updates[key] = data.analytics;
            }
          } catch (e) {
            console.warn(`Failed to sync vault ${key}`, e);
          }
        }));

        if (Object.keys(updates).length > 0) {
          updateVaults(updates);
        }
      } finally {
        setTimeout(() => setIsSyncing(false), 2000);
      }
    }

    if (mounted && status === 'connected') {
      syncVaults();
    }
  }, [mounted, status, userGoals.length]);
  */

  // Fetch cloud goals on connect/mount
  React.useEffect(() => {
    if (mounted && status === 'connected' && address) {
      fetchGoalsForUser(address).then(() => {
        syncAllGoalsToCloud(address);
      });
    }
  }, [mounted, status, address, fetchGoalsForUser, syncAllGoalsToCloud]);

  // AUTO-MILESTONE TRIGGER LOGIC
  React.useEffect(() => {
    if (!mounted || userGoals.length === 0) return;

    userGoals.forEach(goal => {
      const currentSaved = goal.contributions.reduce((acc, curr) => acc + curr.amountUsd, 0);
      const progress = (currentSaved / goal.targetAmountUsd) * 100;
      
      let reached: 1 | 25 | 50 | 75 | 100 | null = null;
      if (progress >= 100) reached = 100;
      else if (progress >= 75) reached = 75;
      else if (progress >= 50) reached = 50;
      else if (progress >= 25) reached = 25;
      else if (progress >= 1) reached = 1;

      if (reached) {
        const key = `stashflow_milestone_${goal.id}_${reached}`;
        const hasShown = localStorage.getItem(key);

        if (!hasShown) {
          setMilestoneGoal(goal);
          setActiveMilestone(reached);
          setIsShareModalOpen(true);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00E5FF', '#FFB800', '#7C3AED']
          });
          localStorage.setItem(key, 'true');
        }
      }
    });
  }, [userGoals, mounted]);

  const handleScanPortfolio = async () => {
    if (!address) return;
    setIsScanning(true);
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
      if (rawBalances && typeof rawBalances === 'object' && !Array.isArray(rawBalances)) {
        Object.entries(rawBalances).forEach(([_, tokens]: [string, any]) => {
          if (Array.isArray(tokens)) {
            tokens.forEach((token: any) => {
              const amount = Number(token.amount ?? 0);
              const price = Number(token.priceUSD ?? 0);
              const usdValue = amount * price;

              if (!Number.isNaN(usdValue) && usdValue > 0.05) {
                const isInPosition = positions.some((p: any) => {
                  const pAddr = p.token?.address?.toLowerCase();
                  const tAddr = token.address?.toLowerCase();
                  if (pAddr === tAddr) return true;
                  const isNative = (addr: string) => addr === '0x0000000000000000000000000000000000000000' || addr === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
                  if (isNative(pAddr) && isNative(tAddr)) return true;
                  return false;
                });
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
      setPortfolioStats(prev => prev || { totalValue: 0, idleAssets: 0 });
    } finally {
      setIsScanning(false);
    }
  };

  // FETCH INSIGHTS ON MOUNT
  React.useEffect(() => {
    async function fetchInsights() {
      if (!address || status !== 'connected') return;
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
        if (rawBalances && typeof rawBalances === 'object' && !Array.isArray(rawBalances)) {
          Object.entries(rawBalances).forEach(([_, tokens]: [string, any]) => {
            if (Array.isArray(tokens)) {
              tokens.forEach((token: any) => {
                const usdValue = (Number(token.amount) || 0) * (Number(token.priceUSD) || 0);
                if (usdValue > 0.05) {
                  const isInPosition = positions.some((p: any) => p.token?.address?.toLowerCase() === token.address?.toLowerCase());
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
        setPortfolioStats(p => p || { totalValue: 0, idleAssets: 0 });
      }
    }
    if (mounted && status === 'connected' && address) fetchInsights();
  }, [address, status, mounted]);

  const handleDepositSuccess = (prevAmount: number, newAmount: number) => {
    if (!selectedGoal) return;
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

  const avgApy = totalDeposited > 0
    ? userGoals.reduce((acc, goal) => {
        const deposited = goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0);
        return acc + (deposited * (goal.vault.analytics?.apy?.total || 0));
      }, 0) / totalDeposited
    : (userGoalsCount > 0 
        ? userGoals.reduce((acc, goal) => acc + (goal.vault.analytics?.apy?.total || 0), 0) / userGoalsCount 
        : 0);

  const totalMonthlyYield = userGoalsCount > 0
    ? userGoals.reduce((acc, goal) => {
        const deposited = goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0);
        return acc + (deposited * ((goal.vault.analytics?.apy?.total || 0) / 100)) / 12;
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
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
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-accent/20">
                    <div className="flex items-center gap-3 text-white/70 mb-2 font-bold text-xs uppercase tracking-wider">
                      <TargetIcon className="w-4 h-4 text-accent" /> Total Goals
                    </div>
                    <div className="text-3xl font-numeric font-bold text-white tracking-tight">{userGoalsCount}</div>
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 border-accent/20">
                    <div className="flex items-center gap-3 text-white/70 mb-2 font-bold text-xs uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4 text-accent" /> Avg. APY
                    </div>
                    <div className="text-3xl font-numeric font-bold text-white tracking-tight flex items-center gap-2">
                      {(Number.isNaN(avgApy) ? 0 : avgApy).toFixed(2)}%
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 border-secondary/20">
                    <div className="flex items-center gap-3 text-white/70 mb-2 font-bold text-xs uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4 text-secondary" /> Monthly Yield
                    </div>
                    <div className="text-3xl font-numeric font-bold text-secondary tracking-tight">
                      ${(Number.isNaN(totalMonthlyYield) ? 0 : totalMonthlyYield).toFixed(2)}
                    </div>
                  </motion.div>
                </div>
              )}

              {status === 'connected' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 relative overflow-hidden rounded-3xl">
                  {!portfolioStats ? (
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
                        <p className="text-gray-400 font-body">Put this capital to work and earn up to <span className="text-white font-bold">12.5% APY</span> on stable assets.</p>
                      </div>
                      <Button 
                        onClick={() => setCurrentView('portfolio')}
                        className="bg-white text-black hover:bg-white/90 font-bold px-8 h-14 rounded-2xl relative z-10 shadow-2xl shadow-accent/20"
                      >
                       Optimize Now <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-8 bg-surface border border-border flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="space-y-2">
                        <h2 className="text-xl font-display font-bold text-white">Monitoring your on-chain positions...</h2>
                        <p className="text-gray-400 text-sm">We're tracking your assets to find growth opportunities.</p>
                      </div>
                      <Button onClick={handleScanPortfolio} disabled={isScanning} className="bg-white/10 text-white hover:bg-white/20 px-6 h-12 rounded-xl border border-white/5">
                        {isScanning ? <Loader2 className="animate-spin" /> : 'Scan Portfolio'}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {goals.length > 0 && totalMonthlyYield > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8 md:mb-12 relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-secondary/20 via-accent/10 to-secondary/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                  <div className="relative p-6 bg-[#0A0A0F] border border-white/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <YieldBannerSlider monthlyYield={totalMonthlyYield || 0} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {userGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onAddFunds={() => handleAddFunds(goal)} />
                ))}

                {userGoals.length === 0 && (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-center glass-card border-dashed">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6 border border-white/5">
                      <TargetIcon className="w-10 h-10 text-accent" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-2 text-white">No goals set yet</h2>
                    <p className="text-white/60 max-w-sm mb-8 font-body">Ready to save with purpose? Create your first goal and we'll find the best vault for you.</p>
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
    </div>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className="font-display text-xl font-bold animate-pulse text-white">Loading StashFlow Dashboard...</p>
      </div>
    }>
      <DashboardContent />
    </React.Suspense>
  );
}
