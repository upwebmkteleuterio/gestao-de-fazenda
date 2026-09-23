import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import type { DashboardSummary } from '@/services/dashboardService';

export const useDashboard = () => {
  const query = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardService.getSummary,
  });

  return {
    summary: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
