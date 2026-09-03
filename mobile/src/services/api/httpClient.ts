import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "@/constants/api";
import { useAuthStore, persistAccessToken } from "@/store/auth";
import type { ApiEnvelope, ApiErrorBody } from "@/types/api";

export function isTimeoutError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error?.message ?? `Request failed (${status})`);
    this.code = body.error?.code ?? "UNKNOWN_ERROR";
    this.status = status;
    this.details = body.error?.details;
  }
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    await useAuthStore.getState().logout();
    return null;
  }

  const body = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
  if (!body.success || !body.data?.accessToken) {
    await useAuthStore.getState().logout();
    return null;
  }

  await persistAccessToken(body.data.accessToken);
  useAuthStore.setState({ refreshToken: body.data.refreshToken });
  if (body.data.refreshToken) {
    await import("expo-secure-store").then(({ default: SecureStore }) =>
      SecureStore.setItemAsync("loanapp.refresh_token", body.data.refreshToken),
    );
  }
  return body.data.accessToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  skipAuth?: boolean;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    idempotencyKey,
    skipAuth = false,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;

  const buildHeaders = (token?: string | null) => {
    const h: Record<string, string> = { ...headers };
    if (body !== undefined) h["Content-Type"] = "application/json";
    if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const doFetch = (token?: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

  let res = await doFetch(skipAuth ? null : useAuthStore.getState().accessToken);

  if (res.status === 401 && !skipAuth) {
    refreshing = refreshing ?? refreshAccessToken();
    const newToken = await refreshing;
    refreshing = null;
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  if (!res.ok) {
    let errorBody: ApiErrorBody = {
      success: false,
      error: { code: "UNKNOWN_ERROR", message: `Request failed (${res.status})` },
    };
    try {
      errorBody = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body; keep generic message
    }
    throw new ApiClientError(res.status, errorBody);
  }

  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!json.success) {
    throw new ApiClientError(res.status, {
      success: false,
      error: { code: "UNKNOWN_ERROR", message: "Unexpected response" },
    });
  }
  return json.data;
}

export function newIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}