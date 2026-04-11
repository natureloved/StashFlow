'use client';

import { useState, useEffect } from 'react';

export function useEducationTooltip(id: string) {
  const [seen, setSeen] = useState(true);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const seenSet = JSON.parse(
      localStorage.getItem('stashflow_seen_tooltips') || '[]'
    );
    if (!seenSet.includes(id)) {
      setSeen(false);
    }
  }, [id]);

  const markSeen = () => {
    if (typeof window === 'undefined') return;

    const seenSet = JSON.parse(
      localStorage.getItem('stashflow_seen_tooltips') || '[]'
    );
    if (!seenSet.includes(id)) {
      localStorage.setItem(
        'stashflow_seen_tooltips',
        JSON.stringify([...seenSet, id])
      );
    }
    setSeen(true);
  };

  return { seen, markSeen };
}
