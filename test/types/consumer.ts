import {
  checkUdp,
  getResult,
  getNodeIPs,
  getResultExtended,
  type CheckResult,
  type CheckResponse,
  type ExtendedCheckResult,
  type ExtendedResult,
  type HttpResult,
  type UdpResult,
} from "../../dist/index.js";

const check: Promise<CheckResponse> = checkUdp("192.0.2.1:53", { timeoutMs: 5_000 });
const ips: Promise<string[]> = getNodeIPs();
const result: Promise<ExtendedResult<CheckResult>> = getResultExtended("request-id");
const customExtended: ExtendedResult<{ raw: true }> = {
  command: "custom",
  created: 1,
  host: "example.com",
  results: { raw: true },
};
const httpResult: Promise<HttpResult> = getResult("request-id", { type: "http" });
const udp: UdpResult = { node: [{ address: "192.0.2.1", timeout: 1 }] };

function readExtendedResult(result: ExtendedCheckResult): CheckResult {
  if (result.command === "http") {
    const http: HttpResult = result.results;
    return http;
  }

  return result.results;
}

void [check, ips, result, customExtended, httpResult, udp, readExtendedResult];
