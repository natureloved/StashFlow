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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Goal, useGoalStore } from '@/store/useGoalStore';
import { getQuote } from '@/lib/lifi';
import { useAccount, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getTokenPrice } from '@/lib/prices';
import { AmountInput } from '@/components/AmountInput';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';

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
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const ERC4626_ABI = [
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
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
  const onChainUsdBalance = livePosition ? Number(livePosition.balanceUsd || 0) : 0;
  const availableBalance = onChainUsdBalance > 0 ? onChainUsdBalance : currentBalanceUsd;
  const { address, chainId } = useAccount();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [tokenPrice, setTokenPrice] = useState(0);
  
  const [quote, setQuote] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultDeprecated, setVaultDeprecated] = useState(false);
  
  const approvedThisSessionRef = useRef(false);

  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const addContribution = useGoalStore((state) => state.addContribution);

  const [pendingWithdrawHash, setPendingWithdrawHash] = useState<`0x${string}` | undefined>(undefined);

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: pendingWithdrawHash,
  });

  const [isApproving, setIsApproving] = useState(false);
  const [pendingApprovalHash, setPendingApprovalHash] = useState<`0x${string}` | undefined>(undefined);

  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: pendingApprovalHash,
  });

  // Dynamic Spender: Use approvalAddress from quote if available
  const spenderAddress = quote?.estimate?.approvalAddress || quote?.transactionRequest?.to;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: goal?.vault.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, spenderAddress as `0x${string}`],
    chainId: goal?.vault.chainId,
    query: {
      enabled: !!address && !!goal && !!spenderAddress,
      refetchInterval: isApproving || isConfirmingApproval ? 2000 : undefined,
    }
  });

  useEffect(() => {
    if (isApprovalConfirmed && pendingApprovalHash) {
      approvedThisSessionRef.current = true;
      refetchAllowance();
      setPendingApprovalHash(undefined);
    }
  }, [isApprovalConfirmed, pendingApprovalHash, refetchAllowance]);

  useEffect(() => {
    if (open) {
      if (chainId && COMMON_TOKENS[chainId]) {
        setSelectedToken(COMMON_TOKENS[chainId].find(t => t.symbol === 'USDC') || COMMON_TOKENS[chainId][0]);
      } else if (!chainId) {
        setSelectedToken(COMMON_TOKENS[1][1]);
      }
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

  const fetchWithdrawQuote = async () => {
    if (!goal || !amount || !address || !selectedToken || !chainId) return;
    
    // Safety check for LI.FI Earn compatibility
    if (goal.vault.isRedeemable === false) {
      setError('This vault does not currently support automated withdrawals via LI.FI. You may need to withdraw manually via the protocol website.');
      return;
    }

    setIsFetchingQuote(true);
    setError(null);
    try {
      const vaultDecimals = (goal.vault as any).decimals || goal.vault.underlyingTokens?.[0]?.decimals || 18;
      const amountRaw = Number(amount) || 0;
      
      let fromAmountSmallest: string;
      const totalUsd = livePosition ? Number(livePosition.balanceUsd ?? livePosition.amountUsd ?? 0) : 0;
      const tokenDecimals = livePosition?.asset?.decimals ?? livePosition?.token?.decimals ?? vaultDecimals;
      const positionAmount = livePosition?.amount ?? livePosition?.shares ?? livePosition?.shareAmount;

      if (!livePosition || totalUsd <= 0) {
        setError('Live vault position data is unavailable. Please refresh your portfolio and try again.');
        setIsFetchingQuote(false);
        return;
      }

      // Proportional share calculation
      if (positionAmount !== undefined && positionAmount !== null && positionAmount !== '') {
        const totalShares = BigInt(positionAmount.toString());
        const requestedUsdScaled = BigInt(Math.floor(amountRaw * 1000000));
        const totalUsdScaled = BigInt(Math.max(Math.floor(totalUsd * 1000000), 1));
        fromAmountSmallest = ((totalShares * requestedUsdScaled) / totalUsdScaled).toString();
      } else {
        setError('Could not determine share amount for withdrawal. Please try again later.');
        setIsFetchingQuote(false);
        return;
      }

      // Step 1: Fetch Quote using Earn API
      const response = await getQuote({
        fromChain: goal.vault.chainId,
        toChain: chainId,
        fromToken: goal.vault.address,
        toToken: selectedToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : selectedToken.address,
        fromAddress: address,
        toAddress: address,
        fromAmount: fromAmountSmallest,
        skipSimulation: true,
        isEarn: true, // Use LI.FI Earn/Composer specialized endpoint
      });
      
      setQuote(response);

      // Step 2: Check Allowance for the dynamic spender
      const finalSpender = response.estimate?.approvalAddress || response.transactionRequest?.to;
      if (allowance !== undefined && allowance < BigInt(fromAmountSmallest) && !approvedThisSessionRef.current) {
        setStep(1.5);
      } else {
        setStep(2);
      }
    } catch (err: any) {
      let msg = err.message || 'Failed to fetch withdrawal route';
      if (msg.toLowerCase().includes('no route') || msg.toLowerCase().includes('no available quotes')) {
        msg = `No available routes for this withdrawal. Minimal amount recommended is ~$1.`;
      }
      setError(msg);
    } finally {
      setIsFetchingQuote(false);
    }
  };

  useEffect(() => {
    if (isConfirmed && pendingWithdrawHash && goal) {
      addContribution(goal.id, {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amountUsd: -Number(amount),
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
      setError('Withdrawal failed on-chain.');
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
        setError('Approval required or simulation failed.');
        setStep(1.5);
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
    setVaultDeprecated(false);
    approvedThisSessionRef.current = false;
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className={cn(
        "max-w-[calc(100%-3rem)] sm:max-w-[440px] p-0 overflow-hidden transition-colors duration-500",
        isDark ? "bg-surface border-border text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
      )}>
        <div className="max-h-[85vh] overflow-y-auto w-full thin-scrollbar pb-6">
          <div className="p-4 md:p-6 pb-0">
          <DialogHeader className="mb-6">
            <DialogTitle className={cn("font-display text-2xl", !isDark && "text-slate-900")}>Withdraw Funds</DialogTitle>
            <DialogDescription className={isDark ? "text-gray-400" : "text-slate-500"}>
              Redeem assets from {goal.name} via LI.FI Earn
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
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Amount to Withdraw (USD)</label>
                    <AmountInput
                      value={amount}
                      onChange={setAmount}
                      onMax={() => setAmount(availableBalance.toFixed(2))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Receive As</label>
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
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {error}
                      {vaultDeprecated && goal.vault.protocol.url && (
                        <a
                          href={goal.vault.protocol.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline ml-1 text-red-400 hover:text-red-300"
                        >
                          Go to {goal.vault.protocol.name} →
                        </a>
                      )}
                    </span>
                  </div>
                )}

                <Button
                  disabled={!amount || Number(amount) <= 0 || Number(amount) > availableBalance + 0.01 || isFetchingQuote || !selectedToken}
                  onClick={fetchWithdrawQuote}
                  className={cn(
                    "w-full h-11 font-bold text-sm rounded-xl transition-all",
                    isDark ? "bg-white text-black hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                  )}
                >
                  {isFetchingQuote ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Fetching Route...
                    </div>
                  ) : 'Review Withdrawal'}
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
                      <p className={cn("text-sm font-bold", !isDark && "text-slate-900")}>Step 1: Approve vault tokens</p>
                      <p className="text-[10px] text-gray-500">
                        {isApprovalConfirmed ? "Success!" : "Approving vault access..."}
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
                    const finalChainId = goal.vault.chainId;
                    if (finalChainId !== chainId) {
                      await switchChainAsync({ chainId: finalChainId });
                    }
                    setIsApproving(true);
                    try {
                      const hash = await approveAsync({
                        address: goal.vault.address as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [spenderAddress as `0x${string}`, BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")],
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
                  {isApproving || isConfirmingApproval ? <Loader2 className="animate-spin mr-2" /> : "Approve Vault Tokens"}
                </Button>

                {isApprovalConfirmed && (
                  <Button onClick={() => fetchWithdrawQuote()} className="w-full h-11 bg-white text-black font-bold rounded-xl">
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
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Withdraw Amount</span>
                    <span className={cn("font-bold", !isDark && "text-slate-900")}>${amount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Estimated Receive</span>
                    <span className="text-accent font-bold">
                      {(Number(quote.estimate.toAmountMin || 0) / Math.pow(10, selectedToken.decimals)).toFixed(4)} {selectedToken.symbol}
                    </span>
                  </div>
                </div>

                <Button 
                  disabled={isWithdrawing || isConfirming}
                  onClick={handleWithdraw}
                  className="w-full h-14 bg-accent text-black hover:bg-accent/90 font-bold text-lg rounded-xl glow-cyan"
                >
                  {isWithdrawing || isConfirming ? <Loader2 className="animate-spin mr-2" /> : 'Confirm Withdrawal'}
                </Button>
                <Button variant="ghost" className="w-full text-gray-500" onClick={() => setStep(1)}>
                  Go Back
                </Button>
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
                <h3 className="text-2xl font-bold mb-2">Withdrawal Sent!</h3>
                <p className="text-gray-400 mb-8">Your funds are being redeemed and will arrive shortly.</p>
                <Button onClick={() => onOpenChange(false)} className="w-full">Dashboard</Button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
