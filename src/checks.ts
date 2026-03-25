import { apiFetch } from "./client";
import type { CheckResponse } from "./types";
import { CheckHostError } from "./types";
import { assertCheckResponse, assertHost } from "./validators";

export type CheckOptions = {
  maxNodes?: number;
  nodes?: string[];
};

function buildCheckParams(
  host: string,
  options?: CheckOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = { host: assertHost(host) };

  if (typeof options?.maxNodes === "number") {
    if (!Number.isInteger(options.maxNodes) || options.maxNodes <= 0) {
      throw new CheckHostError("maxNodes must be a positive integer", 0);
    }
    params.max_nodes = String(options.maxNodes);
  }

  if (options?.nodes && options.nodes.length > 0) {
    const normalizedNodes = options.nodes.map((node) => node.trim());
    if (normalizedNodes.some((node) => node.length === 0)) {
      throw new CheckHostError("nodes must not contain empty strings", 0);
    }
    params.node = normalizedNodes;
  }

  return params;
}

export async function checkPing(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(await apiFetch("/check-ping", buildCheckParams(host, options)));
}

export async function checkHttp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(await apiFetch("/check-http", buildCheckParams(host, options)));
}

export async function checkTcp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(await apiFetch("/check-tcp", buildCheckParams(host, options)));
}

export async function checkDns(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(await apiFetch("/check-dns", buildCheckParams(host, options)));
}

export async function checkUdp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(await apiFetch("/check-udp", buildCheckParams(host, options)));
}
