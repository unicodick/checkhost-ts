import { CheckHostError } from "./types.js";

export const BASE_URL = "https://check-host.net";

export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function readErrorResponse(response: Response): Promise<unknown> {
  let text: string;

  try {
    text = await response.text();
  } catch {
    return undefined;
  }

  if (text.length === 0) {
    return undefined;
  }

  if (response.headers.get("content-type")?.toLowerCase().includes("json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // upstream JSON error is malformed
    }
  }

  return text;
}

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
    throw new CheckHostError("timeoutMs must be an integer between 1 and 2147483647", 0, {
      kind: "validation",
    });
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
      const kind = options?.signal?.aborted
        ? "aborted"
        : signal?.aborted
          ? "timeout"
          : "network";
      throw new CheckHostError(`Network request failed for ${url.toString()}: ${message}`, 0, {
        kind,
        cause: error,
        url: url.toString(),
      });
    }

    if (!response.ok) {
      const responseBody = await readErrorResponse(response);
      throw new CheckHostError(
        `Request failed for ${url.toString()} with status ${response.status}`,
        response.status,
        {
          kind: "http",
          responseBody,
          url: url.toString(),
        },
      );
    }

    try {
      return (await response.json()) as unknown;
    } catch (error) {
      if (signal?.aborted) {
        const message = error instanceof Error ? error.message : "Request aborted";
        const kind = options?.signal?.aborted ? "aborted" : "timeout";
        throw new CheckHostError(`Network request failed for ${url.toString()}: ${message}`, 0, {
          kind,
          cause: error,
          url: url.toString(),
        });
      }

      const contentType = response.headers.get("content-type") ?? "unknown";
      throw new CheckHostError(
        `Expected JSON response but received content-type ${contentType}`,
        response.status,
        {
          kind: "response",
          cause: error,
          url: url.toString(),
        },
      );
    }
  } finally {
    cleanup();
  }
}
