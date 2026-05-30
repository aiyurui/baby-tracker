export interface ApiErrorResult {
  ok: false;
  status: number;
  error: string;
}

export interface ApiSuccessResult<T> {
  ok: true;
  status: number;
  data: T | null;
}

export type ApiResult<T> = ApiSuccessResult<T> | ApiErrorResult;

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackError: string
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, init);
    const body = await readJsonSafe<{ data?: T; error?: string }>(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: body?.error || fallbackError,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: body?.data ?? null,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: fallbackError,
    };
  }
}
