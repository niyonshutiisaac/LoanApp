export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

/** Clamps page/limit from a raw query so a client can never force an unbounded scan. */
export function parsePageParams(query: { page?: unknown; limit?: unknown }): PageParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

export function toPaginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
