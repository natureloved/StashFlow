'use client';

export async function getTokenPrice(chain: number, tokenAddress: string) {
  if (tokenAddress === 'native') {
    // Standard native token mapping for DefiLlama
    tokenAddress = '0x0000000000000000000000000000000000000000';
  }
  
  const chainName = chain === 1 ? 'ethereum' : 
                    chain === 8453 ? 'base' : 
                    chain === 42161 ? 'arbitrum' : 
                    chain === 10 ? 'optimism' : 'ethereum';
                    
  try {
    const response = await fetch(`https://coins.llama.fi/prices/current/${chainName}:${tokenAddress}`);
    const data = await response.json();
    const priceKey = `${chainName}:${tokenAddress}`;
    return data.coins[priceKey]?.price || 0;
  } catch (error) {
    console.error('Failed to fetch price:', error);
    return 0;
  }
}
