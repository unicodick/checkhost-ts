import { apiFetch } from "./client";
import type { NodeEntry } from "./types";
import { assertNodeHostsResponse, assertNodeIPsResponse } from "./validators";

export async function getNodeIPs(): Promise<string[]> {
  return assertNodeIPsResponse(await apiFetch("/nodes/ips"));
}

export async function getNodeHosts(): Promise<Record<string, NodeEntry>> {
  return assertNodeHostsResponse(await apiFetch("/nodes/hosts"));
}
