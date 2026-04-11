'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Goal, useGoalStore } from '@/store/useGoalStore';
import { getQuote } from '@/lib/lifi';
import { useAccount, useSendTransaction, useSwitchChain, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Clock, Wallet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTokenPrice } from '@/lib/prices';

const COMMON_TOKENS: Record<number, any[]> = {
  1: [
    { symbol: 'ETH', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  ],
  8453: [
    { symbol: 'ETH', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  ],
  42161: [
    { symbol: 'ETH', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  ],
};

interface WithdrawModalProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalanceUsd: number;
}

export function WithdrawModal({ goal, open, onOpenChange, currentBalanceUsd }: WithdrawModalProps) {
  const { address, chainId } = useAccount();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [tokenPrice, setTokenPrice] = useState(0);
  
  const [quote, setQuote] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const updateGoal = useGoalStore((state) => state.updateGoal);

  // Default destination token
  useEffect(() => {
    if (chainId && COMMON_TOKENS[chainId]) {
      setSelectedToken(COMMON_TOKENS[chainId].find(t => t.symbol === 'USDC') || COMMON_TOKENS[chainId][0]);
    }
  }, [chainId, open]);

  // Price fetching
  useEffect(() => {
    async function updatePrice() {
      if (selectedToken && chainId) {
        const p = await getTokenPrice(chainId, selectedToken.address);
        setTokenPrice(p);
      }
    }
    updatePrice();
  }, [selectedToken, chainId]);

  const fetchWithdrawQuote = async () => {
    if (!goal || !amount || !address || !selectedToken || !chainId) return;
    
    setIsFetchingQuote(true);
    setError(null);
    try {
      // Calculate amount in vault token units
      // For withdrawal, we use the USD amount to determine how many vault tokens to burn
      // But LI.FI quote needs fromAmount in source token (vault asset)
      const vaultToken = goal.vault.address;
      
      // Simulation: We assume 1 vault token = $1 for the quote target if it's a stable vault
      // In a real app we'd fetch vault token price
      const fromAmountSmallest = parseUnits(amount, 18).toString(); 

      const response = await getQuote({
        fromChain: goal.vault.chainId,
        toChain: chainId,
        fromToken: vaultToken,
        toToken: selectedToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : selectedToken.address,
        fromAddress: address,
        toAddress: address,
        fromAmount: fromAmountSmallest,
      });
      
      setQuote(response);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch withdrawal route');
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const handleWithdraw = async () => {
    if (!quote || !goal) return;

    setIsWithdrawing(true);
    setError(null);
    try {
      if (quote.transactionRequest?.chainId !== chainId) {
        await switchChainAsync({ chainId: quote.transactionRequest.chainId });
      }

      const tx = await sendTransactionAsync({
        to: quote.transactionRequest.to,
        data: quote.transactionRequest.data,
        value: BigInt(quote.transactionRequest.value || 0),
      });

      // Optimistically update local state by adding a negative contribution or updating total
      // Here we'll just show success
      setStep(3);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const reset = () => {
    setStep(1);
    setAmount('');
    setQuote(null);
    setError(null);
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className="max-w-[calc(100%-2.5rem)] sm:max-w-[480px] bg-surface border-border text-white p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto w-full thin-scrollbar pb-6">
          <div className="p-4 md:p-6 pb-0">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-display text-2xl">Withdraw Funds</DialogTitle>
            <DialogDescription className="text-gray-400">
              Remove funds from {goal.name}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="bg-[#0A0A0F] p-4 rounded-xl border border-border">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Available to Withdraw</div>
                  <div className="text-2xl font-display font-bold text-accent">${currentBalanceUsd.toLocaleString()}</div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Amount to Withdraw (USD)</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-4xl h-20 bg-[#0A0A0F] border-border text-center font-display font-bold"
                      />
                      <button 
                        onClick={() => setAmount(currentBalanceUsd.toString())}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-accent hover:underline"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Receive As</label>
                    <div className="flex gap-2">
                      {chainId && COMMON_TOKENS[chainId]?.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => setSelectedToken(token)}
                          className={`px-4 py-2 rounded-xl border transition-all ${selectedToken?.symbol === token.symbol ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/50'}`}
                        >
                          <span className="text-sm font-bold">{token.symbol}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <Button 
                  disabled={!amount || Number(amount) <= 0 || Number(amount) > currentBalanceUsd || isFetchingQuote}
                  onClick={fetchWithdrawQuote} 
                  className="w-full h-14 bg-white text-black hover:bg-white/90 font-bold text-lg rounded-xl"
                >
                  {isFetchingQuote ? <Loader2 className="animate-spin" /> : 'Review Withdrawal'}
                </Button>
              </motion.div>
            )}

            {step === 2 && quote && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-[#0A0A0F] rounded-2xl border border-border p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-gray-400 text-sm">Withdraw Amount</span>
                    <span className="font-bold">${amount}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-gray-400 text-sm">Estimated Receive</span>
                    <span className="text-accent font-bold">
                      {Number(quote.estimate.toAmountMin || 0) / Math.pow(10, selectedToken.decimals)} {selectedToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Network Fees</span>
                    <span className="text-red-400">~${(quote.estimate.gasCosts?.[0]?.amountUSD || 0)}</span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2 text-amber-500 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Withdrawals can take up to 2-3 minutes depending on network congestion.</p>
                </div>

                <div className="space-y-3">
                  <Button 
                    disabled={isWithdrawing}
                    onClick={handleWithdraw}
                    className="w-full h-14 bg-accent text-black hover:bg-accent/90 font-bold text-lg rounded-xl glow-cyan"
                  >
                    {isWithdrawing ? <Loader2 className="animate-spin" /> : 'Confirm Withdrawal'}
                  </Button>
                  <Button variant="ghost" className="w-full text-gray-500" onClick={() => setStep(1)}>
                    Go Back
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-accent" />
                </div>
                <h3 className="font-display text-3xl font-bold mb-2 text-white">Withdrawal Sent!</h3>
                <p className="text-gray-400 mb-8 font-body">
                  Your funds are on the way. It may take a few minutes to arrive in your wallet.
                </p>
                <Button onClick={() => onOpenChange(false)} className="w-full h-12 bg-surface border-border text-white rounded-xl">
                  Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
