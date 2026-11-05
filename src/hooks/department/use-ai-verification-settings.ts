'use client';

import { useQuery } from '@tanstack/react-query';
import { useDepartmentContext } from '@/context/deparment';

export type VerificationMode = 'two_factor' | 'autonomous' | 'manual';
export interface AiVerificationConfiguration {
  staffId: string;
  aiVerificationMode: VerificationMode;
  aiConfidenceThreshold: number;
}
export const aiVerificationSettingsKey = (userId?: string) => ['department-ai-verification', userId] as const;

export function useAiVerificationSettings() {
  const { userId } = useDepartmentContext();
  return useQuery<AiVerificationConfiguration>({
    queryKey: aiVerificationSettingsKey(userId),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/department/settings/ai-verification?view=configuration', { signal, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.configuration) throw new Error(result.error || 'Could not load AI settings.');
      return result.configuration;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
