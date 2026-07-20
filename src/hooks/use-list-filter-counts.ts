import { useQueries } from '@tanstack/react-query';

import type { ListParams, Paginator } from '@/api/types';
import { useSession } from '@/auth/session';

type Options<T> = {
  baseKey: readonly unknown[];
  fetcher: (params: ListParams) => Promise<Paginator<T>>;
  params?: ListParams;
  values: readonly string[];
  filterKey?: string;
};

/** Fetch the total for each visible list filter so segmented counters stay accurate. */
export function useListFilterCounts<T>({
  baseKey,
  fetcher,
  params = {},
  values,
  filterKey = 'status',
}: Options<T>) {
  const { activeCompanyId } = useSession();
  const queries = useQueries({
    queries: values.map((value) => ({
      queryKey: [...baseKey, 'filter-count', activeCompanyId, params, filterKey, value],
      queryFn: () => fetcher({ ...params, [filterKey]: value || undefined, page: 1 }),
      staleTime: 30_000,
    })),
  });

  return Object.fromEntries(
    values.map((value, index) => [value, queries[index].data?.meta.total]),
  ) as Record<string, number | undefined>;
}
