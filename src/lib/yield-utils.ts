'use client';

export const getYieldEquivalent = (mYield: number) => {
  if (mYield <= 0) return "your future financial freedom 🚀";
  
  // Randomizing within categories for variety
  const pick = (options: string[]) => options[Math.floor(Math.random() * options.length)];

  if (mYield < 0.1) return pick(["the start of something big 📈", "your first on-chain earnings ⚡", "a digital penny 🪙"]);
  if (mYield < 0.5) return pick(["a network fee offset ⛽", "your morning coffee ☕", "a tasty treat 🍬"]);
  if (mYield < 2) return pick(["a premium coffee ☕", "a bottle of spring water 💧", "a small savings boost 📈"]);
  if (mYield < 5) return pick(["a delicious bagel 🥯", "a premium mobile app 📱", "a bus ticket 🚌"]);
  if (mYield < 15) return pick(["your Spotify subscription 🎵", "a cinema ticket 🎬", "a hearty lunch 🍱"]);
  if (mYield < 30) return pick(["your Netflix plan 🎬", "a new book 📚", "a yoga class 🧘"]);
  if (mYield < 70) return pick(["your monthly internet bill 🌐", "a nice dinner out 🥂", "a new video game 🎮"]);
  if (mYield < 150) return pick(["your gym membership 💪", "a pair of sneakers 👟", "a weekend getaway fund 🏕️"]);
  if (mYield < 400) return pick(["your utilities & electricity ⚡", "a new smartphone 📱", "a designer jacket 🧥"]);
  if (mYield < 1000) return pick(["your grocery shopping for the month 🛒", "a round-trip flight ✈️", "a high-end laptop 💻"]);
  
  return pick(["your monthly rent payment 🏠", "a dream vacation 🏝️", "a major milestone reached 🏆"]);
};
