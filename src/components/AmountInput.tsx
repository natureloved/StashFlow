'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onMax?: () => void;
  placeholder?: string;
  className?: string;
  usdMode?: boolean;
}

export function AmountInput({ 
  value, 
  onChange, 
  onMax, 
  placeholder = "0.00", 
  className,
  usdMode = true 
}: AmountInputProps) {
  const [isPressing, setIsPressing] = useState<'plus' | 'minus' | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const adjust = (amount: number) => {
    const current = Number(value) || 0;
    const newValue = Math.max(0, current + amount);
    onChange(newValue.toString());
  };

  const startPress = (type: 'plus' | 'minus') => {
    setIsPressing(type);
    startTimeRef.current = Date.now();
    
    // Initial click
    adjust(type === 'plus' ? 1 : -1);

    // Set interval for long press
    timerRef.current = setInterval(() => {
      const duration = Date.now() - startTimeRef.current;
      if (duration > 500) {
        adjust(type === 'plus' ? 5 : -5);
      }
    }, 200);
  };

  const endPress = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onMouseDown={() => startPress('minus')}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={() => startPress('minus')}
        onTouchEnd={endPress}
        className="w-8 h-8 rounded-full border border-[#1E1E2E] flex items-center justify-center text-[#00E5FF] hover:bg-[#00E5FF]/10 transition-colors flex-shrink-0"
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="relative flex-1 group">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#0A0A0F]/50 border border-border focus:border-[#00E5FF] text-white font-numeric text-2xl p-4 rounded-xl outline-none transition-all pr-20 text-center"
        />
        {onMax && (
          <button
            type="button"
            onClick={onMax}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-[#00E5FF]/10 text-[#00E5FF] text-[10px] font-bold hover:bg-[#00E5FF]/20 transition-colors"
          >
            MAX
          </button>
        )}
      </div>

      <button
        type="button"
        onMouseDown={() => startPress('plus')}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={() => startPress('plus')}
        onTouchEnd={endPress}
        className="w-8 h-8 rounded-full border border-[#1E1E2E] flex items-center justify-center text-[#00E5FF] hover:bg-[#00E5FF]/10 transition-colors flex-shrink-0"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
