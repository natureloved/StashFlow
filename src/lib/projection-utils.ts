'use client';

/**
 * Calculates the projected completion date for a goal.
 * @param currentAmount Current USD balance
 * @param targetAmount Target USD amount
 * @param apy Annual Percentage Yield (e.g., 0.12 for 12%)
 * @param weeklyContribution Future weekly savings amount in USD
 * @returns Date object of projected completion, or null if target is unreachable
 */
export const calculateGoalCompletionDate = (
  currentAmount: number,
  targetAmount: number,
  apy: number,
  weeklyContribution: number = 50
): Date | null => {
  if (currentAmount >= targetAmount) return new Date();
  if (weeklyContribution <= 0 && apy <= 0) return null;

  let balance = currentAmount;
  let currentDate = new Date();
  const maxYears = 50; // Safety cap
  let weeks = 0;

  // Weekly yield multiplier
  const weeklyYield = Math.pow(1 + apy, 1 / 52) - 1;

  while (balance < targetAmount && weeks < maxYears * 52) {
    // Add weekly yield
    balance += balance * weeklyYield;
    // Add weekly contribution
    balance += weeklyContribution;
    
    weeks++;
  }

  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + (weeks * 7));
  
  return weeks < maxYears * 52 ? completionDate : null;
};

export const formatCompletionDate = (date: Date | null): string => {
  if (!date) return 'a long time from now';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
