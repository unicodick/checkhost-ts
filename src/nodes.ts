import { apiFetch } from "./client";
import type { NodeEntry } from "./types";

interface NodesResponse {
  nodes: Record<string, NodeEntry>;
}

export async function getNodeIPs(): Promise<Record<string, NodeEntry>> {
  const response = (await apiFetch("/nodes/ips")) as NodesResponse;
  return response.nodes;
}

export async function getNodeHosts(): Promise<Record<string, NodeEntry>> {
  const response = (await apiFetch("/nodes/hosts")) as NodesResponse;
  return response.nodes;
}
