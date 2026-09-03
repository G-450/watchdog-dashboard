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
