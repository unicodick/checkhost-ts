import { CheckHostError } from "./types.js";
import type {
  CheckResponse,
  CheckResult,
  CheckResultFor,
  CheckType,
  DnsCheckRow,
  ExtendedCheckResult,
  HttpCheckRow,
  NodeEntry,
  PingReply,
  TcpCheckRow,
  UdpCheckRow,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidInput(message: string): CheckHostError {
  return new CheckHostError(message, 0, { kind: "validation" });
}

function invalidResponse(message: string): CheckHostError {
  return new CheckHostError(message, 0, { kind: "response" });
}

function isNodeInfo(value: unknown): value is [string, string, string, string, string] {
  return (
    Array.isArray(value) &&
    value.length === 5 &&
    value.every((item) => typeof item === "string")
  );
}

function isNodeEntry(value: unknown): value is NodeEntry {
  if (!isRecord(value)) {
    return false;
  }

  const location = value.location;
  return (
    typeof value.asn === "string" &&
    typeof value.ip === "string" &&
    Array.isArray(location) &&
    location.length === 3 &&
    location.every((item) => typeof item === "string")
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPingReply(value: unknown): value is PingReply {
  return (
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    typeof value[0] === "string" &&
    isFiniteNumber(value[1]) &&
    (value.length === 2 || typeof value[2] === "string")
  );
}

function isHttpCheckRow(value: unknown): value is HttpCheckRow {
  return (
    Array.isArray(value) &&
    (value.length === 4 || value.length === 5) &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    typeof value[2] === "string" &&
    (typeof value[3] === "string" || value[3] === null) &&
    (value.length === 4 || typeof value[4] === "string" || value[4] === null)
  );
}

function isTcpCheckRow(value: unknown): value is TcpCheckRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (isFiniteNumber(value.time) && typeof value.address === "string") ||
    typeof value.error === "string"
  );
}

function isDnsCheckRow(value: unknown): value is DnsCheckRow {
  if (
    !isRecord(value) ||
    !("TTL" in value) ||
    (!isFiniteNumber(value.TTL) && value.TTL !== null)
  ) {
    return false;
  }

  return Object.values(value).every(
    (item) =>
      item === null ||
      isFiniteNumber(item) ||
      (Array.isArray(item) && item.every((entry) => typeof entry === "string")),
  );
}

function isUdpCheckRow(value: unknown): value is UdpCheckRow {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.error === "string") {
    return value.address === undefined || typeof value.address === "string";
  }

  return typeof value.address === "string" && isFiniteNumber(value.timeout);
}

function isPingNodeResult(value: unknown[]): boolean {
  return value.every(
    (batch) =>
      batch === null ||
      (Array.isArray(batch) && batch.every((reply) => reply === null || isPingReply(reply))),
  );
}

const resultShapes: CheckType[] = ["ping", "http", "tcp", "dns", "udp"];

function isCheckType(value: unknown): value is CheckType {
  return typeof value === "string" && resultShapes.includes(value as CheckType);
}

export function assertCheckType(value: unknown): CheckType {
  if (!isCheckType(value)) {
    throw invalidInput("type must be a supported check type");
  }
  return value;
}

function getCompatibleResultShapes(value: unknown): CheckType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length === 0) {
    return resultShapes;
  }

  return resultShapes.filter((shape) => {
    switch (shape) {
      case "ping":
        return isPingNodeResult(value);
      case "http":
        return value.every(isHttpCheckRow);
      case "tcp":
        return value.every(isTcpCheckRow);
      case "dns":
        return value.every(isDnsCheckRow);
      case "udp":
        return value.every(isUdpCheckRow);
    }
  });
}

function isCheckNodeResult(value: unknown): boolean {
  return getCompatibleResultShapes(value).length > 0;
}

