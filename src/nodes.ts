import { apiFetch } from "./client.js";
import type { NodeEntry } from "./types.js";
import { assertNodeHostsResponse, assertNodeIPsResponse } from "./validators.js";

export async function getNodeIPs(): Promise<string[]> {
  return assertNodeIPsResponse(await apiFetch("/nodes/ips"));
}

export async function getNodeHosts(): Promise<Record<string, NodeEntry>> {
  return assertNodeHostsResponse(await apiFetch("/nodes/hosts"));
}
