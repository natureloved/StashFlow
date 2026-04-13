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
  
  const { data: vaultsRaw } = await getVaults(fetchParams);
  const vaults = (vaultsRaw || []) as Vault[];
  
  if (vaults.length === 0) return null;

  if (riskTier === 'safe') {
    const filtered = vaults.filter(v => 
      v.isTransactional === true &&
      (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
      v.tags?.includes('stablecoin') &&
      v.analytics?.tvl?.usd && Number(v.analytics.tvl.usd) > 10_000_000 &&
      v.analytics?.apy?.total != null
    ).sort((a,b) => Number(b.analytics.tvl.usd) - Number(a.analytics.tvl.usd));
    
    return filtered[0] || null;
  }

  if (riskTier === 'balanced') {
    const filtered = vaults.filter(v =>
      v.isTransactional === true &&
      (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
      v.underlyingTokens.some(t => CONFIG.GROWTH_TOKENS.includes(t.symbol)) &&
      v.analytics?.tvl?.usd && Number(v.analytics.tvl.usd) > 1_000_000 &&
      v.analytics?.apy?.total != null
    ).sort((a,b) => (b.analytics.apy.total || 0) - (a.analytics.apy.total || 0));
    
    return filtered[0] || null;
  }

  // DEGEN Tier
  const filtered = vaults.filter(v =>
    v.isTransactional === true &&
    (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
    v.analytics?.apy?.total != null
  ).sort((a,b) => (b.analytics.apy.total || 0) - (a.analytics.apy.total || 0));

  return filtered[0] || null;
}
