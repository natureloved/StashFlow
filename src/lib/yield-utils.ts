'use client';

export const getYieldEquivalent = (mYield: number) => {
  if (mYield <= 0) return "your future financial freedom 🚀";
  
  // Randomizing within categories for variety
  const pick = (options: string[]) => options[Math.floor(Math.random() * options.length)];

  if (mYield < 0.1) return pick(["a lucky penny on the street 🪙", "the start of something big 📈", "your first on-chain earnings ⚡"]);
  if (mYield < 0.5) return pick(["your first crypto snack 🍬", "a set of digital stickers 🎨", "a small transaction fee ⛽"]);
  if (mYield < 2) return pick(["your morning coffee ☕", "a tasty chocolate bar 🍫", "a song on iTunes 🎵"]);
  if (mYield < 5) return pick(["a delicious bagel 🥯", "a premium mobile app 📱", "a bus ticket 🚌"]);
  if (mYield < 15) return pick(["your Spotify subscription 🎵", "a cinema ticket 🎬", "a hearty lunch 🍱"]);
  if (mYield < 30) return pick(["your Netflix plan 🎬", "a new book 📚", "a yoga class 🧘"]);
  if (mYield < 70) return pick(["your monthly internet bill 🌐", "a nice dinner out 🥂", "a new video game 🎮"]);
  if (mYield < 150) return pick(["your gym membership 💪", "a pair of sneakers 👟", "a weekend getaway fund 🏕️"]);
  if (mYield < 400) return pick(["your utilities & electricity ⚡", "a new smartphone 📱", "a designer jacket 🧥"]);
  if (mYield < 1000) return pick(["your grocery shopping for the month 🛒", "a round-trip flight ✈️", "a high-end laptop 💻"]);
  
  return pick(["your monthly rent payment 🏠", "a dream vacation 🏝️", "a major milestone reached 🏆"]);
};
 Elias
