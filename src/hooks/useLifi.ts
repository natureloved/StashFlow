import { useQuery } from '@tanstack/react-query';
import { getVaults, getVaultDetails, getUserPositions, GetVaultsParams } from '@/lib/lifi';

export function useVaults(params: GetVaultsParams = {}) {
  return useQuery({
    queryKey: ['vaults', params],
    queryFn: () => getVaults(params),
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData,
  });
}

export function useVaultDetails(chainId?: number, address?: string) {
  return useQuery({
    queryKey: ['vault-details', chainId, address],
    queryFn: () => getVaultDetails(chainId!, address!),
    enabled: !!chainId && !!address,
    staleTime: 5 * 60 * 1000,
    retry: false, // vault 404s are permanent — don't spam retries
  });
}

export function usePortfolio(address?: string) {
  return useQuery({
    queryKey: ['portfolio', address],
    queryFn: () => getUserPositions(address!),
    enabled: !!address,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
