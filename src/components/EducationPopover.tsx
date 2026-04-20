'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEducationTooltip } from '@/hooks/useEducationTooltip';
import { Button } from '@/components/ui/button';
import { Check, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EducationPopoverProps {
  id: string;
  term: React.ReactNode;
  children: React.ReactNode;
}

export function EducationPopover({ id, term, children }: EducationPopoverProps) {
  const { seen, markSeen } = useEducationTooltip(id);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (seen) setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [seen]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 cursor-help group"
      >
        <span className="border-b border-dotted border-accent/40 group-hover:border-accent group-hover:text-accent transition-all text-inherit">
          {term}
        </span>
        <HelpCircle className={cn(
          "w-3.5 h-3.5 transition-all",
          isOpen ? "text-accent fill-accent/20" : "text-gray-500 group-hover:text-accent"
        )} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-0 bottom-full mb-3 z-[100] w-[calc(100vw-48px)] sm:w-[280px] bg-[#111118] border border-[#1E1E2E] rounded-xl shadow-2xl p-4 md:p-5"
          >
            {/* Arrow - positioned at bottom left */}
            <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-[#111118] border-r border-b border-[#1E1E2E] rotate-45" />
            
            <div className="relative z-10">
              <div className="text-sm text-gray-300 font-body leading-relaxed mb-4">
                {children}
              </div>
              
              {!seen ? (
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    markSeen();
                    setIsOpen(false);
                  }}
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-accent hover:text-accent/80 hover:bg-accent/5 font-bold h-8 p-0"
                >
                  Got it <Check className="w-3 h-3 ml-1" />
                </Button>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="w-full text-xs text-accent hover:text-accent/80 uppercase font-black tracking-widest text-center py-2.5 bg-accent/5 rounded-lg border border-accent/10 transition-all hover:bg-accent/10"
                >
                  OK ✓
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
