'use client';

export const getYieldEquivalent = (mYield: number) => {
  if (mYield <= 0) return "your future financial freedom 🚀";
  if (mYield < 1) return "your first crypto snack 🍬";
  if (mYield < 5) return "your morning coffee ☕";
  if (mYield < 15) return "your Spotify subscription 🎵";
  if (mYield < 30) return "your Netflix plan 🎬";
  if (mYield < 70) return "your monthly internet bill 🌐";
  if (mYield < 150) return "your gym membership 💪";
  if (mYield < 400) return "your utilities & electricity ⚡";
  if (mYield < 1000) return "your grocery shopping 🛒";
  return "your monthly rent payment 🏠";
};
