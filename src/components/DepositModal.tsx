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
import { Loader2, ArrowDown, CheckCircle2, AlertCircle, Info, RefreshCw, Clock, Check, ChevronUp, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTokenPrice } from '@/lib/prices';
import { EducationPopover } from '@/components/EducationPopover';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

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
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  ],
  8453: [
    { symbol: 'ETH', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  ],
  42161: [
    { symbol: 'ETH', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
  ],
  10: [
    { symbol: 'ETH', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
  ],
};

interface DepositModalProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepositSuccess?: (prevAmount: number, newAmount: number) => void;
}

export function DepositModal({ goal, open, onOpenChange, onDepositSuccess }: DepositModalProps) {
  const { address, chainId, isConnected } = useAccount();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [isUsdMode, setIsUsdMode] = useState(true);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [tokenPrice, setTokenPrice] = useState(0);
  
  const [quote, setQuote] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState(30);
  const [isAgreed, setIsAgreed] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const addContribution = useGoalStore((state) => state.addContribution);

  // Fetch balance for the selected token
  const { data: balanceData } = useBalance({
    address: address,
    token: selectedToken?.address === 'native' ? undefined : selectedToken?.address as `0x${string}`,
    chainId: chainId,
  });

  const handleMax = () => {
    if (!balanceData) return;
    const formatted = formatUnits(balanceData.value, balanceData.decimals);
    // If in USD mode, we need to convert the token balance to USD
    if (isUsdMode && tokenPrice) {
      setAmount((Number(formatted) * tokenPrice).toFixed(2));
    } else {
      setAmount(formatted);
    }
  };

  const rawAmount = (amount && tokenPrice && tokenPrice > 0)
    ? (isUsdMode ? (Number(amount) / tokenPrice) : Number(amount))
    : 0;
  
  const safeAmountStr = (rawAmount && !Number.isNaN(rawAmount) && Number.isFinite(rawAmount))
    ? rawAmount.toFixed(selectedToken?.decimals || 18)
    : '0';

  const fromAmountSmallest = selectedToken 
    ? parseUnits(safeAmountStr, selectedToken.decimals) 
    : BigInt(0);

  // Allowance Check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken?.address === 'native' ? undefined : selectedToken?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, quote?.transactionRequest?.to as `0x${string}`],
    query: {
      enabled: !!address && !!selectedToken && selectedToken.address !== 'native' && !!quote?.transactionRequest?.to,
    }
  });

  const needsApproval = selectedToken?.address !== 'native' && quote && allowance !== undefined && allowance < fromAmountSmallest;
  const [isApproving, setIsApproving] = useState(false);
  const [pendingApprovalHash, setPendingApprovalHash] = useState<`0x${string}` | undefined>(undefined);

  // Wait for on-chain confirmation of Approval
  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: pendingApprovalHash,
  });

  // Default selection
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

  // Quote Timer
  useEffect(() => {
    if (step === 2 && open) {
      setCountdown(30);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            refreshQuote();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, open]);

  const refreshQuote = async () => {
    if (step === 2) {
      await fetchQuote(true);
    }
  };

  const fetchQuote = async (isSilent = false) => {
    if (!goal || !amount || !address || !selectedToken || !chainId) return;
    
    if (!isSilent) setIsFetchingQuote(true);
    setError(null);
    try {
      const fromAmountRaw = isUsdMode ? (Number(amount) / tokenPrice) : Number(amount);
      const amountStr = fromAmountRaw.toFixed(selectedToken.decimals);
      const fromAmountSmallestStr = parseUnits(amountStr, selectedToken.decimals).toString();

      const response = await getQuote({
        fromChain: chainId,
        toChain: goal.vault.chainId,
        fromToken: selectedToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : selectedToken.address,
        toToken: goal.vault.address,
        fromAddress: address,
        toAddress: address,
        fromAmount: fromAmountSmallestStr,
      });
      
      setQuote(response);
      setStep(2);
      setCountdown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deposit route');
    } finally {
      if (!isSilent) setIsFetchingQuote(false);
    }
  };

  const [pendingTxHash, setPendingTxHash] = React.useState<`0x${string}` | undefined>(undefined);
  
  // Wait for on-chain confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  // Record contribution only after tx is confirmed
  React.useEffect(() => {
    if (isConfirmed && pendingTxHash && goal) {
      const depositAmountUsd = isUsdMode ? Number(amount) : Number(amount) * tokenPrice;
      const prevTotal = goal.contributions.reduce((acc, c) => acc + c.amountUsd, 0);
      addContribution(goal.id, {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amountUsd: depositAmountUsd,
        txHash: pendingTxHash,
        fromChain: chainId as number,
        fromToken: selectedToken.symbol,
      });
      setPendingTxHash(undefined);
      setStep(3);
      triggerConfetti();
      onDepositSuccess?.(prevTotal, prevTotal + depositAmountUsd);
    }
    if (isTxError && pendingTxHash) {
      setError('Transaction failed on-chain. Your funds were not moved.');
      setPendingTxHash(undefined);
      setIsDepositing(false);
    }
  }, [isConfirmed, isTxError, pendingTxHash]);

  // Handle successful approval confirmation
  React.useEffect(() => {
    if (isApprovalConfirmed && pendingApprovalHash) {
      refetchAllowance();
      setPendingApprovalHash(undefined);
    }
  }, [isApprovalConfirmed, pendingApprovalHash, refetchAllowance]);

  const handleDeposit = async () => {
    if (!quote || !goal || !isAgreed) return;

    setIsDepositing(true);
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

      // Do NOT record yet — wait for useWaitForTransactionReceipt to confirm
      setPendingTxHash(tx);
      // isDepositing stays true while confirming
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setIsDepositing(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00E5FF', '#FFB800', '#FFFFFF']
    });
  };

  const reset = () => {
    setStep(1);
    setAmount('');
    setQuote(null);
    setError(null);
    setIsAgreed(false);
  };

  if (!goal) return null;

  // Fee Calculation
  const gasFees = quote?.estimate?.gasCosts?.reduce((acc: number, c: any) => acc + Number(c.amountUSD || 0), 0) || 0;
  const bridgeFees = quote?.estimate?.feeCosts?.reduce((acc: number, c: any) => acc + Number(c.amountUSD || 0), 0) || 0;
  const totalFees = gasFees + bridgeFees;
  const depositVal = isUsdMode ? Number(amount) : Number(amount) * tokenPrice;
  const landsInVault = Math.max(0, depositVal - totalFees);
  const isHighFee = depositVal > 0 && (totalFees / depositVal) > 0.05;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-[440px] bg-surface border-border text-white p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto w-full thin-scrollbar pb-6">
          <div className="p-4 md:p-6 pb-0">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-display text-2xl">Add Funds</DialogTitle>
            <DialogDescription className="text-gray-400">
              {goal.name} • Target ${goal.targetAmountUsd.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Token Selection */}
                <div className="space-y-3">
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Select Asset</div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {chainId && COMMON_TOKENS[chainId]?.map((token) => (
                      <TokenChip 
                        key={token.symbol} 
                        token={token} 
                        chainId={chainId}
                        isSelected={selectedToken?.symbol === token.symbol}
                        onClick={() => setSelectedToken(token)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-4xl h-24 bg-[#0A0A0F] border-border text-center font-display font-bold focus-visible:ring-accent pr-28"
                    />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button 
                          onClick={handleMax}
                          className="font-bold text-accent bg-accent/10 py-1.5 px-2.5 rounded-lg text-[10px] hover:bg-accent/20 transition-all"
                        >
                          MAX
                        </button>
                        <button 
                          onClick={() => {
                            const current = Number(amount) || 0;
                            setAmount((current + 1).toString());
                          }}
                          className="flex flex-col items-center justify-center p-1 hover:bg-white/5 rounded-lg transition-colors group"
                          title="Increase amount"
                        >
                           <ChevronUp className="w-3 h-3 text-gray-500 group-hover:text-white" />
                        </button>
                        <button 
                          onClick={() => {
                            const current = Number(amount) || 0;
                            if (current > 0) setAmount(Math.max(0, current - 1).toString());
                          }}
                          className="flex flex-col items-center justify-center p-1 hover:bg-white/5 rounded-lg transition-colors group"
                          title="Decrease amount"
                        >
                           <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-white" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                       {isUsdMode ? 'Deposit in USD' : `Deposit in ${selectedToken?.symbol || 'Asset'}`}
                    </div>
                    {amount && tokenPrice > 0 && (
                      <p className="text-center text-xs text-gray-500 font-body">
                        ≈ {isUsdMode ? `${(Number(amount) / tokenPrice).toFixed(6)} ${selectedToken?.symbol}` : `$${(Number(amount) * tokenPrice).toFixed(2)}`}
                      </p>
                    )}
                  </div>
                  
                  {selectedToken && (
                    <div className="bg-accent/5 border border-accent/20 p-3 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        {selectedToken.address.toLowerCase() === goal.vault.underlyingTokens[0].address.toLowerCase() ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-xs">
                        {selectedToken.address.toLowerCase() === goal.vault.underlyingTokens[0].address.toLowerCase() ? (
                          <span className="text-green-400 font-bold">Direct deposit — no swap needed ✓</span>
                        ) : (
                          <span className="text-accent">We'll swap your <span className="font-bold">{selectedToken.symbol}</span> → <span className="font-bold">{goal.vault.underlyingTokens[0].symbol}</span> automatically ⚡</span>
                        )}
                      </div>
                    </div>
                  )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <Button 
                  disabled={!amount || isFetchingQuote || !address}
                  onClick={() => fetchQuote()} 
                  className="w-full h-14 bg-accent text-black hover:bg-accent/90 font-bold text-lg rounded-xl glow-cyan"
                >
                  {isFetchingQuote ? <Loader2 className="animate-spin" /> : 'Review Route'}
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
                <div className="bg-[#0A0A0F] rounded-2xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border bg-surface/30 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Your Deposit Route
                    </div>
                    <div className={`flex items-center gap-1 ${countdown < 10 ? 'text-amber-500 animate-pulse' : ''}`}>
                      <Clock className="w-3 h-3" /> Valid for: {countdown}s
                    </div>
                  </div>
                  <div className="p-6 space-y-6 relative">
                    {/* Route visualization */}
                    <div className="flex flex-col gap-8 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold">1</div>
                        <div>
                          <p className="text-sm font-bold">Sell {amount} {isUsdMode ? 'USD' : selectedToken.symbol}</p>
                          <p className="text-[10px] text-gray-500">on {selectedToken.symbol === 'ETH' ? 'Ethereum' : 'Chain'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold">2</div>
                        <div>
                          <EducationPopover id="crosschain" term="Cross-chain deposit">
                            Your tokens are on one blockchain, but the vault is on another. LI.FI automatically moves and converts your funds in a single transaction — you just sign once.
                          </EducationPopover>
                          <p className="text-[10px] text-gray-500">Estimated time: {quote.estimate?.executionDuration || 45}s</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(0,229,255,0.5)]">3</div>
                        <div>
                          <p className="text-sm font-bold">Deposit into {goal.vault.name}</p>
                          <p className="text-[10px] text-gray-500">on {goal.vault.network}</p>
                        </div>
                      </div>
                    </div>
                    {/* Connector line - Dynamically centered */}
                    <div className="absolute left-[39px] top-[40px] bottom-[40px] w-[2px] bg-gradient-to-b from-border via-accent/30 to-accent z-0" />
                  </div>
                  
                  {/* Fee Breakdown */}
                  <div className="p-4 bg-surface/30 border-t border-l-[3px] border-[#FFB800] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">💸 Total Cost Breakdown</span>
                      {isFetchingQuote && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
                    </div>
                    
                    <div className="space-y-2 text-xs">
                       <div className="flex justify-between text-[#888]">
                         <span>Network gas fees</span>
                         <span>~${gasFees.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-[#888]">
                         <span>Bridge fee</span>
                         <span>~${bridgeFees.toFixed(2)}</span>
                       </div>
                       <div className="h-[1px] bg-border my-1" />
                       <div className="flex justify-between text-[#888]">
                         <span>Total fees</span>
                         <span>~${totalFees.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between mt-4">
                         <span className="text-gray-400">You deposit</span>
                         <span className="text-white">${depositVal.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-400">Fees</span>
                         <span className="text-red-500">-${totalFees.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between font-bold text-sm pt-1">
                         <span className="text-white">Lands in vault</span>
                         <span className="text-white">${landsInVault.toFixed(2)}</span>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-2">
                       <Clock className="w-3 h-3" /> Estimated time: ~{quote.estimate?.executionDuration || 45} seconds
                    </div>
                  </div>
                </div>

                {isHighFee && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2 text-amber-500 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Fees are high relative to your deposit amount.</p>
                      <p>Consider depositing a larger amount to optimize efficiency.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded-lg transition-all">
                    <input 
                      type="checkbox" 
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="w-5 h-5 rounded border-border bg-surface text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-body text-gray-300 group-hover:text-white">I understand the fees above and want to proceed</span>
                  </label>

                  {needsApproval ? (
                    <Button 
                      disabled={isApproving || isConfirmingApproval}
                      onClick={async () => {
                        setIsApproving(true);
                        setError(null);
                        try {
                          const hash = await approveAsync({
                            address: selectedToken.address as `0x${string}`,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [quote.transactionRequest.to as `0x${string}`, fromAmountSmallest],
                          });
                          setPendingApprovalHash(hash);
                        } catch (err: any) {
                          setError(err.message || 'Approval failed');
                        } finally {
                          setIsApproving(false);
                        }
                      }}
                      className="w-full h-14 bg-white text-black hover:bg-white/90 font-bold text-lg rounded-xl glow-cyan"
                    >
                      {isApproving && !pendingApprovalHash ? (
                        <><Loader2 className="animate-spin mr-2" /> Submitting...</>
                      ) : isConfirmingApproval ? (
                        <><Loader2 className="animate-spin mr-2" /> Confirming...</>
                      ) : `Approve ${selectedToken.symbol}`}
                    </Button>
                  ) : (
                    <Button 
                      disabled={isDepositing || isConfirming || !isAgreed}
                      onClick={handleDeposit}
                      className="w-full h-14 bg-accent text-black hover:bg-accent/90 font-bold text-lg rounded-xl glow-cyan"
                    >
                      {isDepositing && !pendingTxHash ? (
                        <><Loader2 className="animate-spin mr-2" /> Submitting...</>
                      ) : isConfirming ? (
                        <><Loader2 className="animate-spin mr-2" /> Confirming on-chain...</>
                      ) : 'Confirm & Deposit'}
                    </Button>
                  )}
                  
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={() => refreshQuote()}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh quote
                    </button>
                    <Button variant="ghost" className="text-gray-500 text-xs" onClick={() => setStep(1)}>
                      Go Back
                    </Button>
                  </div>
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
                <h3 className="font-display text-3xl font-bold mb-2 text-white">Success!</h3>
                <p className="text-gray-400 mb-8 font-body leading-relaxed">
                  ${depositVal.toFixed(2)} deposited! Your <span className="text-white font-bold">{goal.name}</span> goal is now better funded.
                </p>
                <Button onClick={() => onOpenChange(false)} className="w-full h-12 bg-surface border-border text-white hover:bg-surface/80 rounded-xl">
                  Back to Dashboard
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

function TokenChip({ token, chainId, isSelected, onClick }: { token: any, chainId: number, isSelected: boolean, onClick: () => void }) {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address: address,
    token: token.address === 'native' ? undefined : token.address as `0x${string}`,
    chainId: chainId,
  });

  const hasBalance = balance && Number(balance.formatted) > 0;

  return (
    <button
      onClick={hasBalance ? onClick : undefined}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl border transition-all flex-shrink-0
        ${isSelected ? 'border-accent bg-accent/10 glow-cyan ring-1 ring-accent' : 'border-border bg-surface/50 hover:border-accent/50'}
        ${!hasBalance ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
      `}
    >
      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
        {token.symbol[0]}
      </div>
      <div className="text-left">
        <div className="text-xs font-bold text-white">{token.symbol}</div>
        <div className="text-[10px] text-gray-500 font-body">
          {balance ? `${Number(balance.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : '0.00'}
        </div>
      </div>
    </button>
  );
}
