import { useInfiniteQuery } from '@tanstack/react-query';

import type { ListParams, Paginator } from '@/api/types';
import { useSession } from '@/auth/session';

/**
 * Wraps a paginated endpoint as an infinite query and flattens pages.
 * The active company is part of the key so switching reloads the list.
 */
export function usePaginatedList<T>(
  baseKey: readonly unknown[],
  fetcher: (params: ListParams) => Promise<Paginator<T>>,
  params: ListParams,
  options: { enabled?: boolean } = {},
) {
  const { activeCompanyId } = useSession();

  const query = useInfiniteQuery({
    queryKey: [...baseKey, activeCompanyId, params],
    queryFn: ({ pageParam }) => fetcher({ ...params, page: pageParam }),
    initialPageParam: 1,
    enabled: options.enabled ?? true,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  return {
    items,
    total,
    firstPage: query.data?.pages[0],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    isRefetching: query.isRefetching && !query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
