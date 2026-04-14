/**
 * Stashflow Central Configuration
 * Used to enforce network restrictions (e.g., Base-only for hackathons)
 * and feature toggles.
 */

export const CONFIG = {
  // Default tokens for goal suggestions
  SAFE_TOKENS: ['USDC', 'USDT', 'DAI'],
  GROWTH_TOKENS: ['ETH', 'WETH', 'cbETH', 'wstETH'],
  
  // Feature Toggles
  ENABLE_CLOUD_SYNC: true, // Set to true to use Supabase
};
