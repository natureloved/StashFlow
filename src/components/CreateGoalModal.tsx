'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EducationPopover } from '@/components/EducationPopover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskTier, findBestVault } from '@/lib/matching';
import { Vault } from '@/lib/lifi';
import { useGoalStore } from '@/store/useGoalStore';
import { Loader2, ShieldCheck, Scale, Flame, ChevronRight, Target, AlertCircle, HelpCircle, Check, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAccount, useSendTransaction, useSwitchChain, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getQuote } from '@/lib/lifi';
import { getTokenPrice } from '@/lib/prices';
import { AmountInput } from '@/components/AmountInput';
import confetti from 'canvas-confetti';
import { VaultSafetyModal } from '@/components/VaultSafetyModal';
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
  137: [
    { symbol: 'MATIC', address: 'native', decimals: 18 },
    { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
  ],
};

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGoalModal({ open, onOpenChange }: CreateGoalModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [riskTier, setRiskTier] = useState<RiskTier | null>(null);
  const [selectedVault, setSelectedVault] = React.useState<Vault | null>(null);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  
  // Deposit Integration State
  const [newGoalId, setNewGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isUsdMode, setIsUsdMode] = useState(true);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [quote, setQuote] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [pendingApprovalHash, setPendingApprovalHash] = useState<`0x${string}` | undefined>(undefined);

  const { address, chainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const addGoal = useGoalStore((state) => state.addGoal);
  const addContribution = useGoalStore((state) => state.addContribution);

  const { data: balanceData } = useBalance({
    address: address,
    token: selectedToken?.address === 'native' ? undefined : selectedToken?.address as `0x${string}`,
    chainId: chainId,
  });

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleRiskSelect = async (tier: RiskTier) => {
    setRiskTier(tier);
    setIsLoadingVault(true);
    setError(null);
    try {
      const bestVault = await findBestVault(tier);
      if (bestVault) {
        setSelectedVault(bestVault as any);
        setStep(3);
      } else {
        setError('No matching vault found. Please try a different risk level.');
      }
    } catch (error: any) {
      console.error('Failed to match vault:', error);
      setError(`Could not load yield protocols: ${error.message?.split(':').pop()?.trim() || 'Please retry'}.`);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleConfirm = () => {
    if (!riskTier || !selectedVault) return;
    const goalId = uuidv4();
    
    addGoal({
      id: goalId,
      ownerAddress: address || '0x0000000000000000000000000000000000000000',
      name,
      targetAmountUsd: Number(amount),
      riskTier,
      vault: selectedVault,
      contributions: [],
      createdAt: new Date().toISOString(),
    });

    setNewGoalId(goalId);
    setStep(4);
  };

  const handleMax = () => {
    if (!balanceData) return;
    const formatted = formatUnits(balanceData.value, balanceData.decimals);
    if (isUsdMode && tokenPrice) {
      setDepositAmount((Number(formatted) * tokenPrice).toFixed(2));
    } else {
      setDepositAmount(formatted);
    }
  };

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken?.address === 'native' ? undefined : selectedToken?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, quote?.transactionRequest?.to as `0x${string}`],
    query: {
      enabled: !!address && !!selectedToken && selectedToken.address !== 'native' && !!quote?.transactionRequest?.to,
    }
  });

  const rawAmount = (depositAmount && tokenPrice && tokenPrice > 0)
    ? (isUsdMode ? (Number(depositAmount) / tokenPrice) : Number(depositAmount))
    : 0;
  
  const fromAmountSmallest = selectedToken 
    ? parseUnits(rawAmount.toFixed(selectedToken.decimals), selectedToken.decimals) 
    : BigInt(0);

  const needsApproval = selectedToken?.address !== 'native' && quote && allowance !== undefined && allowance < fromAmountSmallest;

  const { isLoading: isConfirmingApproval, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: pendingApprovalHash,
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  React.useEffect(() => {
    if (chainId && COMMON_TOKENS[chainId]) {
      setSelectedToken(COMMON_TOKENS[chainId].find(t => t.symbol === 'USDC') || COMMON_TOKENS[chainId][0]);
    }
  }, [chainId, open]);

  React.useEffect(() => {
    async function updatePrice() {
      if (selectedToken && chainId) {
        const p = await getTokenPrice(chainId, selectedToken.address);
        setTokenPrice(p);
      }
    }
    updatePrice();
  }, [selectedToken, chainId]);

  React.useEffect(() => {
    if (isConfirmed && pendingTxHash && newGoalId) {
      const depVal = isUsdMode ? Number(depositAmount) : Number(depositAmount) * tokenPrice;
      addContribution(newGoalId, {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amountUsd: depVal,
        txHash: pendingTxHash,
        fromChain: chainId as number,
        fromToken: selectedToken.symbol,
      });
      setPendingTxHash(undefined);
      setStep(5); // Success step
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#FFB800', '#FFFFFF']
      });
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
  }, [isApprovalConfirmed, pendingApprovalHash]);

  const fetchQuote = async () => {
    if (!selectedVault || !depositAmount || !address || !selectedToken || !chainId) return;
    setIsFetchingQuote(true);
    setError(null);
    try {
      const fromAmountRaw = isUsdMode ? (Number(depositAmount) / tokenPrice) : Number(depositAmount);
      const amountStr = fromAmountRaw.toFixed(selectedToken.decimals);
      const fromAmountSmallestStr = parseUnits(amountStr, selectedToken.decimals).toString();

      const response = await getQuote({
        fromChain: chainId,
        toChain: selectedVault.chainId,
        fromToken: selectedToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : selectedToken.address,
        toToken: selectedVault.address,
        fromAddress: address,
        toAddress: address,
        fromAmount: fromAmountSmallestStr,
      });
      setQuote(response);
      setCountdown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quote');
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const handleDepositTransaction = async () => {
    if (!quote || !isAgreed) return;
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

  const reset = () => {
    setStep(1);
    setName('');
    setAmount('');
    setRiskTier(null);
    setSelectedVault(null);
    setNewGoalId(null);
    setDepositAmount('');
    setQuote(null);
    setError(null);
    setIsAgreed(false);
    setPendingTxHash(undefined);
    setPendingApprovalHash(undefined);
  };

  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) reset(); }}>
      <DialogContent className={cn(
        "max-w-[calc(100%-3rem)] sm:max-w-[440px] max-h-[calc(100vh-5rem)] overflow-hidden transition-colors duration-500",
        isDark ? "bg-surface border-border text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
      )}>
        <DialogHeader>
          <DialogTitle className={cn("font-display text-2xl", !isDark && "text-slate-900")}>Create New Goal</DialogTitle>
          <DialogDescription className={isDark ? "text-white/60" : "text-slate-500"}>
            {step === 1 && "What are you saving for?"}
            {step === 2 && "Choose a risk level that fits your goal."}
            {step === 3 && "We've matched you with the best strategy."}
            {step === 4 && "Fund your goal to start earning"}
            {step === 5 && "Goal Activated!"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Japan Trip 2027 ✈️" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className={cn(
                      "transition-all",
                      isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-200 focus:bg-white"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Target Amount (USD)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="3000" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className={cn(
                      "transition-all",
                      isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-200 focus:bg-white"
                    )}
                  />
                </div>
                <Button 
                  disabled={!name || !amount} 
                  onClick={() => setStep(2)} 
                  className="w-full bg-accent text-black hover:bg-accent/90 font-bold"
                >
                  Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 gap-4"
              >
                {[
                  { id: 'safe', title: 'SAFE', icon: ShieldCheck, desc: 'Stablecoins · Blue-chip · Low risk', color: 'text-green-400' },
                  { id: 'balanced', title: 'BALANCED', icon: Scale, desc: 'ETH-correlated · Medium risk', color: 'text-amber-400' },
                  { id: 'degen', title: 'DEGEN', icon: Flame, desc: 'Max APY · Higher risk', color: 'text-red-500' },
                ].map((tier) => (
                  <Card 
                    key={tier.id}
                    className={cn(
                      "p-4 cursor-pointer transition-all group",
                      isDark ? "bg-[#0A0A0F] border-border hover:border-accent" : "bg-slate-50 border-slate-200 hover:border-accent hover:bg-white hover:shadow-sm",
                      isLoadingVault && 'opacity-50 pointer-events-none'
                    )}
                    onClick={() => handleRiskSelect(tier.id as RiskTier)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg bg-surface ${tier.color}`}>
                        <tier.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className={cn("font-display font-bold text-lg", isDark ? "text-white" : "text-slate-900")}>{tier.title}</h4>
                        <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-500")}>{tier.desc}</p>
                      </div>
                      {isLoadingVault && riskTier === tier.id && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
                    </div>
                  </Card>
                ))}
                {error && !isLoadingVault && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex flex-col gap-2 text-red-400 text-xs">
                    <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>
                    <button onClick={() => setError(null)} className="text-accent underline text-xs self-start">← Try again</button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && selectedVault && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  isDark ? "bg-[#0A0A0F] border-accent/30 glow-cyan" : "bg-cyan-50/50 border-cyan-100 shadow-sm"
                )}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={cn("font-display font-bold text-xl", !isDark && "text-slate-900")}>
                        <EducationPopover id="vault" term="vault">
                          A vault is a smart contract that pools 
                          deposits and puts them to work in DeFi lending markets. 
                          Think of it like a high-yield savings account, 
                          but on the blockchain.
                        </EducationPopover>
                        : {selectedVault.name}
                      </h4>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        Powered by {selectedVault.protocol.name}
                        <button 
                          onClick={() => setIsSafetyModalOpen(true)}
                          className="text-gray-500 hover:text-accent transition-colors"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </p>
                    </div>
                    <Badge className="bg-accent text-black flex items-center gap-1.5 px-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                      <EducationPopover id="apy" term={`${(selectedVault.analytics.apy.total).toFixed(2)}% APY`}>
                        APY means you earn {(selectedVault.analytics.apy.total).toFixed(2)}% of your deposit 
                        per year, paid continuously. $1,000 today becomes 
                        ~${(1000 * (1 + selectedVault.analytics.apy.total / 100)).toLocaleString()} in a year — automatically, no action needed.
                      </EducationPopover>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm font-body">
                    <div className="space-y-1">
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Total Deposits</div>
                      <div className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>
                        <EducationPopover id="tvl" term={`$${Number(selectedVault.analytics.tvl.usd).toLocaleString()}`}>
                          This is how much money other users have 
                          deposited. Higher deposits generally mean the protocol 
                          is more trusted and battle-tested.
                        </EducationPopover>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-[10px] text-gray-500 uppercase font-bold">Network</div>
                      <div className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{selectedVault.network}</div>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-lg border flex items-center gap-3 transition-all",
                  isDark ? "bg-surface/50 border-border" : "bg-slate-50 border-slate-200"
                )}>
                  <Target className="w-5 h-5 text-accent" />
                  <p className={cn("text-xs", isDark ? "text-gray-300" : "text-slate-600")}>
                    This vault was selected because it offers the best {riskTier} risk-adjusted yield for your goal.
                  </p>
                </div>

                {riskTier === 'degen' && (
                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-xs text-red-400 font-bold">
                      Warning: Degen strategies have no TVL floor and high volatility. Not for the faint-hearted.
                    </p>
                  </div>
                )}

                <Button onClick={handleConfirm} className="w-full bg-accent text-black hover:bg-accent/90 font-bold">
                  Continue to Funding <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 4 && selectedVault && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className={cn(
                  "border p-3 rounded-xl space-y-2 transition-all",
                  isDark ? "bg-accent/5 border-accent/20" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-accent font-bold uppercase tracking-wider">Goal Summary</span>
                    <Badge variant="outline" className="border-accent/30 text-accent text-[10px]">{selectedVault.network}</Badge>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className={cn("text-lg font-display font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>{name}</p>
                      <p className="text-[10px] text-gray-400">Targeting ${Number(amount).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-display font-bold text-secondary leading-tight">{selectedVault.analytics.apy.total.toFixed(2)}% APY</p>
                      <p className={cn("text-[9px] uppercase font-black", isDark ? "text-gray-500" : "text-slate-400")}>{selectedVault.protocol.name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">How much to start with?</div>
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

                  <div className="space-y-4">
                    <AmountInput
                      value={depositAmount}
                      onChange={setDepositAmount}
                      onMax={handleMax}
                      placeholder="Even $10 gets you started"
                    />
                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={() => setIsUsdMode(!isUsdMode)}
                        className={cn(
                          "font-bold text-[10px] uppercase tracking-widest border px-2 py-0.5 rounded-md transition-all",
                          isDark ? "text-gray-500 border-border hover:text-white" : "text-slate-400 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        Mode: {isUsdMode ? 'USD' : selectedToken?.symbol}
                      </button>
                    </div>
                  </div>

                  {depositAmount && !quote && (
                    <Button 
                      disabled={isFetchingQuote}
                      onClick={fetchQuote} 
                      className={cn(
                        "w-full h-12 font-bold transition-all",
                        isDark ? "bg-white text-black hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {isFetchingQuote ? <Loader2 className="animate-spin" /> : 'Review Route'}
                    </Button>
                  )}

                  {quote && (
                    <div className={cn(
                      "border rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 transition-all",
                      isDark ? "bg-[#0A0A0F] border-border" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex justify-between items-center text-xs">
                         <span className="text-gray-400 uppercase font-bold tracking-widest">Fees</span>
                         <span className={cn("font-numeric", isDark ? "text-white" : "text-slate-900")}>~${(quote.estimate?.feeCosts?.reduce((acc: number, c: any) => acc + Number(c.amountUSD || 0), 0) + quote?.estimate?.gasCosts?.reduce((acc: number, c: any) => acc + Number(c.amountUSD || 0), 0)).toFixed(2)}</span>
                      </div>
                      
                      <label className="flex items-center gap-3 cursor-pointer group p-1">
                        <input 
                          type="checkbox" 
                          checked={isAgreed}
                          onChange={(e) => setIsAgreed(e.target.checked)}
                          className="w-4 h-4 rounded border-border bg-surface text-accent"
                        />
                        <span className="text-[10px] text-gray-400 group-hover:text-white uppercase font-bold">I understand the fees & risks</span>
                      </label>

                      {needsApproval ? (
                        <Button 
                          disabled={!isAgreed || isConfirmingApproval}
                          onClick={async () => {
                            try {
                              const hash = await approveAsync({
                                address: selectedToken.address as `0x${string}`,
                                abi: ERC20_ABI,
                                functionName: 'approve',
                                args: [quote.transactionRequest.to as `0x${string}`, fromAmountSmallest],
                              });
                              setPendingApprovalHash(hash);
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          className={cn(
                            "w-full font-bold transition-all",
                            isDark ? "bg-white text-black hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800"
                          )}
                        >
                          {isConfirmingApproval ? <><Loader2 className="animate-spin mr-2" /> Confirming...</> : `Approve ${selectedToken.symbol}`}
                        </Button>
                      ) : (
                        <Button 
                          disabled={!isAgreed || isDepositing || isConfirming}
                          onClick={handleDepositTransaction}
                          className="w-full bg-accent text-black hover:bg-accent/90 font-bold shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                        >
                          {isConfirming ? <><Loader2 className="animate-spin mr-2" /> Confirming...</> : 'Start Earning →'}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-3 pt-2">
                    <button 
                      onClick={() => onOpenChange(false)}
                      className="text-xs text-gray-500 hover:text-accent font-bold underline underline-offset-4"
                    >
                      Set up goal without funding →
                    </button>
                    <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest leading-relaxed">
                      Your first deposit activates your yield. <br/>You can always add more later.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2 text-red-500 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mb-6 border transition-all",
                  isDark ? "bg-accent/20 border-accent/30 shadow-[0_0_30px_rgba(0,229,255,0.2)]" : "bg-accent/10 border-accent/20"
                )}>
                  <CheckCircle2 className="w-10 h-10 text-accent" />
                </div>
                <h3 className={cn("font-display text-3xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Goal Activated!</h3>
                <p className={cn("mb-8 font-body leading-relaxed", isDark ? "text-gray-400" : "text-slate-500")}>
                  🎉 Goal created and funded! <br/>
                  <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>${isUsdMode ? Number(depositAmount).toFixed(2) : (Number(depositAmount) * tokenPrice).toFixed(2)}</span> is now earning <span className="text-secondary font-bold">{selectedVault?.analytics.apy.total.toFixed(2)}% APY</span> in your <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{name}</span> goal.
                </p>
                <Button onClick={() => onOpenChange(false)} className="w-full h-12 bg-accent text-black hover:bg-accent/90 font-bold rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  Go to Dashboard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isLoadingVault && (
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center z-50 rounded-lg transition-all",
            isDark ? "bg-surface/80" : "bg-white/80 backdrop-blur-sm"
          )}>
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
            <p className={cn("font-display font-bold text-xl", !isDark && "text-slate-900")}>Finding best vault...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TokenChip({ token, chainId, isSelected, onClick }: { token: any, chainId: number, isSelected: boolean, onClick: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
          ? 'border-accent bg-accent/10 ring-1 ring-accent' 
          : (isDark ? 'border-border bg-surface/50 hover:border-accent/50' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'),
        !hasBalance ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'
      )}
    >
      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
        {token.symbol[0]}
      </div>
      <div className="text-left">
        <div className={cn("text-xs font-bold uppercase tracking-tighter", isDark ? "text-white" : "text-slate-900")}>{token.symbol}</div>
        <div className="text-[10px] text-gray-500 font-numeric">
          {balance ? `${Number(balance.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : '0.00'}
        </div>
      </div>
    </button>
  );
}
