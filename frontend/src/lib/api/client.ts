import { handleAuthFailure } from "@/lib/api/authRedirect";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, API_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params } = options;

  const response = await fetch(buildUrl(path, params), {
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

export function getApiUrl() {
  return API_URL;
}
