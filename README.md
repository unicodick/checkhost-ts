# checkhost-ts

Lightweight TypeScript wrapper for the [check-host.net](https://check-host.net) API.

```bash
npm install checkhost-ts
```

---

```ts
import { checkHttp, getResult } from "checkhost-ts";

const check = await checkHttp("check-host.net", { maxNodes: 1 });
const result = await getResult(check.request_id);

console.log(check.request_id, result);
```

## Available functions

- `apiFetch(path, params?)`
- `checkPing(host, options?)`
- `checkHttp(host, options?)`
- `checkTcp(host, options?)`
- `checkDns(host, options?)`
- `checkUdp(host, options?)`
- `getResult(requestId)`
- `getResultExtended(requestId)`
- `getNodeIPs()`
- `getNodeHosts()`

## Options

`check*` methods support:

```ts
{
  maxNodes?: number;
  nodes?: string[];
}
```

`nodes` maps to repeated `node` query params in the official API.
