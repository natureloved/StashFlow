'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { getUserPositions } from '@/lib/lifi';
import { Card } from '@/components/ui/card';
import { Loader2, Wallet, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function PortfolioView() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchPositions() {
      if (!address) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await getUserPositions(address);
        // data.positions is usually the array
        setPositions(data.positions || []);
      } catch (err: any) {
        console.error('Failed to fetch positions:', err);
        setError('Failed to load portfolio data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    if (isConnected && address) {
      fetchPositions();
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
          Connect your wallet to see your existing on-chain positions and idle assets.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <p className="font-display font-bold">Scanning chains for positions...</p>
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

  const totalValue = positions.reduce((acc, p) => acc + (Number(p.amountUsd) || 0), 0);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold mb-1">Portfolio Overview</h2>
          <p className="text-gray-400">Manage your across-chain yield positions.</p>
        </div>
        <div className="glass-card px-6 py-4 border-accent/20">
          <div className="text-xs text-gray-500 uppercase font-bold mb-1">Net Worth</div>
          <div className="text-3xl font-display font-bold text-accent">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="col-span-full py-32 flex flex-col items-center justify-center text-center glass-card border-dashed">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-accent" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">No active positions</h2>
          <p className="text-white/60 max-w-sm mb-8 font-body">
            We couldn't find any active yield positions for this wallet. Create a goal to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {positions.map((pos, idx) => (
            <motion.div
              key={`${pos.vaultAddress}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="glass-card p-6 border-border hover:border-accent/30 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0A0A0F] rounded-xl border border-border flex items-center justify-center overflow-hidden">
                      {pos.logoUri ? (
                        <img src={pos.logoUri} alt="" className="w-8 h-8" />
                      ) : (
                        <TrendingUp className="w-6 h-6 text-accent" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">{pos.name}</h3>
                      <p className="text-sm text-gray-400 font-body">{pos.protocol?.name || 'Unknown Protocol'}</p>
                    </div>
                  </div>
                  <Badge className="bg-accent/10 text-accent border-accent/20 px-3 py-1 font-bold">
                    {pos.chainId === 1 ? 'Mainnet' : pos.chainId === 137 ? 'Polygon' : pos.chainId === 10 ? 'Optimism' : pos.chainId === 42161 ? 'Arbitrum' : 'Base'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Balance</div>
                    <div className="text-xl font-display font-bold text-white">
                      ${Number(pos.amountUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">APY</div>
                    <div className="text-xl font-display font-bold text-secondary">
                      {(Number(pos.apy) * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-[10px] text-gray-500 font-body uppercase tracking-widest">
                    Asset: {pos.token?.symbol || 'Unknown'}
                  </div>
                  <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 hover:bg-accent/10 px-0 h-auto font-bold" asChild>
                    <a href={`https://explorer.li.fi/address/${address}`} target="_blank" rel="noopener noreferrer">
                      View details <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
