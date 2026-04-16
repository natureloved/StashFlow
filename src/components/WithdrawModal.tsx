'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Goal, useGoalStore } from '@/store/useGoalStore';
import { getQuote } from '@/lib/lifi';
import { useAccount, useSendTransaction, useSwitchChain, useBalance, useWaitForTransactionReceipt, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Clock, Wallet, ChevronUp, ChevronDown, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTokenPrice } from '@/lib/prices';
import { AmountInput } from '@/components/AmountInput';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';

const LIFI_DIAMOND_ADDRESS = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

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
  10: [
    { symbol: 'ETH', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
  ],
  137: [
    { symbol: 'MATIC', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
  ],
};

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

interface WithdrawModalProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalanceUsd: number;
  livePosition?: any;
}

const MIN_WITHDRAWAL_USD = 1;

export function WithdrawModal({ goal, open, onOpenChange, currentBalanceUsd, livePosition }: WithdrawModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const availableBalance = livePosition ? Number(livePosition.balanceUsd) : currentBalanceUsd;
  const { address, chainId } = useAccount();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [isUsdMode, setIsUsdMode] = useState(true);
  
  const [quote, setQuote] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tracks that approval was completed this session — avoids race condition where
  // clearing pendingApprovalHash makes isApprovalConfirmed go false before allowance refetches
  const approvedThisSessionRef = useRef(false);

  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const addContribution = useGoalStore((state) => state.addContribution);

  const [pendingWithdrawHash, setPendingWithdrawHash] = useState<`0x${string}` | undefined>(undefined);

  // Wait for on-chain confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: pendingWithdrawHash,
  });

  const [isApproving, setIsApproving] = useState(false);
  const [pendingApprovalHash, setPendingApprovalHash] = useState<`0x${string}` | undefined>(undefined);

  // Wait for on-chain confirmation of Approval
  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: pendingApprovalHash,
  });

  // Allowance Check for LiFi Diamond or Dynamic Spender from Quote
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: goal?.vault.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, (quote?.transactionRequest?.to || LIFI_DIAMOND_ADDRESS) as `0x${string}`],
    chainId: goal?.vault.chainId,
    query: {
      enabled: !!address && !!goal,
      refetchInterval: isApproving || isConfirmingApproval ? 2000 : undefined, // Poll during approval
    }
  });

  // Handle successful approval confirmation
  useEffect(() => {
    if (isApprovalConfirmed && pendingApprovalHash) {
      approvedThisSessionRef.current = true;
      refetchAllowance();
      setPendingApprovalHash(undefined);
    }
  }, [isApprovalConfirmed, pendingApprovalHash, refetchAllowance]);

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
      // Step 0: Check Allowance for LiFi Diamond if not already done
      const vaultDecimals = (goal.vault as any).decimals || goal.vault.underlyingTokens?.[0]?.decimals || 18;
      const amountRaw = Number(amount) || 0;
      
      let fromAmountSmallest: string;
      const totalUsd = livePosition ? Number(livePosition.balanceUsd) : 0;
      const nativeBalance = livePosition ? Number(livePosition.balanceNative ?? 0) : 0;
      const tokenDecimals = livePosition?.asset?.decimals ?? vaultDecimals;

      if (amountRaw < MIN_WITHDRAWAL_USD && amountRaw < totalUsd) {
        setError(`LI.FI quotes are not reliable for withdrawals smaller than $${MIN_WITHDRAWAL_USD}. Try a larger amount or withdraw the full balance if your total position is under $${MIN_WITHDRAWAL_USD}.`);
        setIsFetchingQuote(false);
        return;
      }

      if (livePosition && totalUsd > 0) {
        if (livePosition.amount) {
          const totalShares = BigInt(livePosition.amount.toString());
          const requestedUsdScaled = BigInt(Math.floor(amountRaw * 1000000));
          const totalUsdScaled = BigInt(Math.floor(totalUsd * 1000000));
          fromAmountSmallest = ((totalShares * requestedUsdScaled) / totalUsdScaled).toString();
        } else if (nativeBalance > 0) {
          const shareAmount = (amountRaw / totalUsd) * nativeBalance;
          fromAmountSmallest = parseUnits(shareAmount.toFixed(tokenDecimals), tokenDecimals).toString();
        } else {
          setError('Live vault position data is unavailable. Please refresh your portfolio and try again.');
          setIsFetchingQuote(false);
          return;
        }
      } else {
        setError('Live vault position data is unavailable. Please refresh your portfolio and try again.');
        setIsFetchingQuote(false);
        return;
      }

      // If allowance is insufficient and we haven't approved this session, prompt approval
      if (allowance !== undefined && allowance < BigInt(fromAmountSmallest) && !approvedThisSessionRef.current) {
        setStep(1.5);
        setIsFetchingQuote(false);
        return;
      }

      // Calculate amount in vault token units
      const response = await getQuote({
        fromChain: goal.vault.chainId,
        toChain: chainId,
        fromToken: goal.vault.address,
        toToken: selectedToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : selectedToken.address,
        fromAddress: address,
        toAddress: address,
        fromAmount: fromAmountSmallest,
        skipSimulation: true, // IMPORTANT: Avoid simulation errors before approval
      });
      
      setQuote(response);
      setStep(2);
    } catch (err: any) {
      let msg = err.message || 'Failed to fetch withdrawal route';
      if (msg.toLowerCase().includes('no route') || msg.toLowerCase().includes('no available quotes')) {
        msg = `No available quotes. For tiny amounts like $${amount}, liquidity providers might not have profitable routes due to gas fees. (Min ~$1 recommended)`;
      }
      setError(msg);
    } finally {
      setIsFetchingQuote(false);
    }
  };

  // Handle confirmation success
  useEffect(() => {
    if (isConfirmed && pendingWithdrawHash && goal) {
      // Record negative contribution to reduce balance
      addContribution(goal.id, {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amountUsd: -Number(amount), // Negative to subtract
        txHash: pendingWithdrawHash,
        fromChain: goal.vault.chainId,
        fromToken: 'Vault',
      });
      
      setPendingWithdrawHash(undefined);
      setStep(3);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    }
    if (isTxError && pendingWithdrawHash) {
      setError('Withdrawal failed on-chain. Your funds were not moved.');
      setPendingWithdrawHash(undefined);
      setIsWithdrawing(false);
    }
  }, [isConfirmed, isTxError, pendingWithdrawHash, goal, amount, addContribution]);

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

      setPendingWithdrawHash(tx);
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      if (err.message?.includes('TRANSFER_FROM_FAILED') || err.message?.includes('Simulation failed')) {
        setError('Approval required or simulation failed. Please approve vault access and try again.');
        setStep(1.5); // Redirect to approval step
      } else {
        setError(err.message || 'Withdrawal failed');
      }
      setIsWithdrawing(false);
    }
  };

  const reset = () => {
    setStep(1);
    setAmount('');
    setQuote(null);
    setError(null);
    approvedThisSessionRef.current = false;
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className={cn(
        "max-w-[calc(100%-3rem)] sm:max-w-[440px] p-0 overflow-hidden !pr-10 transition-colors duration-500",
        isDark ? "bg-surface border-border text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
      )}>
        <div className="max-h-[85vh] overflow-y-auto w-full thin-scrollbar pb-6">
          <div className="p-4 md:p-6 pb-0">
          <DialogHeader className="mb-6">
            <DialogTitle className={cn("font-display text-2xl", !isDark && "text-slate-900")}>Withdraw Funds</DialogTitle>
            <DialogDescription className={isDark ? "text-gray-400" : "text-slate-500"}>
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
                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Available to Withdraw</div>
                  <div className="text-2xl font-display font-bold text-accent">${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  {livePosition && Math.abs(availableBalance - currentBalanceUsd) > 0.01 && (
                    <div className="text-[10px] text-gray-500 mt-1">Includes ${(availableBalance - currentBalanceUsd).toFixed(2)} in earned yield</div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Amount to Withdraw (USD)</label>
                    <div className="space-y-4">
                      <AmountInput
                        value={amount}
                        onChange={setAmount}
                        onMax={() => setAmount(availableBalance.toFixed(2))}
                        placeholder="0.00"
                      />
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
                        Withdraw in USD
                      </div>
                    </div>
                    {amount && Number(amount) > 0 && Number(amount) < MIN_WITHDRAWAL_USD && Number(amount) < availableBalance && (
                      <p className="text-xs text-amber-300 mt-2">
                        LI.FI quotes often fail for withdrawals smaller than ${MIN_WITHDRAWAL_USD}. Enter at least ${MIN_WITHDRAWAL_USD} or withdraw the full balance if your position is under ${MIN_WITHDRAWAL_USD}.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Receive As</label>
                    {chainId && !COMMON_TOKENS[chainId] ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-500 text-xs">
                        Switch your wallet to Ethereum, Base, Arbitrum, Optimism, or Polygon to receive funds.
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {chainId && COMMON_TOKENS[chainId]?.map((token) => (
                          <button
                            key={token.symbol}
                            onClick={() => setSelectedToken(token)}
                            className={cn(
                              "px-4 py-2 rounded-xl border transition-all",
                              selectedToken?.symbol === token.symbol
                                ? 'border-accent bg-accent/10'
                                : (isDark ? 'border-border bg-surface hover:border-accent/50' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm')
                            )}
                          >
                            <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{token.symbol}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <Button
                  disabled={!amount || Number(amount) <= 0 || Number(amount) > availableBalance || isFetchingQuote || !selectedToken}
                  onClick={fetchWithdrawQuote}
                  className={cn(
                    "w-full h-11 font-bold text-sm rounded-xl transition-all",
                    isDark ? "bg-white text-black hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  {isFetchingQuote ? <Loader2 className="animate-spin" /> : 'Review Withdrawal'}
                </Button>
              </motion.div>
            )}

            {step === 1.5 && (
              <motion.div
                key="step1.5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className={cn(
                  "p-6 rounded-2xl border transition-all space-y-4",
                  isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      isApprovalConfirmed ? "bg-green-500 text-white" : "bg-[#00E5FF] text-black"
                    )}>
                      {isApprovalConfirmed ? "✓" : "1"}
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", !isDark && "text-slate-900")}>Step 1: Approve vault access</p>
                      <p className="text-[10px] text-gray-500">
                        {isApprovalConfirmed ? "Success! Vault access granted." : "Approving vault access... please confirm in your wallet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-gray-500">2</div>
                    <div>
                      <p className={cn("text-sm font-bold", !isDark && "text-slate-900")}>Step 2: Execute withdrawal</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                    <Button 
                      disabled={isApproving || isConfirmingApproval || isApprovalConfirmed}
                      onClick={async () => {
                        if (goal.vault.chainId !== chainId) {
                          try {
                            await switchChainAsync({ chainId: goal.vault.chainId });
                          } catch (err) {
                            return;
                          }
                        }
                        setIsApproving(true);
                        setError(null);
                        try {
                          const spender = quote?.transactionRequest?.to || LIFI_DIAMOND_ADDRESS;
                          const hash = await approveAsync({
                            address: goal.vault.address as `0x${string}`,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [spender, BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")],
                          });
                          setPendingApprovalHash(hash);
                        } catch (err: any) {
                          setError(err.message || 'Approval failed');
                        } finally {
                          setIsApproving(false);
                        }
                      }}
                      className="w-full h-14 bg-accent text-black hover:bg-accent/90 font-bold text-lg rounded-xl glow-cyan"
                    >
                  {isApproving ? <Loader2 className="animate-spin mr-2" /> : isConfirmingApproval ? <Loader2 className="animate-spin mr-2" /> : isApprovalConfirmed ? "Proceeding to Quote..." : "Approve Vault"}
                </Button>

                {isApprovalConfirmed && (
                  <Button 
                    onClick={() => fetchWithdrawQuote()}
                    className={cn(
                      "w-full h-11 font-bold text-sm rounded-xl transition-all",
                      isDark ? "bg-white text-black hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                    )}
                  >
                    Continue to Step 2
                  </Button>
                )}
              </motion.div>
            )}

            {step === 2 && quote && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className={cn(
                  "rounded-2xl border p-6 space-y-4 transition-all",
                  isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-200"
                )}>
                  <div className={cn("flex justify-between items-center pb-4 border-b transition-all", isDark ? "border-border" : "border-slate-200")}>
                    <span className="text-gray-400 text-sm">Withdraw Amount</span>
                    <span className={cn("font-bold", !isDark && "text-slate-900")}>${amount}</span>
                  </div>
                  <div className={cn("flex justify-between items-center pb-4 border-b transition-all", isDark ? "border-border" : "border-slate-200")}>
                    <span className="text-gray-400 text-sm">Estimated Receive</span>
                    <span className="text-accent font-bold">
                      {(Number(quote.estimate.toAmountMin || 0) / Math.pow(10, selectedToken.decimals)).toFixed(selectedToken.decimals === 18 ? 6 : 2)} {selectedToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Network Fees</span>
                    <span className="text-red-400">~${Number(quote.estimate.gasCosts?.[0]?.amountUSD || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2 text-amber-500 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Withdrawals can take up to 2-3 minutes depending on network congestion.</p>
                </div>

                <div className="space-y-3">
                  {quote && allowance !== undefined && allowance < BigInt(quote.estimate.fromAmount || 0) ? (
                    <Button 
                      disabled={isApproving || isConfirmingApproval}
                      onClick={async () => {
                        if (goal.vault.chainId !== chainId) {
                          try {
                            await switchChainAsync({ chainId: goal.vault.chainId });
                          } catch (err) {
                            return;
                          }
                        }
                        setIsApproving(true);
                        setError(null);
                        try {
                          const hash = await approveAsync({
                            address: goal.vault.address as `0x${string}`,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [quote.transactionRequest.to as `0x${string}`, BigInt(quote.estimate.fromAmount)],
                          });
                          setPendingApprovalHash(hash);
                        } catch (err: any) {
                          setError(err.message || 'Approval failed');
                        } finally {
                          setIsApproving(false);
                        }
                      }}
                      className={cn(
                        "w-full h-14 font-bold text-lg rounded-xl transition-all",
                        isDark ? "bg-white text-black hover:bg-white/90 glow-cyan" : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
                      )}
                    >
                      {isApproving && !pendingApprovalHash ? (
                        <><Loader2 className="animate-spin mr-2" /> Submitting...</>
                      ) : isConfirmingApproval ? (
                        <><Loader2 className="animate-spin mr-2" /> Confirming...</>
                      ) : goal.vault.chainId !== chainId ? (
                        `Switch to ${getChainName(goal.vault.chainId)}`
                      ) : `Approve Withdrawal`}
                    </Button>
                  ) : (
                    <Button 
                      disabled={isWithdrawing || isConfirming}
                      onClick={async () => {
                        if (quote.transactionRequest.chainId !== chainId) {
                          try {
                            await switchChainAsync({ chainId: quote.transactionRequest.chainId });
                          } catch (err) {
                            return;
                          }
                        }
                        handleWithdraw();
                      }}
                      className={cn(
                        "w-full h-14 font-bold text-lg rounded-xl transition-all",
                        isDark ? "bg-accent text-black hover:bg-accent/90 glow-cyan" : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
                      )}
                    >
                      {isWithdrawing ? (
                        <><Loader2 className="animate-spin mr-2" /> Submitting...</>
                      ) : isConfirming ? (
                        <><Loader2 className="animate-spin mr-2" /> Confirming...</>
                      ) : quote.transactionRequest.chainId !== chainId ? (
                        `Switch to ${getChainName(quote.transactionRequest.chainId)}`
                      ) : 'Confirm Withdrawal'}
                    </Button>
                  )}
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
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all",
                  isDark ? "bg-accent/20" : "bg-accent/10"
                )}>
                  <CheckCircle2 className="w-10 h-10 text-accent" />
                </div>
                <h3 className={cn("font-display text-3xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Withdrawal Sent!</h3>
                <p className={cn("mb-8 font-body transition-all", isDark ? "text-gray-400" : "text-slate-500")}>
                  Your funds are on the way. It may take a few minutes to arrive in your wallet.
                </p>
                <Button onClick={() => onOpenChange(false)} className={cn(
                  "w-full h-12 border rounded-xl transition-all",
                  isDark ? "bg-surface border-border text-white" : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-md"
                )}>
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
