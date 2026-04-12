'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RiskPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5 text-accent group-hover:-translate-x-1 transition-transform" />
            <span className="font-display font-medium text-lg">Back to Landing</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-black font-display font-extrabold text-lg">S</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Stashflow</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-20 max-w-4xl">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-12"
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-black uppercase italic tracking-tight">Risk Disclosure</h1>
            <p className="text-gray-400 font-body text-lg leading-relaxed">
              Stashflow is an interface powered by LI.FI Earn. While we aim to make yield accessible, 
              participating in DeFi involves inherent risks. Please read the following carefully.
            </p>
          </div>

          <div className="grid gap-8">
            <section className="glass-card p-8 border-red-500/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold">Smart Contract Risk</h2>
              </div>
              <p className="text-gray-400 font-body leading-relaxed">
                All deposits are routed through external protocols (e.g., Aave, Morpho). Even though these protocols 
                are audited and battle-tested, smart contracts can contain undiscovered vulnerabilities or bugs that 
                could lead to the loss of your staked assets.
              </p>
            </section>

            <section className="glass-card p-8 border-accent/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold">No Financial Guarantees</h2>
              </div>
              <p className="text-gray-400 font-body leading-relaxed">
                Yield rates (APY) are dynamic and determined by market supply and demand. They are not fixed and 
                can fluctuate or decrease significantly over time. Stashflow does not guarantee any specific 
                return on your investment.
              </p>
            </section>

            <section className="glass-card p-8 border-secondary/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold">DYOR (Do Your Own Research)</h2>
              </div>
              <p className="text-gray-400 font-body leading-relaxed">
                You are solely responsible for your investment decisions. Users should only deposit funds they 
                are prepared to lose. Familiarize yourself with the risks of stablecoin de-pegging, liquidation 
                risks in lending protocols, and general blockchain security.
              </p>
            </section>
          </div>

          <div className="pt-12 border-t border-white/5 text-center">
             <p className="text-sm text-gray-600 font-body italic">
               Stashflow is a non-custodial interface. We never have access to your private keys or your funds.
             </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
