'use client';

import * as React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PageTransition } from '@/components/PageTransition';
import { useAccount } from 'wagmi';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
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

function YieldInsightSlider() {
  const items = [
    { name: "your Spotify Premium", icon: "🎵" },
    { name: "a cinema ticket", icon: "🎬" },
    { name: "a gourmet lunch", icon: "🍱" },
    { name: "a gym session", icon: "💪" }
  ];
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "p-5 rounded-2xl border space-y-3 relative overflow-hidden group/insight transition-all",
      isDark ? "bg-[#0F0F18] border-white/5" : "bg-white border-slate-200 shadow-sm"
    )}>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-secondary" />
          </div>
          <span className={cn(
            "text-[10px] text-secondary font-black uppercase tracking-widest",
          )}>Live Yield Insight</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-tighter",
            isDark ? "text-gray-500" : "text-slate-400"
          )}>Calculating...</span>
        </div>
      </div>

      <div className="relative h-12 flex items-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col justify-center"
          >
            <p className={cn(
              "text-sm font-display font-bold leading-tight",
              isDark ? "text-white" : "text-slate-900"
            )}>
              Monthly yield: <span className="text-secondary font-numeric">~$14.67</span>
            </p>
            <p className={cn(
              "text-[11px] font-body mt-0.5",
              isDark ? "text-gray-400" : "text-slate-500"
            )}>
              That's <span className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>{items[index].name}</span> {items[index].icon} each month
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={cn(
        "pt-2 border-t flex items-center justify-between relative z-10",
        isDark ? "border-white/10" : "border-slate-100"
      )}>
        <p className={cn(
          "text-[13px] text-accent font-body font-black italic tracking-wide",
          isDark && "drop-shadow-[0_0_12px_rgba(0,255,240,0.4)]"
        )}>
          Visualizing your yield as real-world value.
        </p>
        <div className="flex gap-1">
          {items.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-1 h-1 rounded-full transition-all duration-500",
                i === index ? 'w-3 bg-secondary' : (isDark ? 'bg-white/10' : 'bg-slate-200')
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export default function Home() {
  const { isConnected } = useAccount();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [metrics, setMetrics] = React.useState({ vaults: 0, chains: 0, protocols: 0 });

  // ... (useEffects)

  return (
    <main className={cn(
      "min-h-screen transition-colors duration-500 selection:bg-accent/30",
      isDark ? "bg-[#0A0A0F] text-white" : "bg-slate-50 text-slate-900"
    )}>
      {/* Premium Navbar */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl transition-all",
        isDark ? "border-white/5 bg-[#0A0A0F]/50" : "border-slate-200 bg-white/80"
      )}>
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-black font-display font-extrabold text-lg">S</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Stashflow</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#how-it-works" className={cn(
              "text-sm font-medium transition-colors hidden md:block",
              isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
            )}>How it works</Link>
            <Link href="#security" className={cn(
              "text-sm font-medium transition-colors hidden md:block mr-2",
              isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
            )}>Security</Link>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Ambient Glows */}
        <div 
          className="absolute top-0 right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -z-10 animate-pulse transition-opacity duration-1000" 
          style={{ opacity: isDark ? 1 : 0 }}
        />
        <div 
          className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] -z-10 transition-opacity duration-1000" 
          style={{ opacity: isDark ? 1 : 0 }}
        />

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
                <p className={cn(
                  "text-base md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed font-body",
                  isDark ? "text-gray-400" : "text-slate-600"
                )}>
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
                  <Link href="#how-it-works" className={cn(
                    "px-8 py-4 rounded-xl border transition-all text-sm font-bold",
                    isDark ? "border-white/10 hover:bg-white/5 text-white" : "border-slate-200 hover:bg-slate-100 text-slate-900"
                  )}>
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
              <div className={cn(
                "relative group p-8 rounded-[40px] backdrop-blur-2xl border transition-all",
                isDark ? "bg-[#111118]/80 border-white/5 shadow-2xl" : "bg-white border-slate-200 shadow-xl"
              )}>
                <div className={cn(
                  "absolute -inset-2 bg-gradient-to-br from-accent/20 to-transparent rounded-[42px] blur-2xl -z-10 group-hover:opacity-100 transition duration-1000",
                  !isDark && "hidden"
                )} />
                
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
                        <p className={cn("text-xs font-bold", isDark ? "text-gray-500" : "text-slate-400")}>Current Stash</p>
                        <p className={cn("text-4xl font-numeric font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>$1,420.50</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary font-numeric font-bold">+12.4% APY</p>
                        <p className={cn("text-[10px]", isDark ? "text-gray-600" : "text-slate-400")}>Harvesting Live</p>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "h-2 w-full rounded-full overflow-hidden border transition-all",
                      isDark ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-100"
                    )}>
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 2, delay: 1 }}
                        className="h-full bg-accent glow-cyan rounded-full"
                      />
                    </div>
                  </div>

                  <YieldInsightSlider />
                </div>

                {/* Floating Elements */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className={cn(
                    "absolute -top-6 -right-6 p-4 rounded-2xl border backdrop-blur shadow-2xl transition-all",
                    isDark ? "bg-surface/90 border-white/10" : "bg-white border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className={cn("text-[10px] uppercase font-bold", isDark ? "text-gray-500" : "text-slate-400")}>Yield Earned</p>
                      <p className={cn("text-sm font-numeric font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>+$42.20</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Flow - "Making DeFi Easy" Section */}
      <section id="how-it-works" className={cn(
        "py-20 transition-colors duration-500",
        isDark ? "bg-white/5" : "bg-slate-100/50"
      )}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className={cn(
              "text-4xl md:text-5xl font-display font-black uppercase italic italic tracking-tight",
              isDark ? "text-white" : "text-slate-900"
            )}>The Simplest Path to Yield</h2>
            <p className={cn(
              "font-body text-lg",
              isDark ? "text-gray-400" : "text-slate-600"
            )}>We've coordinated the most complex parts of decentralised finance into a three-step journey that anyone can follow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Pick a Goal", 
                desc: "Name your target. Whether it's a holiday, a house, or a rainy day fund. Give your savings an identity.", 
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
                className={cn(
                  "group p-8 rounded-3xl border transition-all",
                  isDark 
                   ? "bg-surface/50 border-white/5 hover:border-white/10 hover:bg-surface" 
                   : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-transform group-hover:scale-110",
                  step.bg, step.color,
                  isDark ? "border-white/5" : "border-slate-100"
                )}>
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className={cn("text-xl font-bold mb-3", !isDark && "text-slate-900")}>{step.title}</h3>
                <p className={cn("text-sm leading-relaxed font-body", isDark ? "text-gray-400" : "text-slate-500")}>{step.desc}</p>
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
                <h2 className={cn(
                  "text-2xl md:text-4xl font-display font-black uppercase",
                  !isDark && "text-slate-900"
                )}>Institutional Grade Security</h2>
                <p className={cn(
                  "text-sm md:text-base font-body leading-relaxed max-w-lg",
                  isDark ? "text-gray-400" : "text-slate-600"
                )}>
                  Stashflow is non-custodial. Your funds never enter our possession. 
                  We utilize the audited infrastructure of LI.FI Earn to route your 
                  deposits into the world's most battle-tested DeFi protocols like Aave, Morpho, and Spark.
                </p>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold font-body transition-all",
                      isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                    )}>
                      <Shield className="w-3.5 h-3.5 text-green-500" /> Audited Contracts
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold font-body transition-all",
                      isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                    )}>
                      <Globe className="w-3.5 h-3.5 text-accent" /> <span className="font-numeric">60+</span> Chains
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold font-body transition-all",
                      isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                    )}>
                      <Zap className="w-3.5 h-3.5 text-secondary" /> <span className="font-numeric">20+</span> Protocols
                    </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: "Supported networks", value: "60+ Chains" },
                  { label: "Including Aave, Morpho, Pendle and more", value: "20+ Protocols" },
                  { label: "Architecture", value: "Non-Custodial" }
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center flex flex-col justify-center min-h-[120px]">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mb-2">{stat.label}</p>
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
            <h2 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter">
              Ready to stash?
            </h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto font-body">
              Stop settling for 0.1%. Transform your savings into purpose-driven goals.
            </p>
            
            <div className="flex flex-col items-center gap-6">
              {!isConnected ? (
                <div className="relative group">
                  {/* Liquid Shimmer Animation Container */}
                  <motion.div 
                    animate={{ 
                      opacity: isDark ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
                      scale: [1, 1.02, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className={cn(
                      "absolute -inset-1 rounded-full blur-xl transition-opacity",
                      isDark ? "bg-gradient-to-r from-accent/50 to-secondary/50 opacity-20 group-hover:opacity-40" : "bg-accent/20 opacity-0 group-hover:opacity-40"
                    )}
                  />
                  <div className={cn(
                    "relative border rounded-full p-1 pl-6 flex items-center gap-4 transition-all group",
                    isDark ? "bg-[#0A0A0F]/80 backdrop-blur-xl border-white/10 hover:border-accent/40" : "bg-white border-slate-200 hover:border-accent/40 shadow-sm"
                  )}>
                    <span className={cn(
                      "text-sm font-bold uppercase tracking-[0.2em] transition-colors",
                      isDark ? "text-gray-300 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900"
                    )}>Launch Stashflow</span>
                    <div className="overflow-hidden rounded-full">
                      <ConnectButton label="Enter App" showBalance={false} />
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/dashboard" className="group pt-4">
                  <div className={cn(
                    "px-8 py-3.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all",
                    isDark ? "bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]" : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                  )}>
                    Go to Your Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Subtle Bottom Glow */}
      <div className={cn(
        "fixed bottom-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent to-transparent pointer-events-none transition-all duration-1000",
        isDark ? "via-accent/30" : "via-transparent"
      )} />
    </main>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  );
}
