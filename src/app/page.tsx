'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Gradient Mesh Background */}
      <div className="absolute inset-0 -z-10 bg-[#0A0A0F]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00E5FF]/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00E5FF]/10 rounded-full blur-[150px] animate-pulse delay-1000" />
      </div>

      {/* Hero Content */}
      <div className="container mx-auto px-4 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-display font-extrabold mb-6 tracking-tight">
            Save with <span className="text-accent">purpose.</span><br />
            Earn while you wait.
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-body">
            Set a goal. We find the best vault. One tap deposits from any chain.
          </p>

          <div className="flex flex-col items-center justify-center gap-6">
            <div className="glow-cyan rounded-xl p-[1px] bg-gradient-to-r from-accent to-accent/50">
              <div className="bg-[#0A0A0F] rounded-[11px] overflow-hidden">
                <ConnectButton label="Launch Stashflow" showBalance={false} />
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-4 mt-12">
              <div className="px-4 py-2 bg-surface border border-border rounded-full text-sm font-medium">
                20+ Protocols
              </div>
              <div className="px-4 py-2 bg-surface border border-border rounded-full text-sm font-medium">
                60+ Chains
              </div>
              <div className="px-4 py-2 bg-surface border border-border rounded-full text-sm font-medium">
                One-Click Deposits
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Subtle Bottom Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    </main>
  );
}
