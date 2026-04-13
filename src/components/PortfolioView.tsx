'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { getUserPositions, getWalletBalances } from '@/lib/lifi';
import { useGoalStore } from '@/store/useGoalStore';
import { Card } from '@/components/ui/card';
import { Loader2, Wallet, ExternalLink, TrendingUp, AlertCircle, Zap, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DepositModal } from '@/components/DepositModal';
import { EducationPopover } from '@/components/EducationPopover';
import { HelpCircle as InfoCircle } from 'lucide-react';

export function PortfolioView() {
  const { address, isConnected } = useAccount();
  const goals = useGoalStore(state => state.goals);
  const [positions, setPositions] = React.useState<any[]>([]);
  const [idleAssets, setIdleAssets] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = React.useState(false);
  const [selectedIdleAsset, setSelectedIdleAsset] = React.useState<any>(null);

  React.useEffect(() => {
    async function fetchData() {
      if (!address) return;
      setIsLoading(true);
      setError(null);
      try {
        const [positionsData, balancesData] = await Promise.all([
          getUserPositions(address),
          getWalletBalances(address)
        ]);

        // 1. Process positions (yield positions)
        setPositions(positionsData.positions || []);

        // 2. Process wallet balances (idle assets)
        const allIdle: any[] = [];
        const rawBalances = (balancesData && typeof balancesData === 'object' && 'balances' in balancesData) 
          ? (balancesData as any).balances 
          : balancesData;

        // Defensive check: Ensure we have a valid balances record
        if (rawBalances && typeof rawBalances === 'object' && !Array.isArray(rawBalances)) {
          Object.entries(rawBalances).forEach(([chainId, tokens]: [string, any]) => {
            if (Array.isArray(tokens)) {
              tokens.forEach((token: any) => {
                const amount = Number(token.amount);
                const price = Number(token.priceUSD || 0);
                const usdValue = amount * price;

                // NaN safety and Dust filter (> $0.01)
                if (!Number.isNaN(usdValue) && usdValue > 0.01) {
                  // Ensure it's not already in a position (simplified check)
                  const isInPosition = Array.isArray(positionsData.positions) && positionsData.positions.some(
                    (p: any) => p.token?.address.toLowerCase() === token.address.toLowerCase() && p.chainId === Number(chainId)
                  );
                  
                  if (!isInPosition) {
                    allIdle.push({
                      ...token,
                      chainId: Number(chainId),
                      balanceUsd: usdValue,
                      amountFormatted: Number.isNaN(amount) ? '0.00' : amount.toFixed(4)
                    });
                  }
                }
              });
            }
          });
        }
        
        // Sort by value
        setIdleAssets(allIdle.sort((a, b) => b.balanceUsd - a.balanceUsd));
      } catch (err: any) {
        console.error('Failed to fetch portfolio data:', err);
        setError('Failed to load portfolio discovery. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    if (isConnected && address) {
      fetchData();
    }
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Connect your wallet</h2>
        <p className="text-gray-400 max-w-sm mb-6">
          Connect your wallet to see your existing on-chain positions and discover idle assets.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <div className="text-center font-display space-y-1">
          <p className="font-bold text-xl">Scanning 5+ Chains...</p>
          <p className="text-gray-500 text-sm">Searching for idle yields and positions</p>
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
        <h2 className="text-xl font-display font-bold mb-2">{error}</h2>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="border-accent text-accent hover:bg-accent/10"
        >
          Retry
        </Button>
      </div>
    );
  }

  const activeValue = positions.reduce((acc, p) => acc + (Number(p.balanceUsd) || Number(p.amountUsd) || 0), 0);
  const idleValue = idleAssets.reduce((acc, a) => acc + a.balanceUsd, 0);
  const totalNetWorth = activeValue + idleValue;

  const getChainName = (id: number) => {
    switch(id) {
      case 1: return 'Mainnet';
      case 8453: return 'Base';
      case 42161: return 'Arbitrum';
      case 10: return 'Optimism';
      case 137: return 'Polygon';
      default: return 'Chain';
    }
  };

  const hasData = positions.length > 0 || idleAssets.length > 0;

  return (
    <div className="space-y-12 pb-20">
      {/* Header & Net Worth */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold mb-1">Portfolio Discovery</h2>
          <p className="text-gray-400">Consolidated view of your managed savings and idle assets.</p>
        </div>
        <div className="glass-card px-8 py-6 border-accent/20 flex flex-col items-end relative overflow-hidden group shadow-[0_0_20px_rgba(0,229,255,0.15)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-accent/10 transition-all" />
          <div className="text-xs text-accent/70 uppercase font-black mb-1 tracking-widest relative z-10 italic">Your Vault Net Worth 🔒</div>
          <div className="text-4xl font-display font-bold text-white tracking-tight relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="col-span-full py-32 flex flex-col items-center justify-center text-center glass-card border-dashed">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-accent" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">No assets detected</h2>
          <p className="text-white/60 max-w-sm mb-8 font-body">
            We couldn't find any significant assets in this wallet. Deposit funds to start earning yield!
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* Section: Idle Assets */}
          {idleAssets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                <h3 className="text-xl font-display font-bold tracking-tight">Optimization Opportunities</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {idleAssets.map((asset, idx) => (
                  <motion.div
                    key={`${asset.address}-${asset.chainId}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="glass-card p-5 border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50 transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0A0A0F] border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">{asset.symbol}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{getChainName(asset.chainId)}</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase font-black">Idle Asset</Badge>
                      </div>
                      <div className="mb-4">
                        <p className="text-2xl font-display font-bold text-white">${asset.balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-gray-500">{asset.amountFormatted} {asset.symbol}</p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedIdleAsset(asset);
                          // Handle put to work - potentially open goal creation
                          // For now we could just point to dashboard or deposit modal
                        }}
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

          {/* Section: Active Positions */}
          {positions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent fill-accent/10" />
                <h3 className="text-xl font-display font-bold tracking-tight">Active Savings</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {positions.map((pos, idx) => {
                  // Cross-reference with stored goals for enriched display
                  const matchedGoal = goals.find(g =>
                    g.vault.chainId === pos.chainId &&
                    (g.vault.address.toLowerCase() === (pos.vaultAddress || '').toLowerCase() ||
                     g.vault.underlyingTokens?.some((t: any) => t.address.toLowerCase() === pos.asset?.address?.toLowerCase()))
                  );
                  const displayProtocol = matchedGoal?.vault.protocol.name || pos.protocolName || pos.protocol?.name || 'Unknown Protocol';
                  const displayApy = matchedGoal?.vault.analytics?.apy?.total ?? pos.apy;
                  const displayName = matchedGoal?.name ? `${matchedGoal.name} (${pos.asset?.symbol || 'USDC'})` : (pos.asset?.name || pos.name || 'Managed Asset');
                  const chainExplorerUrl = pos.chainId === 8453
                    ? `https://basescan.org/address/${matchedGoal?.vault.address || pos.asset?.address}`
                    : pos.chainId === 42161
                    ? `https://arbiscan.io/address/${matchedGoal?.vault.address || pos.asset?.address}`
                    : pos.chainId === 10
                    ? `https://optimistic.etherscan.io/address/${matchedGoal?.vault.address || pos.asset?.address}`
                    : pos.chainId === 137
                    ? `https://polygonscan.com/address/${matchedGoal?.vault.address || pos.asset?.address}`
                    : `https://etherscan.io/address/${matchedGoal?.vault.address || pos.asset?.address}`;

                  return (
                  <motion.div
                    key={`${pos.vaultAddress}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="glass-card p-5 border-border hover:border-accent/30 transition-all group shadow-sm bg-surface/20 max-w-[380px]">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#0A0A0F] rounded-xl border border-border flex items-center justify-center overflow-hidden">
                            {pos.logoUri || pos.asset?.logoUri ? (
                              <img src={pos.logoUri || pos.asset?.logoUri} alt="" className="w-7 h-7" />
                            ) : (
                              <TrendingUp className="w-5 h-5 text-accent" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-base text-white">{displayName}</h3>
                            <div className="flex items-center gap-2 group/infra">
                              <p className="text-xs text-gray-400 font-body">{displayProtocol}</p>
                              <EducationPopover 
                                id="protocol-infra" 
                                term={<InfoCircle className="w-3 h-3 text-gray-500 hover:text-accent transition-colors cursor-help" />}
                              >
                                <div className="space-y-2">
                                  <p className="font-bold text-accent italic">Suite vs. Building Analogy 🏨</p>
                                  <p className="text-xs leading-relaxed text-gray-300">
                                    Think of <span className="text-white font-bold">{displayProtocol}</span> as a premium **Suite** (the vault). 
                                    It's built on top of the **Morpho** infrastructure (the Building). 
                                  </p>
                                  <p className="text-[10px] text-gray-500 italic">
                                    Just as a hotel room 204 exists within a Marriott, your vault is secured by Morpho's bedrock technology.
                                  </p>
                                </div>
                              </EducationPopover>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-accent/10 text-accent border-accent/20 px-2.5 py-0.5 font-bold text-[10px]">
                          {getChainName(pos.chainId)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="space-y-0.5">
                          <div className="text-[9px] text-gray-500 uppercase font-black">Balance</div>
                          <div className="text-xl font-display font-bold text-white">
                            ${(Number(pos.balanceUsd) || Number(pos.amountUsd) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-[10px] text-gray-500 uppercase font-bold">APY</div>
                          <div className="text-xl font-display font-bold text-secondary">
                            {displayApy
                              ? `${Number(displayApy).toFixed(2)}%`
                              : <span className="text-sm text-gray-500 font-body font-normal">Via Vault</span>
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="text-[10px] text-gray-500 font-body uppercase tracking-widest">
                          Asset: {pos.asset?.symbol || pos.token?.symbol || 'Unknown'}
                        </div>
                        <a 
                          href={chainExplorerUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "text-accent hover:text-accent/80 hover:bg-accent/10 px-0 h-auto font-bold flex items-center gap-2"
                          )}
                        >
                          View Vault <ExternalLink className="w-3 h-3" />
                        </a>
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

function ShieldCheck({ className, fill }: { className?: string; fill?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill={fill || "none"} 
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

