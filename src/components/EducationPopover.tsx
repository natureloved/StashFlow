'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEducationTooltip } from '@/hooks/useEducationTooltip';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

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
    if (!seen) {
      setIsOpen(true);
    }
  }, [seen]);

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
      <span 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-help border-b border-dotted border-accent hover:border-solid transition-all text-inherit"
      >
        {term}
      </span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-3 z-[100] w-[calc(100vw-48px)] sm:w-[280px] bg-[#111118] border border-[#1E1E2E] rounded-xl shadow-2xl p-3.5 sm:p-4 md:p-5"
          >
            {/* Arrow - Adjusted to bottom and responsive positioning */}
            <div className="absolute -bottom-1.5 left-4 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-[#111118] border-r border-b border-[#1E1E2E] rotate-45" />
            
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
                <div className="text-[10px] text-gray-600 uppercase font-bold text-center">
                  Ok ✓
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
