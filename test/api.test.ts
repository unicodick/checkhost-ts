import { afterEach, describe, expect, test } from "bun:test";

import {
  apiFetch,
  checkHttp,
  CheckHostError,
  getNodeHosts,
  getNodeIPs,
  getResult,
  getResultExtended,
} from "../index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockJson(payload: unknown, status = 200): void {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
}

function mockPendingRequest(): void {
  globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;

      if (!signal) {
        return;
      }

      if (signal.aborted) {
        reject(signal.reason);
        return;
      }

      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
}

describe("apiFetch", () => {
  test("serializes repeated query parameters", async () => {
    let requestUrl: URL | undefined;
    let requestHeaders: Headers | undefined;

    globalThis.fetch = async (input, init) => {
      requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      requestHeaders = new Headers(init?.headers);
      return Response.json({ ok: true });
    };

    await apiFetch("/test", { node: ["one", "two"], host: "example.com" });

    expect(requestUrl?.pathname).toBe("/test");
    expect(requestUrl?.searchParams.getAll("node")).toEqual(["one", "two"]);
    expect(requestUrl?.searchParams.get("host")).toBe("example.com");
    expect(requestHeaders?.get("accept")).toBe("application/json");
  });

  test("preserves HTTP status errors", async () => {
    mockJson({ error: "rate limited" }, 429);

    try {
      await apiFetch("/test");
      throw new Error("Expected apiFetch to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckHostError);
      expect((error as CheckHostError).statusCode).toBe(429);
    }
  });

  test("aborts after the configured timeout", async () => {
    mockPendingRequest();

    await expect(apiFetch("/test", undefined, { timeoutMs: 5 })).rejects.toThrow(
      "Request timed out after 5ms",
    );
  });

  test("propagates caller cancellation", async () => {
    mockPendingRequest();
    const controller = new AbortController();
    const request = apiFetch("/test", undefined, { signal: controller.signal });

    controller.abort(new Error("cancelled by caller"));

    await expect(request).rejects.toThrow("cancelled by caller");
  });

  test("rejects invalid timeout values", async () => {
    await expect(apiFetch("/test", undefined, { timeoutMs: 0 })).rejects.toThrow(
      "timeoutMs must be an integer between 1 and 2147483647",
    );
  });
});

describe("checks", () => {
  test("normalizes check options", async () => {
    let requestUrl: URL | undefined;

    globalThis.fetch = async (input) => {
      requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      return Response.json({
        ok: 1,
        request_id: "request-id",
        permanent_link: "https://check-host.net/check-report/request-id",
        nodes: {
          node: ["us", "USA", "New York", "192.0.2.1", "AS64500"],
        },
      });
    };

    await checkHttp(" example.com ", { maxNodes: 2, nodes: [" one ", "two"] });

    expect(requestUrl?.searchParams.get("host")).toBe("example.com");
    expect(requestUrl?.searchParams.get("max_nodes")).toBe("2");
    expect(requestUrl?.searchParams.getAll("node")).toEqual(["one", "two"]);
  });

  test("rejects invalid check options", async () => {
    await expect(checkHttp(" ")).rejects.toThrow("host must be a non-empty string");
    await expect(checkHttp("example.com", { maxNodes: 0 })).rejects.toThrow(
      "maxNodes must be a positive integer",
    );
    await expect(checkHttp("example.com", { nodes: [" "] })).rejects.toThrow(
      "nodes must not contain empty strings",
    );
  });
});

describe("nodes", () => {
  test("returns the IP list", async () => {
    mockJson({ nodes: ["192.0.2.1", "2001:db8::1"] });

    expect(await getNodeIPs()).toEqual(["192.0.2.1", "2001:db8::1"]);
  });

  test("returns the host map", async () => {
    const nodes = {
      "us1.node.check-host.net": {
        asn: "AS64500",
        ip: "192.0.2.1",
        location: ["us", "USA", "New York"],
      },
    };
    mockJson({ nodes });

    expect(await getNodeHosts()).toEqual(nodes);
  });

  test("rejects a host map from the IP endpoint", async () => {
    mockJson({ nodes: { node: { ip: "192.0.2.1" } } });

    await expect(getNodeIPs()).rejects.toThrow("Invalid node IPs response");
  });
});

describe("results", () => {
  const validResults: Array<[string, unknown]> = [
    ["ping", { node: [[["OK", 0.01, "192.0.2.1"], ["TIMEOUT", 3]]] }],
    ["http", { node: [[1, 0.1, "OK", "200", "192.0.2.1"]] }],
    ["http without address", { node: [[1, 0.1, "OK", "200"]] }],
    ["tcp", { node: [{ time: 0.1, address: "192.0.2.1" }] }],
    ["dns", { node: [{ A: ["192.0.2.1"], AAAA: [], TTL: 300 }] }],
    ["udp", { node: [{ address: "192.0.2.1", timeout: 1 }] }],
  ];

  for (const [name, payload] of validResults) {
    test(`accepts a ${name} result`, async () => {
      mockJson(payload);

      expect(await getResult("request-id")).toEqual(payload);
    });
  }

  test("rejects malformed result rows", async () => {
    mockJson({ node: [42] });

    await expect(getResult("request-id")).rejects.toThrow(
      "Invalid check result: node result shape is invalid",
    );
  });

  test("preserves the extended result port", async () => {
    mockJson({
      command: "udp",
      created: 1_784_651_638,
      host: "192.0.2.1",
      port: "53",
      results: { node: [{ address: "192.0.2.1", timeout: 1 }] },
    });

    const result = await getResultExtended("request-id");

    expect(result.port).toBe("53");
  });
});
