import { apiFetch } from "./client";
import type { CheckResult, ExtendedResult } from "./types";

export async function getResult(requestId: string): Promise<CheckResult> {
  const encodedRequestId = encodeURIComponent(requestId);
  return (await apiFetch(`/check-result/${encodedRequestId}`)) as CheckResult;
}

export async function getResultExtended(requestId: string): Promise<ExtendedResult<CheckResult>> {
  const encodedRequestId = encodeURIComponent(requestId);
  return (await apiFetch(`/check-result-extended/${encodedRequestId}`)) as ExtendedResult<CheckResult>;
}
