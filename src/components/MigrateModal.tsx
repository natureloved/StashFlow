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
import { getQuote, getUserPositions, Vault } from '@/lib/lifi';
import { useAccount, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
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
] as const;

interface MigrateModalProps {
  goal: Goal | null;
  newVault: Vault | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrateModal({ goal, newVault, open, onOpenChange }: MigrateModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { address, chainId } = useAccount();
  const [step, setStep] = useState(1);
  
  const [withdrawQuote, setWithdrawQuote] = useState<any>(null);
  const [depositQuote, setDepositQuote] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePosition, setLivePosition] = useState<any>(null);

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [pendingWithdrawHash, setPendingWithdrawHash] = useState<`0x${string}` | undefined>(undefined);
  const [pendingDepositHash, setPendingDepositHash] = useState<`0x${string}` | undefined>(undefined);

  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const updateGoal = useGoalStore((state) => state.updateGoal);
  const addContribution = useGoalStore((state) => state.addContribution);

  const { isLoading: isConfirmingWithdraw, isSuccess: isWithdrawConfirmed, isError: isWithdrawError } = useWaitForTransactionReceipt({ hash: pendingWithdrawHash });
  const { isLoading: isConfirmingDeposit, isSuccess: isDepositConfirmed, isError: isDepositError } = useWaitForTransactionReceipt({ hash: pendingDepositHash });

  // Fetch live position when modal opens
  useEffect(() => {
    if (open && address && goal) {
      getUserPositions(address).then(data => {
        const position = data?.positions?.find((p: any) =>
          p.chainId === goal.vault.chainId && (
            p.vaultAddress?.toLowerCase() === goal.vault.address.toLowerCase() ||
            p.address?.toLowerCase() === goal.vault.address.toLowerCase() ||
            p.token?.address?.toLowerCase() === goal.vault.address.toLowerCase() ||
            p.asset?.address?.toLowerCase() === goal.vault.address.toLowerCase() ||
            (p.protocol?.name?.toLowerCase() === goal.vault.protocol.name.toLowerCase() &&
              p.asset?.symbol?.toLowerCase() === goal.vault.underlyingTokens?.[0]?.symbol?.toLowerCase())
          )
        );
        setLivePosition(position);
      }).catch(console.error);
    }
  }, [open, address, goal]);

