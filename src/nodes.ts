import { apiFetch } from "./client.js";
import type { RequestOptions } from "./client.js";
import type { NodeEntry } from "./types.js";
import { assertNodeHostsResponse, assertNodeIPsResponse } from "./validators.js";

export async function getNodeIPs(options?: RequestOptions): Promise<string[]> {
  return assertNodeIPsResponse(await apiFetch("/nodes/ips", undefined, options));
}

export async function getNodeHosts(options?: RequestOptions): Promise<Record<string, NodeEntry>> {
  return assertNodeHostsResponse(await apiFetch("/nodes/hosts", undefined, options));
}
