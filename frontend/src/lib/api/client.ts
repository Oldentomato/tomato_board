import { handleAuthFailure } from "@/lib/api/authRedirect";
import { API_BASE_URL, API_PREFIX } from "@/lib/config/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiUrl() {
  return API_BASE_URL;
}

function toApiPath(path: string) {
  return path.startsWith(API_PREFIX) ? path : `${API_PREFIX}${path}`;
}

export function buildApiUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(toApiPath(path), `${API_BASE_URL}/`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params } = options;

  const response = await fetch(buildApiUrl(path, params), {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    const errorText = await response.text().catch(() => "Unauthorized");
    handleAuthFailure(401, errorText);
    throw new ApiError(401, errorText || "Unauthorized");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Request failed");
    handleAuthFailure(response.status, errorText);
    throw new ApiError(response.status, errorText || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
