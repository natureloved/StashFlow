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
  if (params.chains && params.chains.length > 0) {
    params.chains.forEach(id => query.append('chains', id.toString()));
  }
  query.append('limit', (params.limit || 100).toString());

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
  const response = await fetch(`${LIFI_PROXY_URL}/earn/vaults/${chainId}/${address}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error('LIFI API Error Body:', errorBody);
    throw new Error(`Earn API Error: ${response.statusText}${errorBody.message ? ` - ${errorBody.message}` : ''}`);
  }

  return response.json();
}

export async function getUserPositions(userAddress: string) {
  const response = await fetch(`${LIFI_PROXY_URL}/earn/portfolio/${userAddress}/positions`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error('LIFI API Error Body:', errorBody);
    throw new Error(`Earn API Error: ${response.statusText}${errorBody.message ? ` - ${errorBody.message}` : ''}`);
  }

  return response.json();
}

export interface GetQuoteParams {
  fromChain: string | number;
  toChain: string | number;
  fromToken: string;
  toToken: string; // The vault address
  fromAddress: string;
  toAddress: string;
  fromAmount: string; // Smallest units
  skipSimulation?: boolean;
}

export async function getQuote(params: GetQuoteParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.append(key, value.toString());
  });

  const response = await fetch(`/api/quote?${query.toString()}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Composer API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function getWalletBalances(userAddress: string) {
  // Common chains to scan
  const chains = CONFIG.STRICT_BASE_MODE ? [CONFIG.TARGET_CHAIN_ID] : [1, 8453, 42161, 10, 137]; 
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
