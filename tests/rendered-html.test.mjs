import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("dashboard replaces starter metadata and preview", async () => {
  const [page, layout, dashboard] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/dashboard.tsx", root), "utf8"),
  ]);
  assert.match(page, /<Dashboard \/>/);
  assert.match(layout, /Watchdog Control Plane/);
  assert.doesNotMatch(page + layout, /codex-preview|SkeletonPreview|Starter Project/);
  for (const surface of ["Overview", "Workloads", "Cost explorer", "Recommendations", "System status"]) assert.match(dashboard, new RegExp(surface));
});

test("dashboard includes live API and explicit demo fallback", async () => {
  const [client, data, proxy] = await Promise.all([
    readFile(new URL("app/api-client.ts", root), "utf8"),
    readFile(new URL("app/data.ts", root), "utf8"),
    readFile(new URL("app/api/watchdog/[endpoint]/route.ts", root), "utf8"),
  ]);
  assert.match(client, /source:"live"/);
  assert.match(client, /source:"demo"/);
  assert.match(data, /demoRecommendations/);
  assert.match(proxy, /WATCHDOG_API_URL/);
  assert.match(proxy, /allowedEndpoints/);
});

test("time-dependent labels are hydration safe", async () => {
  const [dashboard, data] = await Promise.all([
    readFile(new URL("app/dashboard.tsx", root), "utf8"),
    readFile(new URL("app/data.ts", root), "utf8"),
  ]);
  assert.match(dashboard, /const \[now,setNow\] = useState\(\(\)=>Date\.now\(\)\)/);
  assert.doesNotMatch(dashboard, /useState<number\|null>\(null\)/);
  assert.doesNotMatch(data, /Date\.now\(\)/);
});

test("live data stays live when the agent answers", async () => {
  const [client, dashboard] = await Promise.all([
    readFile(new URL("app/api-client.ts", root), "utf8"),
    readFile(new URL("app/dashboard.tsx", root), "utf8"),
  ]);
  // Only an unreachable agent (status request failing) switches to demo data.
  assert.match(client, /getJSON<AgentStatus>\("status"\)[\s\S]*return demoData/);
  // An agent without snapshots yet is an empty live state, not an error.
  assert.match(client, /no_snapshots/);
  assert.match(client, /snapshots\?limit=\$\{TREND_POINTS\}/);
  assert.match(dashboard, /setInterval\(refresh,REFRESH_MS\)/);
  assert.match(dashboard, /data\.warnings/);
});

test("workload figures use the agent's units", async () => {
  const dashboard = await readFile(new URL("app/dashboard.tsx", root), "utf8");
  // Usage is summed across replicas; requests are per replica.
  assert.match(dashboard, /request\*Math\.max\(workload\.replicas,1\)/);
  // Network usage is a rate in bytes per second.
  assert.match(dashboard, /"B\/s","KiB\/s","MiB\/s","GiB\/s"/);
  assert.doesNotMatch(dashboard, /bytes\(workload\.net_/);
});