  const [isApproving, setIsApproving] = useState(false);
  const [pendingApprovalHash, setPendingApprovalHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: pendingApprovalHash });

  const spenderAddress = withdrawQuote?.estimate?.approvalAddress || withdrawQuote?.transactionRequest?.to;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: goal?.vault.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, spenderAddress as `0x${string}`],
    chainId: goal?.vault.chainId,
    query: {
      enabled: !!address && !!goal && !!spenderAddress && step === 2,
    }
  });

  useEffect(() => {
    if (isApprovalConfirmed && pendingApprovalHash) {
      refetchAllowance();
      setPendingApprovalHash(undefined);
    }
  }, [isApprovalConfirmed, pendingApprovalHash, refetchAllowance]);

  const currentSaved = goal?.contributions.reduce((acc, curr) => acc + curr.amountUsd, 0) || 0;

  const fetchQuotes = async () => {
    if (!goal || !newVault || !address) return;
    setIsFetchingQuote(true);
    setError(null);
    try {
      let fromAmountSmallest = "0";
      const totalUsd = livePosition ? Number(livePosition.balanceUsd ?? livePosition.amountUsd ?? 0) : currentSaved;
      const positionAmount = livePosition?.amount ?? livePosition?.shares ?? livePosition?.shareAmount;

      if (positionAmount !== undefined && positionAmount !== null && positionAmount !== '') {
        fromAmountSmallest = positionAmount.toString();
      } else {
        // Fallback if no position found, just simulate with a dummy amount so we get a quote
        // This is a bit risky but needed if live positions fail to load
        const decimals = goal.vault.underlyingTokens?.[0]?.decimals || 18;
        fromAmountSmallest = parseUnits((currentSaved || 10).toString(), decimals).toString();
      }

      // We use USDC as the intermediate token for migration quotes
      const intermediateToken = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on mainnet, we can adapt based on chain if needed. Let's use USDC on target chain

      const wQuote = await getQuote({
        fromChain: goal.vault.chainId,
        toChain: goal.vault.chainId, // Keep on same chain for intermediate
        fromToken: goal.vault.address,
        toToken: '0x0000000000000000000000000000000000000000', // Native token or USDC
        fromAddress: address,
        toAddress: address,
        fromAmount: fromAmountSmallest,
        skipSimulation: true,
        isEarn: true,
      });
      setWithdrawQuote(wQuote);

      const toAmountIntermediate = wQuote.estimate.toAmountMin || wQuote.estimate.toAmount;

      const dQuote = await getQuote({
        fromChain: goal.vault.chainId,
        toChain: newVault.chainId,
        fromToken: '0x0000000000000000000000000000000000000000', // Matches intermediate
        toToken: newVault.address,
        fromAddress: address,
        toAddress: address,
        fromAmount: toAmountIntermediate,
        skipSimulation: true,
        isEarn: true,
      });
      setDepositQuote(dQuote);

      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to calculate migration route. Make sure you have funds in the vault.');
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawQuote || !goal) return;
    setIsWithdrawing(true);
    setError(null);
    try {
      if (withdrawQuote.transactionRequest?.chainId !== chainId) {
        await switchChainAsync({ chainId: withdrawQuote.transactionRequest.chainId });
      }
      const tx = await sendTransactionAsync({
        to: withdrawQuote.transactionRequest.to,
        data: withdrawQuote.transactionRequest.data,
        value: BigInt(withdrawQuote.transactionRequest.value || 0),
      });
      setPendingWithdrawHash(tx);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Withdrawal failed');
      setIsWithdrawing(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositQuote || !newVault) return;
    setIsDepositing(true);
    setError(null);
    try {
      if (depositQuote.transactionRequest?.chainId !== chainId) {
        await switchChainAsync({ chainId: depositQuote.transactionRequest.chainId });
      }
      const tx = await sendTransactionAsync({
        to: depositQuote.transactionRequest.to,
        data: depositQuote.transactionRequest.data,
        value: BigInt(depositQuote.transactionRequest.value || 0),
      });
      setPendingDepositHash(tx);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Deposit failed');
      setIsDepositing(false);
    }
  };

  useEffect(() => {
    if (isWithdrawConfirmed) {
      setIsWithdrawing(false);
      setStep(3); // Move to deposit step
    }
    if (isWithdrawError) {
      setError('Withdrawal transaction failed');
      setIsWithdrawing(false);
    }
  }, [isWithdrawConfirmed, isWithdrawError]);

  useEffect(() => {
    if (isDepositConfirmed && goal && newVault) {
      setIsDepositing(false);
      
      // Complete Migration: Update goal vault
      updateGoal(goal.id, { vault: newVault });
      addContribution(goal.id, {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amountUsd: 0, // Migration, net change is roughly 0
        txHash: pendingDepositHash || '',
        fromChain: newVault.chainId,
        fromToken: 'Migration',
      });

      setStep(4);
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
    }
    if (isDepositError) {
      setError('Deposit transaction failed');
      setIsDepositing(false);
    }
  }, [isDepositConfirmed, isDepositError]);

  const reset = () => {
    setStep(1);
    setWithdrawQuote(null);
    setDepositQuote(null);
    setError(null);
  };

  if (!goal || !newVault) return null;

  const currentApy = goal.vault.analytics?.apy?.total || 0;
  const newApy = newVault.analytics?.apy?.total || 0;
  const yearlyDiff = (currentSaved * (newApy - currentApy) / 100).toFixed(0);

  const needsApproval = allowance !== undefined && withdrawQuote && BigInt(withdrawQuote.transactionRequest?.data ? 1 : 0) > 0 && allowance === BigInt(0);

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className={cn(
        "max-w-[calc(100%-3rem)] sm:max-w-[480px] p-0 overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#0A0A0F] border-border text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
      )}>
        <div className="max-h-[85vh] overflow-y-auto w-full thin-scrollbar pb-6">
          <div className="p-4 md:p-6 pb-0">
          <DialogHeader className="mb-6">
            <DialogTitle className={cn("font-display text-2xl flex items-center gap-2", !isDark && "text-slate-900")}>
              <ShieldCheck className="w-6 h-6 text-accent" /> Optimize Yield
            </DialogTitle>
            <DialogDescription className={isDark ? "text-gray-400" : "text-slate-500"}>
              Migrate your funds to a better performing vault in the same risk tier.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div className="flex items-center justify-between gap-4">
                  {/* Current */}
                  <div className={cn("flex-1 p-4 rounded-xl border text-center opacity-60", isDark ? "bg-surface/50 border-border" : "bg-slate-50 border-slate-200")}>
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Current</p>
                    <p className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{goal.vault.protocol.name}</p>
                    <p className="text-xl font-display font-bold text-gray-500">{currentApy.toFixed(1)}%</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  {/* New */}
                  <div className={cn("flex-1 p-4 rounded-xl border text-center border-accent bg-accent/10 relative overflow-hidden")}>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-accent/20 blur-xl" />
                    <p className="text-[10px] uppercase font-bold text-accent mb-1 relative z-10">Optimized</p>
                    <p className={cn("font-bold relative z-10", isDark ? "text-white" : "text-slate-900")}>{newVault.protocol.name}</p>
                    <p className="text-2xl font-display font-bold text-accent relative z-10">{newApy.toFixed(1)}%</p>
                  </div>
                </div>

                <div className={cn("p-4 rounded-xl border text-center space-y-1", isDark ? "bg-surface border-border" : "bg-slate-50 border-slate-200")}>
                  <p className="text-sm font-bold">Estimated Benefit</p>
                  <p className="text-accent font-bold text-lg">+${yearlyDiff} / year</p>
                  <p className="text-xs text-gray-500">Based on current APY and balance of ${currentSaved.toLocaleString()}</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                  </div>
                )}

                <Button 
                  disabled={isFetchingQuote}
                  onClick={fetchQuotes}
                  className={cn("w-full h-14 font-bold text-lg rounded-xl", isDark ? "bg-accent text-black hover:bg-accent/90 glow-cyan" : "bg-slate-900 text-white")}
                >
                  {isFetchingQuote ? <Loader2 className="animate-spin" /> : "Review Migration Route"}
                </Button>
              </motion.div>
            )}

            {step === 2 && withdrawQuote && depositQuote && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className={cn("rounded-xl border p-4 space-y-4", isDark ? "bg-surface border-border" : "bg-slate-50 border-slate-200")}>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b pb-2 mb-2 border-border">Combined Route Receipt</div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">1. Withdraw from {goal.vault.protocol.name}</span>
                    <span className={cn("font-bold", !isDark && "text-slate-900")}>Ready</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">2. Deposit to {newVault.protocol.name}</span>
                    <span className={cn("font-bold", !isDark && "text-slate-900")}>Ready</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-500/90 text-center">
                  You will need to sign 2 transactions to complete this migration securely.
                </div>

                {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                {needsApproval ? (
                  <Button 
                    disabled={isApproving || isConfirmingApproval}
                    onClick={async () => {
                      setIsApproving(true);
                      try {
                        const hash = await approveAsync({
                          address: goal.vault.address as `0x${string}`,
                          abi: ERC20_ABI,
                          functionName: 'approve',
                          args: [spenderAddress as `0x${string}`, BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")],
                        });
                        setPendingApprovalHash(hash);
                      } catch (err) { setIsApproving(false); }
                    }}
                    className="w-full h-14 bg-white text-black font-bold rounded-xl"
                  >
                    {isConfirmingApproval ? <Loader2 className="animate-spin" /> : "Approve Current Vault"}
                  </Button>
                ) : (
                  <Button 
                    disabled={isWithdrawing || isConfirmingWithdraw}
                    onClick={handleWithdraw}
                    className="w-full h-14 bg-accent text-black font-bold text-lg rounded-xl glow-cyan"
                  >
                    {isWithdrawing || isConfirmingWithdraw ? <Loader2 className="animate-spin" /> : 'Step 1: Execute Withdrawal'}
                  </Button>
                )}
                
                <Button variant="ghost" className="w-full text-gray-500" onClick={() => setStep(1)}>Go Back</Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className={cn("rounded-xl border p-6 text-center space-y-4", isDark ? "bg-surface border-border" : "bg-slate-50 border-slate-200")}>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <h3 className="font-bold text-xl">Withdrawal Complete!</h3>
                  <p className="text-sm text-gray-400">Your funds are ready. Complete step 2 to deposit them into the optimized vault.</p>
                </div>
                
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                <Button 
                  disabled={isDepositing || isConfirmingDeposit}
                  onClick={handleDeposit}
                  className="w-full h-14 bg-accent text-black font-bold text-lg rounded-xl glow-cyan"
                >
                  {isDepositing || isConfirmingDeposit ? <Loader2 className="animate-spin" /> : 'Step 2: Execute Deposit'}
                </Button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 text-center">
                <SparklesIcon className="w-16 h-16 text-accent mb-4" />
                <h3 className="text-2xl font-bold mb-2">Optimization Complete!</h3>
                <p className="text-gray-400 mb-8">Your goal is now earning {newApy.toFixed(1)}% APY.</p>
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

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v18" />
      <path d="m4.929 4.929 14.142 14.142" />
      <path d="M3 12h18" />
      <path d="m4.929 19.071 14.142-14.142" />
    </svg>
  );
}
