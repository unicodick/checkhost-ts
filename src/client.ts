import { CheckHostError } from "./types.js";

export const BASE_URL = "https://check-host.net";

export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

function createRequestSignal(options?: RequestOptions): {
  signal: AbortSignal | undefined;
  cleanup: () => void;
} {
  if (options?.timeoutMs === undefined) {
    return { signal: options?.signal, cleanup: () => {} };
  }

  if (
    !Number.isInteger(options.timeoutMs) ||
    options.timeoutMs <= 0 ||
    options.timeoutMs > 2_147_483_647
  ) {
    throw new CheckHostError("timeoutMs must be an integer between 1 and 2147483647", 0);
  }

  const controller = new AbortController();
  const abortFromParent = () => controller.abort(options.signal?.reason);

  if (options.signal?.aborted) {
    abortFromParent();
  } else {
    options.signal?.addEventListener("abort", abortFromParent, { once: true });
  }

  const timeout = setTimeout(
    () => controller.abort(new Error(`Request timed out after ${options.timeoutMs}ms`)),
    options.timeoutMs,
  );

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromParent);
    },
  };
}

export async function apiFetch(
  path: string,
  params?: Record<string, string | string[]>,
  options?: RequestOptions,
): Promise<unknown> {
  const url = new URL(path, BASE_URL);

  if (params) {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          search.append(key, item);
        }
      } else {
        search.set(key, value);
      }
    }

    url.search = search.toString();
  }

  const { signal, cleanup } = createRequestSignal(options);

  try {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new CheckHostError(`Network request failed for ${url.toString()}: ${message}`, 0);
    }

    if (!response.ok) {
      throw new CheckHostError(
        `Request failed for ${url.toString()} with status ${response.status}`,
        response.status,
      );
    }

    try {
      return (await response.json()) as unknown;
    } catch (error) {
      if (signal?.aborted) {
        const message = error instanceof Error ? error.message : "Request aborted";
        throw new CheckHostError(`Network request failed for ${url.toString()}: ${message}`, 0);
      }

      const contentType = response.headers.get("content-type") ?? "unknown";
      throw new CheckHostError(
        `Expected JSON response but received content-type ${contentType}`,
        response.status,
      );
    }
  } finally {
    cleanup();
  }
}
