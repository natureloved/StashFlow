'use client';

import * as React from 'react';
import { MessageSquare, Code, Globe, RefreshCcw } from 'lucide-react';

export function Footer() {
  const resetTooltips = () => {
    localStorage.removeItem('stashflow_seen_tooltips');
    window.location.reload();
  };

  return (
    <footer className="border-t border-border bg-surface/30 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-black font-display font-extrabold text-base">S</span>
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-white">Stashflow</span>
            </div>
            <p className="text-xs text-gray-500 font-body">Save with purpose. Earn while you wait.</p>
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
        
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600 font-body">
            © 2026 Stashflow. Built with LI.FI Earn SDK. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-[10px] text-gray-700 uppercase tracking-widest font-bold">
            Secure • On-chain • Non-custodial
          </div>
        </div>
      </div>
    </footer>
  );
}
