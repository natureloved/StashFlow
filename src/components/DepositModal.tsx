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
import { Goal, useGoalStore } from '@/store/useGoalStore';
import { getQuote } from '@/lib/lifi';
import { useAccount, useSendTransaction, useSwitchChain, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Clock, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTokenPrice } from '@/lib/prices';
import { EducationPopover } from '@/components/EducationPopover';
import { AmountInput } from '@/components/AmountInput';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';


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

interface DepositModalProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepositSuccess?: (prevAmount: number, newAmount: number) => void;
}

export function DepositModal({ goal, open, onOpenChange, onDepositSuccess }: DepositModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { address, chainId } = useAccount();
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

  const { data: balanceData } = useBalance({
    address: address,
    token: selectedToken?.address === 'native' ? undefined : selectedToken?.address as `0x${string}`,
    chainId: chainId,
  });

  const handleMax = () => {
    if (!balanceData) return;
    const formatted = formatUnits(balanceData.value, balanceData.decimals);
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

  // Dynamic Spender: Use approvalAddress from quote if available
  const spenderAddress = quote?.estimate?.approvalAddress || quote?.transactionRequest?.to;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken?.address === 'native' ? undefined : selectedToken?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, spenderAddress as `0x${string}`],
    query: {
      enabled: !!address && !!selectedToken && selectedToken.address !== 'native' && !!spenderAddress,
    }
  });

  const needsApproval = selectedToken?.address !== 'native' && quote && allowance !== undefined && allowance < fromAmountSmallest;
  const [isApproving, setIsApproving] = useState(false);
  const [pendingApprovalHash, setPendingApprovalHash] = useState<`0x${string}` | undefined>(undefined);

  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: pendingApprovalHash,
  });

  useEffect(() => {
    if (chainId && COMMON_TOKENS[chainId]) {
      setSelectedToken(COMMON_TOKENS[chainId].find(t => t.symbol === 'USDC') || COMMON_TOKENS[chainId][0]);
    }
  }, [chainId, open]);

  useEffect(() => {
    async function updatePrice() {
      if (selectedToken && chainId) {
        const p = await getTokenPrice(chainId, selectedToken.address);
        setTokenPrice(p);
      }
    }
    updatePrice();
  }, [selectedToken, chainId]);

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
        isEarn: true, // Use LI.FI Earn/Composer specialized endpoint
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
  
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

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
      setError('Transaction failed on-chain.');
      setPendingTxHash(undefined);
      setIsDepositing(false);
    }
  }, [isConfirmed, isTxError, pendingTxHash]);

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

      setPendingTxHash(tx);
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

  const gasFees = quote?.estimate?.gasCosts?.reduce((acc: number, c: any) => acc + Number(c.amountUSD || 0), 0) || 0;
  const bridgeFees = quote?.estimate?.feeCosts?.reduce((acc: number, c: any) => acc + Number(c.amountUSD || 0), 0) || 0;
  const totalFees = gasFees + bridgeFees;
  const depositVal = isUsdMode ? Number(amount) : Number(amount) * tokenPrice;
  const landsInVault = Math.max(0, depositVal - totalFees);

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className={cn(
        "max-w-[calc(100%-3rem)] sm:max-w-[440px] p-0 overflow-hidden transition-colors duration-500",
        isDark ? "bg-surface border-border text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
      )}>
        <div className="max-h-[85vh] overflow-y-auto w-full thin-scrollbar pb-6">
          <div className="p-4 md:p-6 pb-0">
          <DialogHeader className="mb-6">
            <DialogTitle className={cn("font-display text-2xl", !isDark && "text-slate-900")}>Add Funds</DialogTitle>
            <DialogDescription className={isDark ? "text-gray-400" : "text-slate-500"}>
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
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <AmountInput
                    value={amount}
                    onChange={setAmount}
                    onMax={handleMax}
                    placeholder="0.00"
                  />
                </div>
                  
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <Button 
                  disabled={!amount || isFetchingQuote || !address}
                  onClick={() => fetchQuote()} 
                  className={cn(
                    "w-full h-14 font-bold text-lg rounded-xl transition-all",
                    isDark ? "bg-accent text-black hover:bg-accent/90 glow-cyan" : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
                  )}
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
                <div className={cn(
                  "rounded-2xl border overflow-hidden transition-all",
                  isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-200 shadow-inner"
                )}>
                  <div className={cn(
                    "p-4 border-b flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-all",
                    isDark ? "border-border bg-surface/30 text-gray-400" : "border-slate-200 bg-white text-slate-500"
                  )}>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Deposit Route via LI.FI
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {countdown}s
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total fees</span>
                      <span className="text-red-500">~${totalFees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm">
                      <span>Ends in vault</span>
                      <span className="text-accent">${landsInVault.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group p-2">
                    <input 
                      type="checkbox" 
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="w-5 h-5 rounded border-border bg-surface text-accent"
                    />
                    <span className="text-sm text-gray-300">I understand the fees & risks</span>
                  </label>

                  {needsApproval ? (
                    <Button 
                      disabled={isApproving || isConfirmingApproval}
                      onClick={async () => {
                        setIsApproving(true);
                        try {
                          const hash = await approveAsync({
                            address: selectedToken.address as `0x${string}`,
                            abi: ERC20_ABI,
                            functionName: 'approve',
                            args: [spenderAddress as `0x${string}`, fromAmountSmallest],
                          });
                          setPendingApprovalHash(hash);
                        } catch (err: any) {
                          setError(err.message || 'Approval failed');
                        } finally {
                          setIsApproving(false);
                        }
                      }}
                      className="w-full h-14 bg-white text-black font-bold rounded-xl"
                    >
                      {isConfirmingApproval ? <Loader2 className="animate-spin mr-2" /> : `Approve ${selectedToken.symbol}`}
                    </Button>
                  ) : (
                    <Button 
                      disabled={isDepositing || isConfirming || !isAgreed}
                      onClick={handleDeposit}
                      className="w-full h-14 bg-accent text-black font-bold rounded-xl glow-cyan"
                    >
                      {isConfirming ? <Loader2 className="animate-spin mr-2" /> : 'Confirm & Deposit'}
                    </Button>
                  )}
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
                <CheckCircle2 className="w-16 h-16 text-accent mb-4" />
                <h3 className="text-2xl font-bold mb-2">Success!</h3>
                <p className="text-gray-400 mb-8">${depositVal.toFixed(2)} deposited into {goal.name}.</p>
                <Button onClick={() => onOpenChange(false)} className="w-full">Back to Dashboard</Button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TokenChip({ token, chainId, isSelected, onClick, isDark }: { token: any, chainId: number, isSelected: boolean, onClick: () => void, isDark: boolean }) {
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
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all flex-shrink-0",
        isSelected 
          ? 'border-accent bg-accent/10 glow-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]' 
          : (isDark ? 'border-border bg-surface/50 hover:border-accent/50' : 'border-slate-200 bg-white hover:border-slate-300'),
        !hasBalance ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'
      )}
    >
      <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
        {token.symbol[0]}
      </div>
      <div className="text-left">
        <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>{token.symbol}</div>
        <div className="text-[9px] text-gray-500">
          {balance ? `${Number(balance.formatted).toFixed(4)}` : '0.00'}
        </div>
      </div>
    </button>
  );
}
