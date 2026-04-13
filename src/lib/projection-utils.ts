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
  if (Number.isNaN(currentAmount) || Number.isNaN(targetAmount) || Number.isNaN(apy)) return null;
  if (currentAmount >= targetAmount) return new Date();
  if (weeklyContribution <= 0 && apy <= 0) return null;

  let balance = currentAmount;
  let weeks = 0;
  const maxWeeks = 52 * 50; // 50 years max

  const r = Math.pow(1 + apy, 1 / 52) - 1;

  while (balance < targetAmount && weeks < maxWeeks) {
    balance = (balance * (1 + r)) + weeklyContribution;
    weeks++;
  }

  const result = new Date();
  result.setDate(result.getDate() + (weeks * 7));
  return weeks < maxWeeks ? result : null;
};

export const formatCompletionDate = (date: Date | null): string => {
  if (!date) return 'a long time from now';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
