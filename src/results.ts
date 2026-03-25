import { apiFetch } from "./client";
import type { CheckResult, ExtendedResult } from "./types";
import { assertCheckResult, assertExtendedResult, assertRequestId } from "./validators";

export async function getResult(requestId: string): Promise<CheckResult> {
  const encodedRequestId = encodeURIComponent(assertRequestId(requestId));
  return assertCheckResult(await apiFetch(`/check-result/${encodedRequestId}`));
}

export async function getResultExtended(requestId: string): Promise<ExtendedResult<CheckResult>> {
  const encodedRequestId = encodeURIComponent(assertRequestId(requestId));
  return assertExtendedResult(await apiFetch(`/check-result-extended/${encodedRequestId}`));
}
