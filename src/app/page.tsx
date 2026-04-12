'use client';

import * as React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PageTransition } from '@/components/PageTransition';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { 
  ArrowRight, 
  LayoutDashboard, 
  Sparkles, 
  TrendingUp, 
  Shield, 
  Zap, 
  CheckCircle,
  Coins,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export default function Home() {
  const { isConnected } = useAccount();
  const [metrics, setMetrics] = React.useState({ vaults: 0, chains: 0, protocols: 0 });

  React.useEffect(() => {
    async function fetchMetrics() {
      try {
        const [vaultsRes, chainsRes, protocolsRes] = await Promise.all([
          fetch('https://earn.li.fi/v1/earn/vaults').then(res => res.json()),
          fetch('https://earn.li.fi/v1/earn/chains').then(res => res.json()),
          fetch('https://earn.li.fi/v1/earn/protocols').then(res => res.json())
        ]);
        
        setMetrics({
          vaults: vaultsRes.total || 0,
          chains: Array.isArray(chainsRes) ? chainsRes.length : 0,
          protocols: Array.isArray(protocolsRes) ? protocolsRes.length : 0
        });
      } catch (err) {
        console.error('Failed to fetch landing metrics:', err);
      }
    }
    fetchMetrics();
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white selection:bg-accent/30">
      {/* Premium Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0F]/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-black font-display font-extrabold text-lg">S</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Stashflow</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden md:block">How it works</Link>
            <Link href="#security" className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden md:block mr-2">Security</Link>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] -z-10" />

        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-8 text-center lg:text-left"
            >
              <motion.div variants={itemVariants}>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-4">
                  <Sparkles className="w-3 h-3" /> The Future of Savings
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-black leading-[0.95] tracking-tight mb-6">
                  Save with <span className="text-accent underline decoration-accent/30 decoration-8 underline-offset-8 transition-all hover:decoration-accent/60">purpose.</span>
                </h1>
                <p className="text-base md:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-body">
                  DeFi made simple. Set goals, connect any token, and watch your yields pay for your real-world lifestyle. No complexity, just growth.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {isConnected ? (
                  <Link href="/dashboard" className="group">
                    <div className="bg-accent px-8 py-4 rounded-xl flex items-center gap-2 text-black font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20">
                      <LayoutDashboard className="w-5 h-5" />
                      Enter Dashboard
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ) : (
                  <div className="p-[1px] rounded-xl bg-gradient-to-r from-accent to-accent/50 shadow-xl shadow-accent/10">
                    <div className="bg-accent px-5 py-2.5 rounded-[11px] text-black font-bold">
                       <ConnectButton label="Get Started" />
                    </div>
                  </div>
                )}
                <Link href="#how-it-works" className="px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold">
                  View Demo
                </Link>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-center justify-center lg:justify-start gap-6 text-xs text-gray-500 font-bold uppercase tracking-widest pt-4">
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent" /> No Locked Periods</span>
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent" /> Non-Custodial</span>
              </motion.div>
            </motion.div>

            {/* Interactive Savings Card Visualization */}
            <motion.div 
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.8, delay: 0.3 }}
               className="relative lg:block scale-90 sm:scale-100"
            >
              <div className="relative group p-8 rounded-[40px] bg-[#111118]/80 backdrop-blur-2xl border border-white/5 shadow-2xl">
                <div className="absolute -inset-2 bg-gradient-to-br from-accent/20 to-transparent rounded-[42px] blur-2xl -z-10 group-hover:opacity-100 transition duration-1000" />
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">Goal: Japan Trip 2026</p>
                      <h3 className="text-2xl font-black italic uppercase">Flight Fund</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                      <TrendingUp className="w-6 h-6 text-accent" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-bold">Current Stash</p>
                        <p className="text-4xl font-numeric font-extrabold text-white tracking-tight">$1,420.50</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary font-numeric font-bold">+12.4% APY</p>
                        <p className="text-[10px] text-gray-600">Harvesting Live</p>
                      </div>
                    </div>
                    
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 2, delay: 1 }}
                        className="h-full bg-accent glow-cyan rounded-full"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Yield Insight</p>
                        <p className="text-xs text-gray-400 leading-relaxed font-body">Your yield is currently covering your Spotify & Gym membership monthly.</p>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 p-4 rounded-2xl bg-surface/90 border border-white/10 backdrop-blur shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Yield Earned</p>
                      <p className="text-sm font-numeric font-black tracking-tight">+$42.20</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Flow - "Making DeFi Easy" Section */}
      <section id="how-it-works" className="py-20 bg-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-black uppercase italic italic tracking-tight">The Simplest Path to Yield</h2>
            <p className="text-gray-400 font-body text-lg">We've coordinated the most complex parts of decentralised finance into a three-step journey that anyone can follow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Pick a Goal", 
                desc: "Name your target. Whether it's a holiday, a house, or a rainy day fund. Give your savings a identity.", 
                icon: TargetIcon, 
                color: "text-accent", 
                bg: "bg-accent/10" 
              },
              { 
                title: "One-Tap Stash", 
                desc: "No complex swaps or bridging. Connect any wallet and deposit any token. We handle the routing through LI.FI.", 
                icon: Zap, 
                color: "text-secondary", 
                bg: "bg-secondary/10" 
              },
              { 
                title: "Earn & Visualize", 
                desc: "Watch your stash grow. We map your monthly yield to real-world costs, so you see the value, not just numbers.", 
                icon: Sparkles, 
                color: "text-green-500", 
                bg: "bg-green-500/10" 
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group p-8 rounded-3xl bg-surface/50 border border-white/5 hover:border-white/10 hover:bg-surface transition-all"
              >
                <div className={`w-14 h-14 ${step.bg} ${step.color} rounded-2xl flex items-center justify-center mb-6 border border-white/5 transition-transform group-hover:scale-110`}>
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-body">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section id="security" className="py-16 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="glass-card p-6 md:p-12 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden md:block">
                <Shield className="w-64 h-64" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center relative z-10">
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-2xl md:text-4xl font-display font-black uppercase">Institutional Grade Security</h2>
                <p className="text-sm md:text-base text-gray-400 font-body leading-relaxed max-w-lg">
                  Stashflow is non-custodial. Your funds never enter our possession. 
                  We utilize the audited infrastructure of LI.FI Earn to route your 
                  deposits into the world's most battle-tested DeFi protocols like Aave, Morpho, and Spark.
                </p>
                <div className="flex flex-wrap gap-3 pt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold font-body">
                    <Shield className="w-3.5 h-3.5 text-green-500" /> Audited Contracts
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold font-body">
                    <Globe className="w-3.5 h-3.5 text-accent" /> <span className="font-numeric">{metrics.chains || 60}+</span> Chains
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold font-body">
                    <Zap className="w-3.5 h-3.5 text-secondary" /> <span className="font-numeric">{metrics.protocols || 20}+</span> Vault Protocols
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { label: "Connected Vaults", value: metrics.vaults ? `${metrics.vaults}+` : "600+" },
                  { label: "Active Chains", value: metrics.chains ? `${metrics.chains}+` : "16+" },
                  { label: "Uptime", value: "99.9%" },
                  { label: "Architecture", value: "Non-Custodial" }
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-numeric font-black text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 pb-40 text-center">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto space-y-10"
          >
            <h2 className="text-4xl md:text-7xl font-display font-black uppercase italic tracking-tighter">
              Ready to stash?
            </h2>
            <p className="text-xl text-gray-400 max-w-xl mx-auto font-body">
              Stop settling for 0.1%. Transform your savings into purpose-driven goals powered by institutional-grade DeFi yield.
            </p>
            
            <div className="flex flex-col items-center gap-6">
              {!isConnected ? (
                <div className="relative group">
                  {/* Liquid Shimmer Animation Container */}
                  <motion.div 
                    animate={{ 
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.02, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -inset-1 bg-gradient-to-r from-accent/50 to-secondary/50 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"
                  />
                  <div className="relative bg-[#0A0A0F]/80 backdrop-blur-xl border border-white/10 rounded-full p-1 pl-6 flex items-center gap-4 hover:border-accent/40 transition-colors group">
                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-gray-300 group-hover:text-white transition-colors">Launch Stashflow</span>
                    <div className="overflow-hidden rounded-full">
                      <ConnectButton label="Enter App" showBalance={false} />
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/dashboard" className="group pt-4">
                  <div className="bg-white px-8 py-3.5 rounded-xl flex items-center gap-2 text-black text-sm font-bold hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all">
                    Go to Your Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Subtle Bottom Glow */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent pointer-events-none" />
    </main>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  );
}
