'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useTheme } from '@/components/ThemeProvider';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isPressing, setIsPressing] = useState<'plus' | 'minus' | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const adjust = (amount: number) => {
    const current = Number(value) || 0;
    const newValue = Math.max(0, current + amount);
    onChange(newValue.toString());
  };

  const startPress = (type: 'plus' | 'minus', e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e) {
      // Prevent phantom mouse events on mobile
      e.preventDefault();
    }
    
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
        onMouseDown={(e) => startPress('minus', e)}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={(e) => startPress('minus', e)}
        onTouchEnd={endPress}
        className={cn(
          "w-8 h-8 rounded-full border flex items-center justify-center transition-colors flex-shrink-0",
          isDark 
            ? "border-white/10 text-accent hover:bg-accent/10" 
            : "border-slate-200 text-slate-900 hover:bg-slate-100 shadow-sm"
        )}
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="relative flex-1 group">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          placeholder={placeholder}
          className={cn(
            "w-full border focus:border-accent font-numeric text-2xl p-4 rounded-xl outline-none transition-all pr-20 text-center",
            isDark 
              ? "bg-[#0A0A0F]/50 border-white/5 text-white" 
              : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
          )}
        />
        {onMax && (
          <button
            type="button"
            onClick={onMax}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-accent/10 text-accent text-[10px] font-bold hover:bg-accent/20 transition-colors"
          >
            MAX
          </button>
        )}
      </div>

      <button
        type="button"
        onMouseDown={(e) => startPress('plus', e)}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={(e) => startPress('plus', e)}
        onTouchEnd={endPress}
        className={cn(
          "w-8 h-8 rounded-full border flex items-center justify-center transition-colors flex-shrink-0",
          isDark 
            ? "border-white/10 text-accent hover:bg-accent/10" 
            : "border-slate-200 text-slate-900 hover:bg-slate-100 shadow-sm"
        )}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
