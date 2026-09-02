import { useCallback, useState } from "react";
import type { Paginated } from "@/types/api";

export function usePagination(params: Record<string, unknown> = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const reset = useCallback(() => setPage(1), []);

  const nextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const hasMore = (result: Paginated<unknown> | undefined) =>
    !!result && result.page < result.totalPages;

  return { page, setPage, reset, nextPage, search, setSearch, hasMore, query: { ...params, page, search } };
}