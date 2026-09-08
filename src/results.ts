import { apiFetch } from "./client.js";
import type { RequestOptions } from "./client.js";
import type {
  CheckResult,
  CheckResultFor,
  CheckType,
  ExtendedCheckResult,
} from "./types.js";
import {
  assertCheckResult,
  assertCheckType,
  assertExtendedResult,
  assertRequestId,
} from "./validators.js";

export type ResultOptions<T extends CheckType> = RequestOptions & {
  type: T;
};

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
