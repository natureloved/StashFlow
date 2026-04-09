import { getVaults, GetVaultsParams, Vault } from './lifi';

export type RiskTier = 'safe' | 'balanced' | 'degen';

const PREFERRED_SAFE_CHAINS = [8453, 1, 42161]; // Base, Ethereum, Arbitrum
const PREFERRED_SAFE_PROTOCOLS = ['morpho-v1', 'aave-v3', 'spark'];
const ETH_SYMBOLS = ['WETH', 'wstETH', 'rETH', 'ETH'];

export async function findBestVault(riskTier: RiskTier): Promise<Vault | null> {
  let params: GetVaultsParams = {
    limit: 100,
  };

  if (riskTier === 'safe') {
    params = {
      ...params,
      tags: 'stablecoin',
      minTvlUsd: 100000000,
      sortBy: 'tvl',
    };
  } else if (riskTier === 'balanced') {
    params = {
      ...params,
      sortBy: 'apy',
      minTvlUsd: 50000000,
    };
  } else {
    params = {
      ...params,
      sortBy: 'apy',
    };
  }

  const { data: vaults } = await getVaults(params);
  
  if (!vaults || vaults.length === 0) return null;

  // common filter: isTransactional must be true
  const transactionalVaults = (vaults as Vault[]).filter(v => v.isTransactional);

  if (riskTier === 'safe') {
    // Pick the highest TVL vault that is ALSO in a preferred chain/protocol if possible
    // The API already sorted by TVL, so the first one is highest TVL.
    const preferred = transactionalVaults.find(v => 
      PREFERRED_SAFE_CHAINS.includes(v.chainId) && 
      PREFERRED_SAFE_PROTOCOLS.some(p => v.protocol.name.toLowerCase().includes(p))
    );
    return preferred || transactionalVaults[0] || null;
  }

  if (riskTier === 'balanced') {
    // Filter for ETH-correlated underlying tokens
    const ethVaults = transactionalVaults.filter(v => 
      v.underlyingTokens.some(t => ETH_SYMBOLS.includes(t.symbol))
    );
    return ethVaults[0] || transactionalVaults[0] || null;
  }

  // Degen: Highest total APY (already sorted by apy)
  return transactionalVaults[0] || null;
}
