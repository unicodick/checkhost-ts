import {
  checkUdp,
  getNodeIPs,
  getResultExtended,
  type CheckResult,
  type CheckResponse,
  type ExtendedResult,
  type UdpResult,
} from "../../dist/index.js";

const check: Promise<CheckResponse> = checkUdp("192.0.2.1:53", { timeoutMs: 5_000 });
const ips: Promise<string[]> = getNodeIPs();
const result: Promise<ExtendedResult<CheckResult>> = getResultExtended("request-id");
const udp: UdpResult = { node: [{ address: "192.0.2.1", timeout: 1 }] };

void [check, ips, result, udp];
