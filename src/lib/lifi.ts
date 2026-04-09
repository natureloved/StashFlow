const LIFI_EARN_BASE_URL = 'https://earn.li.fi/v1/earn';
const LIFI_COMPOSER_BASE_URL = 'https://li.quest/v1';

const getHeaders = () => {
  const apiKey = process.env.NEXT_PUBLIC_LIFI_API_KEY;
  return {
    'x-lifi-api-key': apiKey || '',
    'accept': 'application/json',
  };
};

export interface GetVaultsParams {
  chainId?: number;
  asset?: string;
  protocol?: string;
  minTvlUsd?: number;
  sortBy?: 'apy' | 'tvl';
  limit?: number;
  cursor?: string;
  tags?: string;
}

export async function getVaults(params: GetVaultsParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.append(key, value.toString());
  });

  const response = await fetch(`${LIFI_EARN_BASE_URL}/vaults?${query.toString()}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Earn API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function getVaultDetails(chainId: number, address: string) {
  const response = await fetch(`${LIFI_EARN_BASE_URL}/vaults/${chainId}/${address}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Earn API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function getUserPositions(userAddress: string) {
  const response = await fetch(`${LIFI_EARN_BASE_URL}/portfolio/${userAddress}/positions`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Earn API Error: ${response.statusText}`);
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
}

export async function getQuote(params: GetQuoteParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.append(key, value.toString());
  });

  const response = await fetch(`${LIFI_COMPOSER_BASE_URL}/quote?${query.toString()}`, {
    headers: {
      ...getHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Composer API Error: ${response.statusText}`);
  }

  return response.json();
}
