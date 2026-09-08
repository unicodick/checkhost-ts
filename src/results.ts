import { apiFetch } from "./client.js";
import type { RequestOptions } from "./client.js";
import type {
  CheckResult,
  CheckResultFor,
  CheckType,
  ExtendedCheckResult,
} from "./types.js";
import { CheckHostError } from "./types.js";
import {
  assertCheckResult,
  assertCheckType,
  assertExtendedResult,
  assertRequestId,
} from "./validators.js";

export type ResultOptions<T extends CheckType> = RequestOptions & {
  type: T;
};

export type WaitForResultOptions<T extends CheckType = CheckType> = {
  type?: T;
  intervalMs?: number;
  timeoutMs?: number;
  requestTimeoutMs?: number;
  signal?: AbortSignal;
};

const MAX_TIMEOUT_MS = 2_147_483_647;

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_TIMEOUT_MS) {
    throw new CheckHostError(`${name} must be a positive integer`, 0, { kind: "validation" });
  }
}

function createAbortError(signal: AbortSignal): CheckHostError {
  const message = signal.reason instanceof Error ? signal.reason.message : "Request aborted";
  return new CheckHostError(`Waiting for check result was aborted: ${message}`, 0, {
    kind: "aborted",
    cause: signal.reason,
  });
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError(signal));
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      reject(createAbortError(signal as AbortSignal));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isResultComplete(result: CheckResult): boolean {
  const nodeResults = Object.values(result);
  return nodeResults.length > 0 && nodeResults.every((nodeResult) => nodeResult !== null);
}

export function getResult<T extends CheckType>(
  requestId: string,
  options: ResultOptions<T>,
): Promise<CheckResultFor<T>>;
export function getResult(requestId: string, options?: RequestOptions): Promise<CheckResult>;
export async function getResult(
  requestId: string,
  options?: RequestOptions | ResultOptions<CheckType>,
): Promise<CheckResult> {
  const encodedRequestId = encodeURIComponent(assertRequestId(requestId));
  const expectedType = options && "type" in options ? assertCheckType(options.type) : undefined;
  const data = await apiFetch(`/check-result/${encodedRequestId}`, undefined, options);
  return expectedType === undefined ? assertCheckResult(data) : assertCheckResult(data, expectedType);
}

export async function getResultExtended(
  requestId: string,
  options?: RequestOptions,
): Promise<ExtendedCheckResult> {
  const encodedRequestId = encodeURIComponent(assertRequestId(requestId));
  return assertExtendedResult(
    await apiFetch(`/check-result-extended/${encodedRequestId}`, undefined, options),
  );
}

export function waitForResult<T extends CheckType>(
  requestId: string,
  options: WaitForResultOptions<T> & { type: T },
): Promise<CheckResultFor<T>>;
export function waitForResult(
  requestId: string,
  options?: WaitForResultOptions,
): Promise<CheckResult>;
export async function waitForResult(
  requestId: string,
  options?: WaitForResultOptions,
): Promise<CheckResult> {
  const intervalMs = options?.intervalMs ?? 1_000;
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const requestTimeoutMs = options?.requestTimeoutMs ?? timeoutMs;

  assertPositiveInteger(intervalMs, "intervalMs");
  assertPositiveInteger(timeoutMs, "timeoutMs");
  assertPositiveInteger(requestTimeoutMs, "requestTimeoutMs");

  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (options?.signal?.aborted) {
      throw createAbortError(options.signal);
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new CheckHostError(`Timed out waiting for check result after ${timeoutMs}ms`, 0, {
        kind: "timeout",
      });
    }

    const requestOptions: RequestOptions = {
      signal: options?.signal,
      timeoutMs: Math.max(1, Math.min(requestTimeoutMs, remainingMs)),
    };
    const result =
      options?.type === undefined
        ? await getResult(requestId, requestOptions)
        : await getResult(requestId, { ...requestOptions, type: options.type });

    if (isResultComplete(result)) {
      return result;
    }

    const delayMs = Math.min(intervalMs, deadline - Date.now());
    if (delayMs <= 0) {
      throw new CheckHostError(`Timed out waiting for check result after ${timeoutMs}ms`, 0, {
        kind: "timeout",
      });
    }
    await delay(delayMs, options?.signal);
  }
}
