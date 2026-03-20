import { apiFetch } from "./client";
import type { CheckResponse } from "./types";

export type CheckOptions = {
  maxNodes?: number;
  nodes?: string[];
};

function buildCheckParams(
  host: string,
  options?: CheckOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = { host };

  if (typeof options?.maxNodes === "number") {
    params.max_nodes = String(options.maxNodes);
  }

  if (options?.nodes && options.nodes.length > 0) {
    params.node = options.nodes;
  }

  return params;
}

export async function checkPing(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return (await apiFetch("/check-ping", buildCheckParams(host, options))) as CheckResponse;
}

export async function checkHttp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return (await apiFetch("/check-http", buildCheckParams(host, options))) as CheckResponse;
}

export async function checkTcp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return (await apiFetch("/check-tcp", buildCheckParams(host, options))) as CheckResponse;
}

export async function checkDns(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return (await apiFetch("/check-dns", buildCheckParams(host, options))) as CheckResponse;
}

export async function checkUdp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return (await apiFetch("/check-udp", buildCheckParams(host, options))) as CheckResponse;
}
