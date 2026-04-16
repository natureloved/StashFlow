'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquare, Code, Globe, RefreshCcw } from 'lucide-react';

import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const resetTooltips = () => {
    localStorage.removeItem('stashflow_seen_tooltips');
    window.location.reload();
  };

  return (
    <footer className={cn(
      "border-t py-12 transition-all",
      isDark ? "border-white/5 bg-[#0A0A0F]" : "border-slate-200 bg-slate-100/50"
    )}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-black font-display font-extrabold text-base">S</span>
              </div>
              <span className={cn(
                "font-display font-bold text-lg tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}>Stashflow</span>
            </div>
            <p className={cn("text-xs font-body", isDark ? "text-gray-500" : "text-slate-500")}>Save with purpose. Earn while you wait.</p>
          </div>

          <div className="flex items-center gap-8 text-xs text-gray-400 font-body">
            <a 
              href="https://docs.li.fi/earn/overview" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-accent transition-colors"
            >
              Documentation
            </a>
            <Link href="/risk" className="hover:text-accent transition-colors">Risk Policy</Link>
          </div>
        </div>
        
        <div className={cn("mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4", isDark ? "border-white/5" : "border-slate-100")}>
          <p className={cn("text-xs font-body", isDark ? "text-gray-600" : "text-slate-400")}>
            © 2026 Stashflow. Built with LI.FI Earn SDK. All rights reserved.
          </p>
          <div className={cn("flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold", isDark ? "text-gray-700" : "text-slate-300")}>
            Secure • On-chain • Non-custodial
          </div>
        </div>
      </div>
    </footer>
  );
}
