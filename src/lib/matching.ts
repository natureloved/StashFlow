import { getVaults, GetVaultsParams, Vault } from './lifi';
import { CONFIG } from './config';

export type RiskTier = 'safe' | 'balanced' | 'degen';

const PREFERRED_SAFE_PROTOCOLS = ['morpho-v1', 'aave-v3', 'spark'];
const ETH_SYMBOLS = ['WETH', 'wstETH', 'rETH', 'ETH'];

/**
 * findBestVault
 * Strictly pulls real-time vault data from the LI.FI Earn API.
 * No hardcoded fallbacks are used to ensure data integrity and 
 * accurate APY representation.
 */
export async function findBestVault(riskTier: RiskTier): Promise<Vault | null> {
  const fetchParams: GetVaultsParams = {
    limit: 100,
    integrator: 'stashflow',
    // We can filter by chains here if the user prefers a specific network
    // chains: [8453, 42161, 1], 
  };

  try {
    const response = await getVaults(fetchParams);
    
    // Standard extraction from LI.FI response
    const vaults: Vault[] = Array.isArray(response) 
      ? response 
      : (response as any).vaults || (response as any).data || [];
    
    if (!vaults || vaults.length === 0) {
      console.warn('No vaults returned from LI.FI API');
      return null;
    }

    // Filter for transactional vaults with valid APY data
    const validVaults = vaults.filter((v: any) =>
      v.isTransactional === true &&
      v.analytics?.apy?.total != null &&
      v.analytics?.apy?.total > 0
    );

    if (validVaults.length === 0) return null;

    // TIER 1: SAFE
    // Strategy: Highest TVL among stable-ish assets or top-tier protocols
    if (riskTier === 'safe') {
      const filtered = validVaults.sort((a, b) => 
        Number(b.analytics?.tvl?.usd || 0) - Number(a.analytics?.tvl?.usd || 0)
      );
      return filtered[0] || null;
    }

    // TIER 2: BALANCED
    // Strategy: Decent TVL with competitive APY
    if (riskTier === 'balanced') {
      const filtered = validVaults
        .filter(v => Number(v.analytics?.tvl?.usd || 0) > 1000000) // At least $1M TVL for balance
        .sort((a, b) => (b.analytics?.apy?.total || 0) - (a.analytics?.apy?.total || 0));
      
      return filtered[0] || validVaults[0];
    }

    // TIER 3: DEGEN
    // Strategy: Absolute Max APY, regardless of TVL or Protocol status
    if (riskTier === 'degen') {
      const filtered = [...validVaults].sort((a, b) => 
        (b.analytics?.apy?.total || 0) - (a.analytics?.apy?.total || 0)
      );
      return filtered[0] || null;
    }

    return validVaults[0] || null;
  } catch (error) {
    console.error('Strict LI.FI vault lookup failed:', error);
    // We explicitly do NOT return fallbacks here as per USER request.
    // The calling component handles the null result.
    throw error;
  }
}
