'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GoalCard } from '@/components/GoalCard';
import { CreateGoalModal } from '@/components/CreateGoalModal';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';
import { Goal, useGoalStore } from '@/store/useGoalStore';
import { Button } from '@/components/ui/button';
import { PortfolioView } from '@/components/PortfolioView';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getUserPositions, getWalletBalances, Vault } from '@/lib/lifi';
import { usePortfolio, useVaults } from '@/hooks/useLifi';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import {
  Plus,
  LayoutDashboard,
  TrendingUp,
  ArrowRight,
  Target as TargetIcon,
  Sparkles,
  Loader2,
  Coins,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { ShareCardModal } from '@/components/ShareCardModal';
import confetti from 'canvas-confetti';
import { getAllYieldEquivalents } from '@/lib/yield-utils';

function YieldBannerSlider({ monthlyYield }: { monthlyYield: number }) {
  const allEquivalents = React.useMemo(
    () => getAllYieldEquivalents(monthlyYield),
    [monthlyYield]
  );
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
        <span className="text-[8px] md:text-[10px] text-secondary font-black uppercase tracking-[0.2em] opacity-80">
          Live Yield Insight
        </span>
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
            className="text-sm md:text-lg font-display font-medium leading-normal"
          >
            Monthly yield is equivalent to{' '}
            <span className="text-secondary font-bold underline decoration-secondary/30 decoration-2 underline-offset-4">
              {allEquivalents[index]}
            </span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { address, status, isConnecting, isReconnecting } = useAccount();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [mounted, setMounted] = React.useState(false);
  const [canRedirect, setCanRedirect] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'portfolio'>('dashboard');

  const openCreateModal = () => {
    if (isCreateModalOpen) {
      setIsCreateModalOpen(false);
      window.setTimeout(() => setIsCreateModalOpen(true), 50);
      return;
    }
    setIsCreateModalOpen(true);
  };
  const [portfolioStats, setPortfolioStats] = useState<{
    totalValue: number;
    idleAssets: number;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<1 | 25 | 50 | 75 | 100>(50);
  const [milestoneGoal, setMilestoneGoal] = useState<Goal | null>(null);

  const fetchGoalsForUser = useGoalStore((state) => state.fetchGoalsForUser);
  const syncAllGoalsToCloud = useGoalStore((state) => state.syncAllGoalsToCloud);
  const goals = useGoalStore((state) => state.goals);
  const _hasHydrated = useGoalStore((state) => state._hasHydrated);

  const { data: allVaultsData } = useVaults({ limit: 100 });
  const vaultsList = allVaultsData?.vaults || [];

  const userGoals = React.useMemo(
    () => goals.filter((g) => g.ownerAddress?.toLowerCase() === address?.toLowerCase()),
    [goals, address]
  );

  React.useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setCanRedirect(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  React.useEffect(() => {
    if (tab === 'portfolio') setCurrentView('portfolio');
    else if (tab === 'dashboard') setCurrentView('dashboard');
  }, [tab]);

  React.useEffect(() => {
    if (mounted && canRedirect && status === 'disconnected' && !isReconnecting && !isConnecting) {
      router.push('/');
    }
  }, [mounted, canRedirect, status, isReconnecting, isConnecting, router]);

  React.useEffect(() => {
    if (mounted && status === 'connected' && address) {
      fetchGoalsForUser(address).then(() => {
        syncAllGoalsToCloud(address);
      });
    }
  }, [mounted, status, address, fetchGoalsForUser, syncAllGoalsToCloud]);

  // Milestone trigger
  React.useEffect(() => {
    if (!mounted || userGoals.length === 0) return;
    userGoals.forEach((goal) => {
      const currentSaved = goal.contributions.reduce((acc, c) => acc + c.amountUsd, 0);
      const progress = (currentSaved / goal.targetAmountUsd) * 100;
      let reached: 1 | 25 | 50 | 75 | 100 | null = null;
      if (progress >= 100) reached = 100;
      else if (progress >= 75) reached = 75;
      else if (progress >= 50) reached = 50;
      else if (progress >= 25) reached = 25;
      else if (progress >= 1) reached = 1;
      if (reached) {
        const key = `stashflow_milestone_${goal.id}_${reached}`;
        if (!localStorage.getItem(key)) {
          setMilestoneGoal(goal);
          setActiveMilestone(reached);
          setIsShareModalOpen(true);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00E5FF', '#FFB800', '#7C3AED'],
          });
          localStorage.setItem(key, 'true');
        }
      }
    });
  }, [userGoals, mounted]);

  // Portfolio insights
  React.useEffect(() => {
    async function fetchInsights() {
      if (!address || status !== 'connected') return;
      try {
        const [{ positions = [] }, balancesData] = await Promise.all([
          getUserPositions(address).catch(() => ({ positions: [] })),
          getWalletBalances(address).catch(() => ({})),
        ]);
        const totalActiveUsd = positions.reduce(
          (acc: number, p: any) =>
            acc + (Number(p.balanceUsd) || Number(p.amountUsd) || Number(p.value) || 0),
          0
        );
        const rawBalances =
          balancesData && typeof balancesData === 'object' && 'balances' in balancesData
            ? (balancesData as any).balances
            : balancesData;
        let totalIdleUsd = 0;
        if (rawBalances && typeof rawBalances === 'object' && !Array.isArray(rawBalances)) {
          Object.entries(rawBalances).forEach(([_, tokens]: [string, any]) => {
            if (Array.isArray(tokens)) {
              tokens.forEach((token: any) => {
                const usdValue = (Number(token.amount) || 0) * (Number(token.priceUSD) || 0);
                if (usdValue > 0.001) {
                  const isInPosition = positions.some(
                    (p: any) =>
                      p.token?.address?.toLowerCase() === token.address?.toLowerCase()
                  );
                  if (!isInPosition) totalIdleUsd += usdValue;
                }
              });
            }
          });
        }
        setPortfolioStats({
          totalValue:
            (Number.isNaN(totalActiveUsd) ? 0 : totalActiveUsd) +
            (Number.isNaN(totalIdleUsd) ? 0 : totalIdleUsd),
          idleAssets: Number.isNaN(totalIdleUsd) ? 0 : totalIdleUsd,
        });
      } catch {
        setPortfolioStats((p) => p || { totalValue: 0, idleAssets: 0 });
      }
    }
    if (mounted && status === 'connected' && address) fetchInsights();
  }, [address, status, mounted]);

  const handleDepositSuccess = (prevAmount: number, newAmount: number) => {
    if (!selectedGoal) return;
    const goal = goals.find((g) => g.id === selectedGoal.id);
    if (!goal) return;
    const prevProgress = (prevAmount / goal.targetAmountUsd) * 100;
    const newProgress = (newAmount / goal.targetAmountUsd) * 100;
    const milestones: (1 | 25 | 50 | 75 | 100)[] = [1, 25, 50, 75, 100];
    const crossed = [...milestones].reverse().find((m) => prevProgress < m && newProgress >= m);
    if (crossed) {
      confetti({
        particleCount: crossed === 100 ? 200 : 100,
        spread: crossed === 100 ? 120 : 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#FFB800', '#ffffff'],
      });
      setMilestoneGoal(goal);
      setActiveMilestone(crossed);
      setTimeout(() => setIsShareModalOpen(true), 1500);
    }
  };

  const { data: portfolio } = usePortfolio(address);

  const getGoalLivePosition = (goal: Goal) => {
    const positions = portfolio?.positions ?? [];
    return positions.find((p: any) =>
      p.chainId === goal.vault.chainId && (
        p.vaultAddress?.toLowerCase() === goal.vault.address.toLowerCase() ||
        p.address?.toLowerCase() === goal.vault.address.toLowerCase() ||
        p.token?.address?.toLowerCase() === goal.vault.address.toLowerCase() ||
        p.asset?.address?.toLowerCase() === goal.vault.address.toLowerCase() ||
        (p.protocol?.name?.toLowerCase() === goal.vault.protocol.name.toLowerCase() &&
          p.asset?.symbol?.toLowerCase() === goal.vault.underlyingTokens?.[0]?.symbol?.toLowerCase())
      )
    );
  };

  const getSuggestedVault = (goal: Goal): Vault | null => {
    if (!vaultsList.length) return null;
    const currentVault = goal.vault;
    if (currentVault.isTransactional === false) return null; // Requirement: Both must be transactional

    const candidates = vaultsList.filter((v: any) => 
      v.isTransactional && 
      v.tags?.includes(goal.riskTier) && 
      v.address.toLowerCase() !== currentVault.address.toLowerCase() &&
      Number(v.analytics?.tvl?.usd || 0) >= Number(currentVault.analytics?.tvl?.usd || 0)
    );

    const sorted = candidates.sort((a: any, b: any) => (b.analytics?.apy?.total || 0) - (a.analytics?.apy?.total || 0));
    const topVault = sorted[0];

    const currentApy = currentVault.analytics?.apy?.total || 0;
    const newApy = topVault?.analytics?.apy?.total || 0;

    if (topVault && newApy > currentApy + 1.5) {
      return topVault as Vault;
    }
    return null;
  };

  const handleAddFunds = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsDepositModalOpen(true);
  };

  const handleWithdraw = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsWithdrawModalOpen(true);
  };

  if (!mounted || !_hasHydrated) {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center',
          isDark ? 'bg-[#0A0A0F]' : 'bg-slate-50'
        )}
      >
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <p
          className={cn(
            'font-display font-bold text-xl animate-pulse',
            isDark ? 'text-white' : 'text-gray-900'
          )}
        >
          Initializing StashFlow...
        </p>
      </div>
    );
  }

  const userGoalsCount = userGoals.length;
  const totalDeposited = userGoals.reduce(
    (acc, goal) => acc + goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0),
    0
  );
  const avgApy =
    totalDeposited > 0
      ? userGoals.reduce((acc, goal) => {
          const deposited = goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0);
          return acc + deposited * (goal.vault.analytics?.apy?.total || 0);
        }, 0) / totalDeposited
      : userGoalsCount > 0
      ? userGoals.reduce((acc, goal) => acc + (goal.vault.analytics?.apy?.total || 0), 0) /
        userGoalsCount
      : 0;

  const totalMonthlyYield =
    userGoalsCount > 0
      ? userGoals.reduce((acc, goal) => {
          const deposited = goal.contributions.reduce((cAcc, c) => cAcc + c.amountUsd, 0);
          return acc + (deposited * ((goal.vault.analytics?.apy?.total || 0) / 100)) / 12;
        }, 0)
      : 0;

  // ── Theme-aware classes ───────────────────────────────────────────────────
  const pageBg = isDark ? 'bg-[#0A0A0F] text-white' : 'bg-slate-50 text-gray-900';
  const navBg = isDark
    ? 'border-border bg-surface/50 backdrop-blur-md'
    : 'border-gray-200 bg-white/80 backdrop-blur-md shadow-sm';
  const navText = isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';
  const activeNavText = isDark ? 'text-accent font-bold' : 'text-accent font-bold';
  const cardBg = isDark ? 'glass-card border-accent/20' : 'bg-white border-gray-200 shadow-sm rounded-2xl';
  const mutedText = isDark ? 'text-white/60' : 'text-gray-500';

  return (
    <div className={cn('min-h-screen', pageBg)}>
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className={cn('border-b sticky top-0 z-50', navBg)}>
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-black font-display font-extrabold text-2xl">S</span>
            </div>
            <span
              className={cn(
                'font-display font-bold text-2xl tracking-tight',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              Stashflow
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 mr-6 text-sm font-body">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={cn(
                  'flex items-center gap-2 transition-colors',
                  currentView === 'dashboard' ? activeNavText : navText
                )}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button
                onClick={() => setCurrentView('portfolio')}
                className={cn(
                  'flex items-center gap-2 transition-colors',
                  currentView === 'portfolio' ? activeNavText : navText
                )}
              >
                <TrendingUp className="w-4 h-4" /> Portfolio
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                isDark
                  ? 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              )}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="address"
            />
          </div>
        </div>
      </nav>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
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
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                  <h1
                    className={cn(
                      'font-display text-4xl font-extrabold mb-2',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    Your Dashboard
                  </h1>
                  <p className={mutedText}>
                    Manage your goals and watch your savings grow.
                  </p>
                </div>
                <Button
                  onClick={openCreateModal}
                  className="bg-accent text-black hover:bg-accent/90 font-bold px-6 h-12 rounded-xl glow-cyan"
                >
                  <Plus className="w-5 h-5 mr-2" /> New Goal
                </Button>
              </div>

              {/* Stats cards */}
              {goals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('p-6', cardBg)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 mb-2 font-bold text-xs uppercase tracking-wider',
                        mutedText
                      )}
                    >
                      <TargetIcon className="w-4 h-4 text-accent" /> Total Goals
                    </div>
                    <div
                      className={cn(
                        'text-3xl font-numeric font-bold tracking-tight',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {userGoalsCount}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn('p-6', cardBg)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 mb-2 font-bold text-xs uppercase tracking-wider',
                        mutedText
                      )}
                    >
                      <TrendingUp className="w-4 h-4 text-accent" /> Avg. APY
                    </div>
                    <div
                      className={cn(
                        'text-3xl font-numeric font-bold tracking-tight',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {(Number.isNaN(avgApy) ? 0 : avgApy).toFixed(2)}%
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn('p-6', cardBg)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 mb-2 font-bold text-xs uppercase tracking-wider',
                        mutedText
                      )}
                    >
                      <TrendingUp className="w-4 h-4 text-secondary" /> Monthly Yield
                    </div>
                    <div className="text-3xl font-numeric font-bold text-secondary tracking-tight">
                      ${(Number.isNaN(totalMonthlyYield) ? 0 : totalMonthlyYield).toFixed(2)}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Idle assets banner */}
              {status === 'connected' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-12 relative overflow-hidden rounded-3xl"
                >
                  {!portfolioStats ? (
                    <div
                      className={cn(
                        'p-8 rounded-3xl border animate-pulse flex flex-col md:flex-row justify-between items-center gap-6',
                        isDark
                          ? 'bg-surface border-border'
                          : 'bg-white border-gray-200 shadow-sm'
                      )}
                    >
                      <div className="space-y-3 w-full md:w-2/3">
                        <div
                          className={cn(
                            'h-4 w-32 rounded-full',
                            isDark ? 'bg-white/10' : 'bg-gray-100'
                          )}
                        />
                        <div
                          className={cn(
                            'h-8 w-64 rounded-full',
                            isDark ? 'bg-white/10' : 'bg-slate-200'
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          'h-12 w-40 rounded-xl',
                          isDark ? 'bg-white/5' : 'bg-slate-100'
                        )}
                      />
                    </div>
                  ) : portfolioStats.idleAssets > 0 ? (
                    <div
                      className={cn(
                        'p-8 border flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group rounded-3xl',
                        isDark
                          ? 'bg-gradient-to-r from-accent/20 via-surface to-surface border-accent/20'
                          : 'bg-gradient-to-r from-cyan-50 via-white to-white border-cyan-200'
                      )}
                    >
                      <div className={cn(
                        "absolute -inset-1 rounded-3xl blur-2xl opacity-20 transition-opacity",
                        isDark ? "bg-accent/20" : "bg-accent/5"
                      )} />
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-500">
                        <Coins className="w-40 h-40 text-accent" />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                          <Zap className="w-4 h-4" /> Optimization Opportunity Found
                        </div>
                        <h2
                          className={cn(
                            'text-2xl font-display font-bold',
                            isDark ? 'text-white' : 'text-slate-900'
                          )}
                        >
                          We found{' '}
                          <span className="text-accent font-numeric">
                            ${Math.round(portfolioStats.idleAssets).toLocaleString()}
                          </span>{' '}
                          sitting idle in your wallet.
                        </h2>
                        <p className={mutedText}>
                          Put this capital to work and earn up to{' '}
                          <span
                            className={cn(
                              'font-bold',
                              isDark ? 'text-white' : 'text-slate-900'
                            )}
                          >
                            12.5% APY
                          </span>{' '}
                          on stable assets.
                        </p>
                      </div>
                      <Button
                        onClick={() => setCurrentView('portfolio')}
                        className="bg-accent text-black hover:bg-accent/90 font-bold px-8 h-14 rounded-2xl relative z-10 shadow-lg"
                      >
                        Optimize Now <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {/* Yield banner */}
              {goals.length > 0 && totalMonthlyYield > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8 md:mb-12 relative group"
                >
                  <div className={cn(
                    "absolute -inset-1 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000",
                    isDark ? "bg-gradient-to-r from-secondary/20 via-accent/10 to-secondary/20" : "bg-accent/5"
                  )} />
                  <div
                    className={cn(
                      'relative p-6 border rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all',
                      isDark
                        ? 'bg-[#0A0A0F] border-white/5'
                        : 'bg-white border-slate-200 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-5 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <YieldBannerSlider monthlyYield={totalMonthlyYield || 0} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Goal cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {userGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    suggestedVault={getSuggestedVault(goal)}
                    onAddFunds={() => handleAddFunds(goal)}
                    onWithdraw={() => handleWithdraw(goal)}
                  />
                ))}

                {userGoals.length === 0 && (
                  <div
                    className={cn(
                      'col-span-full py-32 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed transition-all',
                      isDark
                        ? 'border-white/10'
                        : 'border-slate-200 bg-slate-50/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-20 h-20 rounded-full flex items-center justify-center mb-6 border',
                        isDark
                          ? 'bg-surface border-white/5'
                          : 'bg-white border-gray-200 shadow-sm'
                      )}
                    >
                      <TargetIcon className="w-10 h-10 text-accent" />
                    </div>
                    <h2
                      className={cn(
                        'font-display text-2xl font-bold mb-2',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      No goals set yet
                    </h2>
                    <p className={cn('max-w-sm mb-8 font-body', mutedText)}>
                      Ready to save with purpose? Create your first goal and
                      we'll find the best vault for you.
                    </p>
                    <Button
                      onClick={openCreateModal}
                      className="bg-accent text-black hover:bg-accent/90 font-bold px-8 h-12 rounded-xl glow-cyan group"
                    >
                      Launch your first goal{' '}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
      <WithdrawModal
        goal={selectedGoal}
        open={isWithdrawModalOpen}
        onOpenChange={setIsWithdrawModalOpen}
        currentBalanceUsd={selectedGoal ? selectedGoal.contributions.reduce((acc, c) => acc + c.amountUsd, 0) : 0}
        livePosition={selectedGoal ? getGoalLivePosition(selectedGoal) : undefined}
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
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="font-display text-xl font-bold animate-pulse text-white">
            Loading StashFlow Dashboard...
          </p>
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}
