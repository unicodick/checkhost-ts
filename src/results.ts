import { apiFetch } from "./client.js";
import type { RequestOptions } from "./client.js";
import type { CheckResult, ExtendedResult } from "./types.js";
import { assertCheckResult, assertExtendedResult, assertRequestId } from "./validators.js";

export async function getResult(requestId: string, options?: RequestOptions): Promise<CheckResult> {
  const encodedRequestId = encodeURIComponent(assertRequestId(requestId));
  return assertCheckResult(await apiFetch(`/check-result/${encodedRequestId}`, undefined, options));
}

export async function getResultExtended(
  requestId: string,
  options?: RequestOptions,
): Promise<ExtendedResult<CheckResult>> {
  const encodedRequestId = encodeURIComponent(assertRequestId(requestId));
  return assertExtendedResult(
    await apiFetch(`/check-result-extended/${encodedRequestId}`, undefined, options),
  );
}
