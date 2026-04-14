import { getVaults, GetVaultsParams, Vault } from './lifi';
import { CONFIG } from './config';

export type RiskTier = 'safe' | 'balanced' | 'degen';

const PREFERRED_SAFE_PROTOCOLS = ['morpho-v1', 'aave-v3', 'spark'];
const ETH_SYMBOLS = ['WETH', 'wstETH', 'rETH', 'ETH'];

export async function findBestVault(riskTier: RiskTier): Promise<Vault | null> {
  // Fetch a broad set of vaults, strictly filtered by chain if configured
  const fetchParams: GetVaultsParams = { limit: 100 };
  if (CONFIG.STRICT_BASE_MODE) {
    fetchParams.chains = [CONFIG.TARGET_CHAIN_ID];
  }
  
  const response = await getVaults(fetchParams);
  // LI.FI Earn API can return the array directly or inside a 'vaults' property
  const vaults = (Array.isArray(response) ? response : (response.vaults || response.data || [])) as Vault[];
  
  if (vaults.length === 0) {
    console.warn('No vaults returned from API');
    return null;
  }

  if (riskTier === 'safe') {
    const filtered = vaults.filter(v => 
      v.isTransactional === true &&
      (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
      v.tags?.includes('stablecoin') &&
      v.analytics?.tvl?.usd && Number(v.analytics.tvl.usd) > 1_000_000 && // Lowered from 10M
      v.analytics?.apy?.total != null
    ).sort((a,b) => Number(b.analytics.tvl.usd) - Number(a.analytics.tvl.usd));
    
    if (filtered[0]) return filtered[0];
  }

  if (riskTier === 'balanced') {
    const filtered = vaults.filter(v =>
      v.isTransactional === true &&
      (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
      v.underlyingTokens.some(t => CONFIG.GROWTH_TOKENS.includes(t.symbol)) &&
      v.analytics?.tvl?.usd && Number(v.analytics.tvl.usd) > 100_000 && // Lowered from 1M
      v.analytics?.apy?.total != null
    ).sort((a,b) => (b.analytics.apy.total || 0) - (a.analytics.apy.total || 0));
    
    if (filtered[0]) return filtered[0];
  }

  // DEGEN Tier or Fallback for others
  const degenFiltered = vaults.filter(v =>
    v.isTransactional === true &&
    (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
    v.analytics?.apy?.total != null
  ).sort((a,b) => (b.analytics.apy.total || 0) - (a.analytics.apy.total || 0));

  return degenFiltered[0] || degenFiltered[1] || vaults[0] || degenFiltered[0] || null;
}
