import { CheckHostError } from "./types";

export const BASE_URL = "https://check-host.net";

export async function apiFetch(
  path: string,
  params?: Record<string, string | string[]>,
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

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new CheckHostError(`Network request failed: ${message}`, 0);
  }

  if (!response.ok) {
    throw new CheckHostError(`Request failed with status ${response.status}`, response.status);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    const contentType = response.headers.get("content-type") ?? "unknown";
    throw new CheckHostError(
      `Expected JSON response but received content-type ${contentType}`,
      response.status,
    );
  }
}
