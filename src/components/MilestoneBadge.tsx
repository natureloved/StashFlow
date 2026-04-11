'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, Zap, Trophy, LucideIcon } from 'lucide-react';

interface Milestone {
  threshold: number;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const MILESTONES: Milestone[] = [
  { threshold: 100, label: 'Goal Unlocked! 🏆', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { threshold: 50, label: 'Halfway There 🔥', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { threshold: 25, label: 'Getting Started 🚀', icon: Star, color: 'text-bronze-400', bg: 'bg-orange-800/10' },
];

// Custom bronze color
const BronzeStar = (props: any) => <Star {...props} stroke="#CD7F32" fill="#CD7F32" />;

export function MilestoneBadge({ progress }: { progress: number }) {
  const milestone = MILESTONES.find(m => progress >= m.threshold);

  if (!milestone) return null;

  const Icon = milestone.icon;

  return (
    <Badge className={`${milestone.bg} ${milestone.color} border-none flex items-center gap-1.5 py-1 px-3 animate-bounce`}>
      <Icon className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{milestone.label}</span>
    </Badge>
  );
}
