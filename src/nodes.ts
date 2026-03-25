import { apiFetch } from "./client";
import type { NodeEntry } from "./types";
import { assertNodesResponse } from "./validators";

export async function getNodeIPs(): Promise<Record<string, NodeEntry>> {
  return assertNodesResponse(await apiFetch("/nodes/ips"));
}

export async function getNodeHosts(): Promise<Record<string, NodeEntry>> {
  return assertNodesResponse(await apiFetch("/nodes/hosts"));
}
