import { getVaults, GetVaultsParams, Vault } from './lifi';

export type RiskTier = 'safe' | 'balanced' | 'degen';

const PREFERRED_SAFE_CHAINS = [8453, 1, 42161]; // Base, Ethereum, Arbitrum
const PREFERRED_SAFE_PROTOCOLS = ['morpho-v1', 'aave-v3', 'spark'];
const ETH_SYMBOLS = ['WETH', 'wstETH', 'rETH', 'ETH'];

export async function findBestVault(riskTier: RiskTier): Promise<Vault | null> {
  // Fetch a broad set of vaults with no server-side filters except limit
  const { data: vaultsRaw } = await getVaults({ limit: 100 });
  const vaults = (vaultsRaw || []) as Vault[];
  
  if (vaults.length === 0) return null;

  if (riskTier === 'safe') {
    const filtered = vaults.filter(v => 
      v.isTransactional === true &&
      v.tags?.includes('stablecoin') &&
      v.analytics?.tvl?.usd && Number(v.analytics.tvl.usd) > 100_000_000 &&
      v.analytics?.apy?.total != null
    ).sort((a,b) => Number(b.analytics.tvl.usd) - Number(a.analytics.tvl.usd));
    
    return filtered[0] || null;
  }

  if (riskTier === 'balanced') {
    const filtered = vaults.filter(v =>
      v.isTransactional === true &&
      v.underlyingTokens.some(t => ETH_SYMBOLS.includes(t.symbol)) &&
      v.analytics?.tvl?.usd && Number(v.analytics.tvl.usd) > 50_000_000 &&
      v.analytics?.apy?.total != null
    ).sort((a,b) => (b.analytics.apy.total || 0) - (a.analytics.apy.total || 0));
    
    return filtered[0] || null;
  }

  // DEGEN Tier
  const filtered = vaults.filter(v =>
    v.isTransactional === true &&
    v.analytics?.apy?.total != null
  ).sort((a,b) => (b.analytics.apy.total || 0) - (a.analytics.apy.total || 0));

  return filtered[0] || null;
}