export function assertHost(host: unknown): string {
  if (typeof host !== "string") {
    throw invalidInput("host must be a string");
  }

  const trimmedHost = host.trim();
  if (trimmedHost.length === 0) {
    throw invalidInput("host must be a non-empty string");
  }
  return trimmedHost;
}

export function assertRequestId(requestId: unknown): string {
  if (typeof requestId !== "string") {
    throw invalidInput("requestId must be a string");
  }

  const trimmedRequestId = requestId.trim();
  if (trimmedRequestId.length === 0) {
    throw invalidInput("requestId must be a non-empty string");
  }
  return trimmedRequestId;
}

export function assertCheckResponse(data: unknown): CheckResponse {
  if (!isRecord(data)) {
    throw invalidResponse("Invalid check response: expected an object");
  }

  const { ok, request_id, permanent_link, nodes } = data;
  if (typeof ok !== "number" || typeof request_id !== "string" || typeof permanent_link !== "string") {
    throw invalidResponse("Invalid check response: missing required fields");
  }

  if (!isRecord(nodes)) {
    throw invalidResponse("Invalid check response: nodes must be an object");
  }

  for (const nodeInfo of Object.values(nodes)) {
    if (!isNodeInfo(nodeInfo)) {
      throw invalidResponse("Invalid check response: node metadata shape is invalid");
    }
  }

  return {
    ok,
    request_id,
    permanent_link,
    nodes: nodes as CheckResponse["nodes"],
  };
}

export function assertCheckResult<T extends CheckType = CheckType>(
  data: unknown,
  expectedType?: T,
): CheckResultFor<T> {
  if (!isRecord(data)) {
    throw invalidResponse("Invalid check result: expected an object");
  }

  if (expectedType !== undefined && !isCheckType(expectedType)) {
    assertCheckType(expectedType);
  }

  let compatibleShapes: CheckType[] = expectedType === undefined ? resultShapes : [expectedType];

  for (const nodeResult of Object.values(data)) {
    if (nodeResult !== null && !isCheckNodeResult(nodeResult)) {
      throw invalidResponse("Invalid check result: node result shape is invalid");
    }

    if (nodeResult !== null) {
      const nodeShapes = new Set(getCompatibleResultShapes(nodeResult));
      compatibleShapes = compatibleShapes.filter((shape) => nodeShapes.has(shape));
      if (compatibleShapes.length === 0) {
        throw invalidResponse("Invalid check result: node result shapes are inconsistent");
      }
    }
  }

  return data as CheckResultFor<T>;
}

export function assertExtendedResult(data: unknown): ExtendedCheckResult {
  if (!isRecord(data)) {
    throw invalidResponse("Invalid extended result: expected an object");
  }

  const { command, created, host, port, results } = data;
  if (
    !isCheckType(command) ||
    !isFiniteNumber(created) ||
    typeof host !== "string" ||
    (port !== undefined && typeof port !== "string")
  ) {
    throw invalidResponse("Invalid extended result: missing required fields");
  }

  return {
    command,
    created,
    host,
    ...(port === undefined ? {} : { port }),
    results: assertCheckResult(results, command),
  } as ExtendedCheckResult;
}

export function assertNodeIPsResponse(data: unknown): string[] {
  if (
    !isRecord(data) ||
    !Array.isArray(data.nodes) ||
    !data.nodes.every((node) => typeof node === "string")
  ) {
    throw invalidResponse("Invalid node IPs response: expected { nodes: string[] }");
  }

  return data.nodes;
}

export function assertNodeHostsResponse(data: unknown): Record<string, NodeEntry> {
  if (!isRecord(data) || !isRecord(data.nodes)) {
    throw invalidResponse("Invalid node hosts response: expected { nodes: {...} }");
  }

  for (const nodeEntry of Object.values(data.nodes)) {
    if (!isNodeEntry(nodeEntry)) {
      throw invalidResponse("Invalid node hosts response: node entry shape is invalid");
    }
  }

  return data.nodes as Record<string, NodeEntry>;
}
