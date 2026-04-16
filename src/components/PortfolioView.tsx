'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { getUserPositions, getWalletBalances } from '@/lib/lifi';
import { useGoalStore } from '@/store/useGoalStore';
import { Card } from '@/components/ui/card';
import { Loader2, Wallet, ExternalLink, TrendingUp, AlertCircle, Coins, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export function PortfolioView() {
  const { address, isConnected } = useAccount();
  const goals = useGoalStore(state => state.goals);
  const { theme, toggleTheme } = useTheme();

  const [positions, setPositions] = React.useState<any[]>([]);
  const [idleAssets, setIdleAssets] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const [positionsResult, balancesResult] = await Promise.allSettled([
        getUserPositions(address),
        getWalletBalances(address),
      ]);

      const rawPositions =
        positionsResult.status === 'fulfilled'
          ? positionsResult.value.positions || []
          : [];
      const balancesData =
        balancesResult.status === 'fulfilled' ? balancesResult.value : null;

      const uniquePositions = rawPositions.filter(
        (pos: any, index: number, self: any[]) =>
          index ===
          self.findIndex(
            (p: any) =>
              (p.vaultAddress || p.address) ===
                (pos.vaultAddress || pos.address) &&
              p.chainId === pos.chainId
          )
      );
      setPositions(uniquePositions);

      const allIdle: any[] = [];
      const rawBalances =
        balancesData &&
        typeof balancesData === 'object' &&
        'balances' in balancesData
          ? (balancesData as any).balances
          : balancesData;

      if (
        rawBalances &&
        typeof rawBalances === 'object' &&
        !Array.isArray(rawBalances)
      ) {
        Object.entries(rawBalances).forEach(
          ([chainId, tokens]: [string, any]) => {
            if (Array.isArray(tokens)) {
              tokens.forEach((token: any) => {
                const amount = Number(token.amount);
                const price = Number(token.priceUSD || 0);
                const usdValue = amount * price;

                // Dust filter (0.001) for demo stability with small balances
                if (!Number.isNaN(usdValue) && usdValue > 0.001) {
                  const isInPosition = rawPositions.some(
                    (p: any) =>
                      p.token?.address.toLowerCase() ===
                        token.address.toLowerCase() &&
                      p.chainId === Number(chainId)
                  );

                  if (!isInPosition) {
                    allIdle.push({
                      ...token,
                      chainId: Number(chainId),
                      balanceUsd: usdValue,
                      amountFormatted: Number.isNaN(amount)
                        ? '0.00'
                        : amount.toFixed(4),
                    });
                  }
                }
              });
            }
          }
        );
      }

      setIdleAssets(allIdle.sort((a, b) => b.balanceUsd - a.balanceUsd));
      setLastSynced(new Date());
    } catch (err: any) {
      console.error('Failed to fetch portfolio data:', err);
      setError('Failed to load portfolio data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    if (isConnected && address) {
      fetchData();
    }
  }, [address, isConnected, fetchData]);

  // ─── Theme-aware class helpers ────────────────────────────────────────────
  const isDark = theme === 'dark';

  const bg = isDark ? 'bg-[#0A0A0F]' : 'bg-slate-50/50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-slate-500';
  const textSubtle = isDark ? 'text-gray-500' : 'text-slate-400';
  const cardBg = isDark
    ? 'bg-surface/20 border-border'
    : 'bg-white border-slate-200 shadow-sm';
  const glassBg = isDark
    ? 'bg-white/5 border border-white/10'
    : 'bg-white border border-slate-200 shadow-md';
  const surfaceBg = isDark ? 'bg-[#0A0A0F]' : 'bg-white';
  const idleCardBg = isDark
    ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50'
    : 'bg-amber-50/50 border-amber-100 hover:border-amber-200 shadow-sm';
  const borderSubtle = isDark ? 'border-border' : 'border-slate-100';

  // ─── Not connected ─────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-20 text-center',
          bg
        )}
      >
        <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-6', isDark ? 'bg-surface' : 'bg-gray-100')}>
          <Wallet className={cn('w-8 h-8', textMuted)} />
        </div>
        <h2 className={cn('text-2xl font-display font-bold mb-2', textPrimary)}>
          Connect your wallet
        </h2>
        <p className={cn('max-w-sm mb-6', textMuted)}>
          Connect your wallet to see your existing on-chain positions and
          discover idle assets.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <div className="text-center font-display space-y-1">
          <p className={cn('font-bold text-xl', textPrimary)}>
            Scanning 5+ Chains...
          </p>
          <p className={cn('text-sm', textMuted)}>
            Searching for idle yields and positions
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className={cn('text-xl font-display font-bold mb-2', textPrimary)}>
          {error}
        </h2>
        <Button
          variant="outline"
          onClick={fetchData}
          className="border-accent text-accent hover:bg-accent/10"
        >
          Retry
        </Button>
      </div>
    );
  }

  // ─── Computed values ───────────────────────────────────────────────────────
  const activeValue = positions.reduce(
    (acc, p) =>
      acc + (Number(p.balanceUsd) || Number(p.amountUsd) || Number(p.value) || 0),
    0
  );
  const idleValue = idleAssets.reduce((acc, a) => acc + a.balanceUsd, 0);

  // Goals with contributions — used as fallback when on-chain positions are unavailable
  const goalsWithContributions = goals.filter((g) => {
    const storedBalance = g.contributions.reduce(
      (acc, c) => acc + c.amountUsd,
      0
    );
    return storedBalance >= 0.001;
  });

  const storedSavingsTotal = goalsWithContributions.reduce(
    (acc, g) => acc + g.contributions.reduce((a, c) => a + c.amountUsd, 0),
    0
  );

  const totalNetWorth = Math.max(activeValue, storedSavingsTotal) + idleValue;

  // hasData: true if there's anything meaningful to display
  const hasData =
    positions.length > 0 ||
    idleAssets.length > 0 ||
    goalsWithContributions.length > 0;

  const getChainName = (id: number) => {
    switch (id) {
      case 1: return 'Mainnet';
      case 8453: return 'Base';
      case 42161: return 'Arbitrum';
      case 10: return 'Optimism';
      case 137: return 'Polygon';
      default: return 'Chain';
    }
  };

  const getExplorerUrl = (chainId: number, addr: string) => {
    switch (chainId) {
      case 8453: return `https://basescan.org/address/${addr}`;
      case 42161: return `https://arbiscan.io/address/${addr}`;
      case 10: return `https://optimistic.etherscan.io/address/${addr}`;
      case 137: return `https://polygonscan.com/address/${addr}`;
      default: return `https://etherscan.io/address/${addr}`;
    }
  };

  return (
    <div className={cn('space-y-12 pb-20', bg, 'transition-colors duration-300')}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <h2 className={cn('text-3xl font-display font-bold', textPrimary)}>
            Portfolio Monitoring
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className={cn(
              'h-8 gap-2 font-bold px-3',
              isDark
                ? 'border-accent/20 text-accent hover:bg-accent/10'
                : 'border-accent text-accent hover:bg-accent/10'
            )}
          >
            <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
            Sync Now
          </Button>
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={cn(
              'h-8 w-8 p-0 rounded-full',
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        {/* Net Worth card */}
        <div
          className={cn(
            'px-8 py-6 rounded-2xl border flex flex-col items-end relative overflow-hidden group transition-all duration-500',
            isDark
              ? 'bg-white/5 border-accent/20 shadow-[0_0_20px_rgba(0,229,255,0.15)]'
              : 'bg-white border-slate-200 shadow-lg'
          )}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-accent/10 transition-all" />
          <div className="text-xs text-accent/70 uppercase font-black mb-1 tracking-widest relative z-10 italic">
            Your Vault Net Worth 🔒
          </div>
          <div
            className={cn(
              'text-4xl font-display font-bold tracking-tight relative z-10 transition-colors',
              isDark
                ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : 'text-slate-900'
            )}
          >
            ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          {lastSynced && (
            <div className={cn('text-[10px] mt-1 relative z-10', textSubtle)}>
              Synced {lastSynced.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!hasData ? (
        <div
          className={cn(
            'col-span-full py-32 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed transition-all',
            isDark ? 'border-white/10' : 'border-slate-300 bg-slate-50/50'
          )}
        >
          <div
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center mb-6',
              isDark ? 'bg-surface' : 'bg-gray-100'
            )}
          >
            <TrendingUp className="w-10 h-10 text-accent" />
          </div>
          <h2 className={cn('font-display text-2xl font-bold mb-2', textPrimary)}>
            No assets detected
          </h2>
          <p className={cn('max-w-sm mb-8 font-body', textMuted)}>
            We couldn't find any significant assets in this wallet. Deposit
            funds to start earning yield!
          </p>
        </div>
      ) : (
        <div className="space-y-12">

          {/* ── Idle Assets ───────────────────────────────────────────────── */}
          {idleAssets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className={cn('text-xl font-display font-bold tracking-tight', textPrimary)}>
                  Idle Assets
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {idleAssets.map((asset, idx) => (
                  <motion.div
                    key={`${asset.address}-${asset.chainId}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={cn(
                        'p-5 transition-all group !overflow-visible relative',
                        idleCardBg
                      )}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full border flex items-center justify-center text-amber-500',
                              isDark
                                ? 'bg-[#0A0A0F] border-amber-500/20'
                                : 'bg-amber-50 border-amber-200'
                            )}
                          >
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className={cn('font-bold text-sm', textPrimary)}>
                              {asset.symbol}
                            </h4>
                            <p className={cn('text-[10px] font-bold uppercase', textSubtle)}>
                              {getChainName(asset.chainId)}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] uppercase font-black">
                          Idle Asset
                        </Badge>
                      </div>
                      <div className="mb-4">
                        <p className={cn('text-2xl font-display font-bold', textPrimary)}>
                          ${asset.balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className={cn('text-[10px]', textSubtle)}>
                          {asset.amountFormatted} {asset.symbol}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold"
                      >
                        Put to Work <TrendingUp className="ml-2 w-4 h-4" />
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Active Savings (goals from store + on-chain data) ─────────── */}
          {goalsWithContributions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="w-5 h-5 text-accent"
                  fill="rgba(0,229,255,0.1)"
                />
                <h3 className={cn('text-xl font-display font-bold tracking-tight', textPrimary)}>
                  Active Savings
                </h3>
                <Badge
                  className={cn(
                    'text-[10px] font-black uppercase transition-all',
                    isDark
                      ? 'bg-accent/10 text-accent border-accent/20'
                      : 'bg-cyan-50 text-cyan-700 border-cyan-100'
                  )}
                >
                  {goalsWithContributions.length} Active
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goalsWithContributions.map((goal, idx) => {
                  // Stored contribution balance (always available)
                  const storedBalance = goal.contributions.reduce(
                    (acc, c) => acc + c.amountUsd,
                    0
                  );

                  // Try to find on-chain position for live balance
                  const pos = positions.find((p) => {
                    if (p.chainId !== goal.vault.chainId) return false;
                    const matchAddr = (addr: string) =>
                      addr.toLowerCase() === goal.vault.address.toLowerCase();
                    return (
                      matchAddr(p.vaultAddress || '') ||
                      matchAddr(p.address || '') ||
                      matchAddr(p.token?.address || '') ||
                      (p.protocol?.name?.toLowerCase() ===
                        goal.vault.protocol.name.toLowerCase() &&
                        p.asset?.symbol?.toLowerCase() ===
                          goal.vault.underlyingTokens[0]?.symbol?.toLowerCase())
                    );
                  });

                  // Use on-chain balance if available and makes sense, else fall back to stored
                  const onChainBalance = pos
                    ? Number(pos.balanceUsd) || Number(pos.amountUsd) || Number(pos.value) || 0
                    : 0;
                  const displayBalance = onChainBalance > 0
                    ? onChainBalance
                    : storedBalance;
                  const isLiveBalance = onChainBalance > 0;

                  const displayProtocol =
                    goal.vault.protocol.name || 'Unknown Protocol';
                  const displayApy =
                    goal.vault.analytics?.apy?.total ?? pos?.apy;
                  const displayName = `${goal.name} (${
                    pos?.asset?.symbol ||
                    goal.vault.underlyingTokens?.[0]?.symbol ||
                    'USDC'
                  })`;
                  const vaultAddr =
                    goal.vault.address ||
                    pos?.vaultAddress ||
                    pos?.address ||
                    '';
                  const explorerUrl = getExplorerUrl(goal.vault.chainId, vaultAddr);

                  return (
                    <motion.div
                      key={`${goal.id}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="w-full"
                    >
                      <Card
                        className={cn(
                          'p-4 transition-all group w-full !overflow-hidden',
                          isDark
                            ? 'bg-surface/20 border-border hover:border-accent/30 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-accent/30 shadow-sm hover:shadow-md'
                        )}
                      >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden transition-all',
                                isDark
                                  ? 'bg-[#0A0A0F] border-border'
                                  : 'bg-slate-50 border-slate-200'
                              )}
                            >
                              {(pos as any)?.logoUri || (pos as any)?.asset?.logoUri ? (
                                <img
                                  src={(pos as any).logoUri || (pos as any).asset.logoUri}
                                  alt=""
                                  className="w-7 h-7"
                                />
                              ) : (
                                <TrendingUp className="w-5 h-5 text-accent" />
                              )}
                            </div>
                            <div>
                              <h3
                                className={cn(
                                  'font-display font-bold text-sm truncate max-w-[120px]',
                                  textPrimary
                                )}
                              >
                                {displayName}
                              </h3>
                              <p className={cn('text-[10px] font-body', textSubtle)}>
                                {displayProtocol}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              'px-2.5 py-0.5 font-bold text-[10px]',
                              isDark
                                ? 'bg-accent/10 text-accent border-accent/20'
                                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            )}
                          >
                            {getChainName(goal.vault.chainId)}
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="space-y-0.5">
                            <div className={cn('text-[9px] uppercase font-black', textSubtle)}>
                              Balance
                              {isLiveBalance && (
                                <span className="ml-1 text-accent">● Live</span>
                              )}
                            </div>
                            <div
                              className={cn(
                                'text-xl font-display font-bold',
                                textPrimary
                              )}
                            >
                              $
                              {displayBalance.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <div className="space-y-1 text-right">
                            <div className={cn('text-[10px] uppercase font-bold', textSubtle)}>
                              APY
                            </div>
                            <div className="text-xl font-display font-bold text-secondary">
                              {displayApy ? (
                                `${Number(displayApy).toFixed(2)}%`
                              ) : (
                                <span className={cn('text-sm font-body font-normal', textMuted)}>
                                  Via Vault
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div
                          className={cn(
                            'flex items-center justify-between pt-4 border-t',
                            borderSubtle
                          )}
                        >
                          <div className={cn('text-[10px] font-body uppercase tracking-widest', textSubtle)}>
                            Asset:{' '}
                            {(pos as any)?.asset?.symbol ||
                              (pos as any)?.token?.symbol ||
                              goal.vault.underlyingTokens?.[0]?.symbol ||
                              'USDC'}
                          </div>
                          {vaultAddr && (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'sm' }),
                                'text-accent hover:text-accent/80 hover:bg-accent/10 px-0 h-auto font-bold flex items-center gap-2'
                              )}
                            >
                              View Vault <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Unlinked managed positions (on-chain but no matching goal) ── */}
          {positions.filter(
            (p) =>
              !goals.some(
                (g) =>
                  g.vault.chainId === p.chainId &&
                  (
                    (p.vaultAddress || p.address || '').toLowerCase() ===
                      g.vault.address.toLowerCase() ||
                    (p.token?.address || p.asset?.address || '').toLowerCase() ===
                      g.vault.address.toLowerCase()
                  )
              )
          ).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp
                  className={cn('w-5 h-5', isDark ? 'text-accent/50' : 'text-accent/70')}
                />
                <h3
                  className={cn(
                    'text-lg font-display font-bold tracking-tight',
                    isDark ? 'text-white/70' : 'text-gray-600'
                  )}
                >
                  Managed Assets
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
                {positions
                  .filter(
                    (p) =>
                      !goals.some(
                        (g) =>
                          g.vault.chainId === p.chainId &&
                          (
                            (p.vaultAddress || p.address || '').toLowerCase() ===
                              g.vault.address.toLowerCase() ||
                            (p.token?.address || p.asset?.address || '').toLowerCase() ===
                              g.vault.address.toLowerCase()
                          )
                      )
                  )
                  .map((pos, idx) => {
                    const displayProtocol =
                      pos.protocolName || pos.protocol?.name || 'Unknown Protocol';
                    const displayName =
                      pos.asset?.name || pos.name || 'Managed Position';

                    return (
                      <motion.div
                        key={`unlinked-${idx}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Card
                          className={cn(
                            'p-4 transition-all',
                            isDark
                              ? 'bg-white/5 border-white/5 hover:border-white/10'
                              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                          )}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center',
                                  isDark ? 'bg-black/40' : 'bg-gray-50'
                                )}
                              >
                                <TrendingUp
                                  className={cn(
                                    'w-4 h-4',
                                    isDark ? 'text-accent/40' : 'text-accent/60'
                                  )}
                                />
                              </div>
                              <div>
                                <h4 className={cn('font-bold text-xs', textPrimary)}>
                                  {displayName}
                                </h4>
                                <p className={cn('text-[9px]', textSubtle)}>
                                  {displayProtocol}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={cn(
                                'text-[8px]',
                                isDark
                                  ? 'bg-white/5 text-white/40 border-white/5'
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                              )}
                            >
                              {getChainName(pos.chainId)}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-end">
                            <p
                              className={cn(
                                'text-lg font-display font-bold',
                                isDark ? 'text-white/80' : 'text-gray-800'
                              )}
                            >
                              $
                              {(Number(pos.balanceUsd) || 0).toLocaleString(
                                undefined,
                                { minimumFractionDigits: 2 }
                              )}
                            </p>
                            <div className="text-right">
                              <p className={cn('text-[8px] uppercase font-black', textSubtle)}>
                                APY
                              </p>
                              <p className="text-xs font-bold text-secondary/70">
                                {pos.apy
                                  ? `${Number(pos.apy).toFixed(2)}%`
                                  : 'Managed'}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShieldCheck({
  className,
  fill,
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={fill || 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
