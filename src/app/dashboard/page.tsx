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
  Loader2
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
  const [activeMilestone, setActiveMilestone] = useState<25 | 50 | 100>(50);
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

      const totalActiveUsd = positions.reduce((acc: number, p: any) => acc + (Number(p.amountUsd) || 0), 0);
      
      let totalIdleUsd = 0;
      Object.entries(balancesData).forEach(([_, tokens]: [string, any]) => {
        tokens.forEach((token: any) => {
          const usdValue = Number(token.amount) * (token.priceUSD || 0);
          if (usdValue > 1.00) {
            const isInPosition = positions.some(
              (p: any) => p.token?.address.toLowerCase() === token.address.toLowerCase()
            );
            if (!isInPosition) totalIdleUsd += usdValue;
          }
        });
      });
      
      setPortfolioStats({ 
        totalValue: totalActiveUsd + totalIdleUsd, 
        idleAssets: totalIdleUsd 
      });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCurrentView('portfolio');
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  React.useEffect(() => {
    async function fetchInsights() {
      if (!address || !isConnected) return;
      try {
        const [{ positions = [] }, balancesData] = await Promise.all([
          getUserPositions(address),
          getWalletBalances(address)
        ]);

        const totalActiveUsd = positions.reduce((acc: number, p: any) => acc + (Number(p.amountUsd) || 0), 0);
        
        let totalIdleUsd = 0;
        Object.entries(balancesData).forEach(([_, tokens]: [string, any]) => {
          tokens.forEach((token: any) => {
            const usdValue = Number(token.amount) * (token.priceUSD || 0);
            // Dust filter
            if (usdValue > 1.00) {
              const isInPosition = positions.some(
                (p: any) => p.token?.address.toLowerCase() === token.address.toLowerCase()
              );
              if (!isInPosition) totalIdleUsd += usdValue;
            }
          });
        });

        setPortfolioStats({ 
          totalValue: totalActiveUsd + totalIdleUsd, 
          idleAssets: totalIdleUsd 
        });
      } catch (err) {
        console.error('Insight fetch failed:', err);
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
    
    const milestones: (25 | 50 | 100)[] = [25, 50, 100];
    const crossed = milestones.find(m => prevProgress < m && newProgress >= m);
    
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
    ? userGoals.reduce((acc, goal) => acc + goal.vault.analytics.apy.total, 0) / userGoalsCount 
    : 0;

  const totalMonthlyYield = userGoalsCount > 0
    ? userGoals.reduce((acc, goal) => {
        const deposited = goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0);
        return acc + (deposited * goal.vault.analytics.apy.total) / 12;
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
                    <div className="text-3xl font-numeric font-bold text-white tracking-tight">${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                    <div className="text-3xl font-numeric font-bold text-white tracking-tight">{(avgApy * 100).toFixed(2)}%</div>
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
                    <div className="text-3xl font-numeric font-bold text-secondary tracking-tight">${totalMonthlyYield.toFixed(2)}</div>
                  </motion.div>
                </div>
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
                      <p className="text-sm font-body text-gray-300">
                        Total Portfolio Yield: Your combined stash is currently covering <span className="text-secondary font-bold">{getYieldEquivalent(totalMonthlyYield)}</span> per month.
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block text-[10px] text-gray-500 uppercase font-bold tracking-widest whitespace-nowrap">
                    Passive Income • Optimized ⚡
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

      {/* Dev Trigger */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={triggerDevMilestone}
          className="fixed bottom-4 right-4 bg-surface border border-border p-2 rounded-full text-gray-500 hover:text-accent transition-all z-50 flex items-center gap-2 text-xs font-bold"
        >
          <Sparkles className="w-4 h-4" /> 🎭 Trigger Share Card (Dev)
        </button>
      )}
    </div>
  );
}
