/**
 * Stashflow Central Configuration
 * Used to enforce network restrictions (e.g., Base-only for hackathons)
 * and feature toggles.
 */

export const CONFIG = {
  // Set to true to hide all non-Base chains and assets
  STRICT_BASE_MODE: true,
  
  // The primary chain for everything (Goal Matching, Portfolio Detection)
  TARGET_CHAIN_ID: 8453, // Base
  
  // Default tokens for goal suggestions
  SAFE_TOKENS: ['USDC', 'USDT', 'DAI'],
  GROWTH_TOKENS: ['ETH', 'WETH', 'cbETH', 'wstETH'],
  
  // Feature Toggles
  ENABLE_CLOUD_SYNC: true, // Set to true to use Supabase
};
