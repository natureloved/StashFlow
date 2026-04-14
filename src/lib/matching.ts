import { getVaults, GetVaultsParams, Vault } from './lifi';
import { CONFIG } from './config';

export type RiskTier = 'safe' | 'balanced' | 'degen';

const PREFERRED_SAFE_PROTOCOLS = ['morpho-v1', 'aave-v3', 'spark'];
const ETH_SYMBOLS = ['WETH', 'wstETH', 'rETH', 'ETH'];

export async function findBestVault(riskTier: RiskTier): Promise<Vault | null> {
  // Fetch a broad set of vaults, strictly filtered by chain if configured
  const fetchParams: GetVaultsParams = {
    limit: 100,
    integrator: 'stashflow',
  };

  try {
    const response = await getVaults(fetchParams);
    // Standard extraction from LI.FI response
    const vaults = Array.isArray(response) ? response : (response as any).vaults || (response as any).data || [];
    
    if (!vaults || vaults.length === 0) return null;

    // Filter and sort by TVL for 'safe' tier
    if (riskTier === 'safe') {
      const filtered = vaults.filter((v: any) =>
        v.isTransactional === true &&
        (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
        v.analytics?.apy?.total != null
      ).sort((a: any, b: any) => Number(b.analytics?.tvl?.usd || 0) - Number(a.analytics?.tvl?.usd || 0));
      
      return filtered[0] || null;
    }

    // Filter and sort by APY for 'balanced' tier
    if (riskTier === 'balanced') {
      const filtered = vaults.filter((v: any) =>
        v.isTransactional === true &&
        (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
        v.analytics?.apy?.total != null
      ).sort((a: any, b: any) => (b.analytics?.apy?.total || 0) - (a.analytics?.apy?.total || 0));
      
      return filtered[0] || null;
    }

    // DEGEN Tier: Max APY
    const filtered = vaults.filter((v: any) =>
      v.isTransactional === true &&
      (CONFIG.STRICT_BASE_MODE ? v.chainId === CONFIG.TARGET_CHAIN_ID : true) &&
      v.analytics?.apy?.total != null
    ).sort((a: any, b: any) => (b.analytics?.apy?.total || 0) - (a.analytics?.apy?.total || 0));

    return filtered[0] || vaults[0] || null;
  } catch (error) {
    console.error('findBestVault error:', error);
    return null;
  }
}
