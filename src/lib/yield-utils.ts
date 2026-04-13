'use client';

export const getYieldEquivalent = (mYield: number) => {
  const all = getAllYieldEquivalents(mYield);
  return all[Math.floor(Math.random() * all.length)];
};

export const getAllYieldEquivalents = (mYield: number): string[] => {
  if (mYield <= 0) return ["your future financial freedom 🚀"];
  
  if (mYield < 0.1) return ["a digital penny 🪙", "your first on-chain earnings ⚡", "the start of something big 📈"];
  if (mYield < 0.5) return ["a network fee offset ⛽", "your morning coffee ☕", "a tasty treat 🍬"];
  if (mYield < 2) return ["a premium coffee ☕", "a bottle of spring water 💧", "a small savings boost 📈"];
  if (mYield < 5) return ["a delicious bagel 🥯", "a premium mobile app 📱", "a bus ticket 🚌", "a pack of trading cards 🃏"];
  if (mYield < 15) return ["your Spotify subscription 🎵", "a cinema ticket 🎬", "a hearty lunch 🍱", "a digital book 📖"];
  if (mYield < 30) return ["your Netflix plan 🎬", "a new physical book 📚", "a yoga class 🧘", "a gaming subscription 🎮"];
  if (mYield < 70) return ["your monthly internet bill 🌐", "a nice dinner out 🥂", "a new video game 🎮", "a professional headshot 📸"];
  if (mYield < 150) return ["your gym membership 💪", "a pair of sneakers 👟", "a weekend getaway fund 🏕️", "a concert ticket 🎫"];
  if (mYield < 400) return ["your utilities & electricity ⚡", "a new smartphone 📱", "a designer jacket 🧥", "a professional course 🎓"];
  if (mYield < 1000) return ["your grocery shopping 🛒", "a round-trip flight ✈️", "a high-end laptop 💻", "a premium mountain bike 🚲"];
  
  return ["your monthly rent payment 🏠", "a dream vacation 🏝️", "a major milestone reached 🏆", "a charity donation 💡"];
};
