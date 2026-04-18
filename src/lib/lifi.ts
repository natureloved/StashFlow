import { CONFIG } from './config';
const LIFI_PROXY_URL = '/api/lifi';

const getHeaders = () => {
  return {
    'accept': 'application/json',
  };
};

export interface GetVaultsParams {
  sortBy?: 'apy' | 'tvl';
  limit?: number;
  chains?: number[];
  integrator?: string;
}

export interface Vault {
  address: string;
  network: string;
  chainId: number;
  slug: string;
  name: string;
  protocol: {
    name: string;
    logoUri?: string;
    url: string;
  };
  underlyingTokens: Array<{
    address: string;
    symbol: string;
    decimals: number;
    weight?: number;
  }>;
  analytics: {
    apy: {
      base: number;
      reward: number | null;
      total: number;
    };
    apy1d: number | null;
    apy1dUsd?: number | null;
    apy7d: number | null;
    apy7dUsd?: number | null;
    apy30d: number | null;
    apy30dUsd?: number | null;
    tvl: {
      usd: string;
      native?: string;
    };
  };
  isTransactional: boolean;
  isRedeemable: boolean;
  tags?: string[];
}

export async function getVaults(params: GetVaultsParams = {}) {
  const query = new URLSearchParams();
  
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.limit) {
    query.append('limit', params.limit.toString());
  } else {
    query.append('limit', '100');
  }
  if (params.integrator) query.append('integrator', params.integrator);
  if (params.chains && params.chains.length > 0) {
    params.chains.forEach(id => query.append('chains', id.toString()));
  }

  const response = await fetch(`${LIFI_PROXY_URL}/earn/vaults?${query.toString()}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error('LIFI API Error Body:', errorBody);
    throw new Error(`Earn API Error: ${response.statusText}${errorBody.message ? ` - ${errorBody.message}` : ''}`);
  }

  return response.json();
}

export async function getVaultDetails(chainId: number, address: string) {
  try {
    const response = await fetch(`${LIFI_PROXY_URL}/earn/vaults/${chainId}/${address}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('LIFI API Error Body:', errorBody);
      throw new Error(`Earn API Error: ${response.statusText}${errorBody.message ? ` - ${errorBody.message}` : ''}`);
    }

    return response.json();
  } catch (error: any) {
    if (error.message?.includes('429')) {
      console.warn('Rate limit hit for vault details, using cached/empty data');
      return {};
    }
    throw error;
  }
}

export async function getUserPositions(userAddress: string) {
  try {
    const response = await fetch(`${LIFI_PROXY_URL}/earn/portfolio/${userAddress}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('LIFI API Error Body:', errorBody);
      throw new Error(`Earn API Error: ${response.statusText}${errorBody.message ? ` - ${errorBody.message}` : ''}`);
    }

    return response.json();
  } catch (error: any) {
    if (error.message?.includes('429')) {
      console.warn('Rate limit hit for positions, returning empty list');
      return { positions: [] };
    }
    throw error;
  }
}

export interface GetQuoteParams {
  fromChain: string | number;
  toChain: string | number;
  fromToken: string;
  toToken: string; 
  fromAddress: string;
  toAddress: string;
  fromAmount: string; // Smallest units
  skipSimulation?: boolean;
  integrator?: string;
  isEarn?: boolean;
}

export async function getQuote(params: GetQuoteParams) {
  const { isEarn, ...rest } = params;
  const query = new URLSearchParams();
  
  // Use 'stashflow' as default integrator
  const quoteParams = {
    integrator: 'stashflow',
    ...rest,
  };

  Object.entries(quoteParams).forEach(([key, value]) => {
    if (value !== undefined) query.append(key, value.toString());
  });

  // If isEarn is true, we route through our Earn proxy
  const endpoint = isEarn ? `${LIFI_PROXY_URL}/earn/quote` : `/api/quote`;

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Quote API Error: ${response.statusText}`);
  }

  return response.json();
}


export async function getWalletBalances(userAddress: string) {
  // Common chains to scan in multi-chain mode
  const chains = [1, 8453, 42161, 10, 137]; 
  const query = new URLSearchParams();
  query.append('address', userAddress);
  query.append('chains', chains.join(','));

  // Point to our NEW stabilized route
  const response = await fetch(`/api/lifi/balances?${query.toString()}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`Balances API Error: ${response.statusText}`);
  }

  return response.json();
}
