import { AgentStatus, Overview, Recommendation, Snapshot, Workload, demoOverview, demoRecommendations, demoSnapshots, demoStatus, demoWorkloads } from "./data";

export type DashboardData = { overview: Overview; workloads: Workload[]; recommendations: Recommendation[]; snapshots: Snapshot[]; status: AgentStatus; source: "live" | "demo" };

async function getJSON<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`/api/watchdog/${path}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Watchdog API returned ${response.status}`);
    return await response.json() as T;
  } finally { clearTimeout(timeout); }
}

export async function loadDashboardData(): Promise<DashboardData> {
  try {
    const [overview, workloads, recommendations, snapshots, status] = await Promise.all([
      getJSON<Overview>("overview"), getJSON<{items:Workload[]}>("workloads"),
      getJSON<{items:Recommendation[]}>("recommendations"), getJSON<{items:Snapshot[]}>("snapshots"),
      getJSON<AgentStatus>("status"),
    ]);
    return { overview, workloads:workloads.items, recommendations:recommendations.items, snapshots:snapshots.items, status, source:"live" };
  } catch {
    return { overview:demoOverview, workloads:demoWorkloads, recommendations:demoRecommendations, snapshots:demoSnapshots, status:demoStatus, source:"demo" };
  }
}
