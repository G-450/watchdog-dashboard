import { AgentStatus, HaltedWorkload, Overview, Recommendation, Snapshot, Verification, Workload, demoHalted, demoOverview, demoRecommendations, demoSnapshots, demoStatus, demoVerifications, demoWorkloads, emptyOverview } from "./data";

export type DashboardData = { overview: Overview; workloads: Workload[]; recommendations: Recommendation[]; snapshots: Snapshot[]; verifications: Verification[]; halted: HaltedWorkload[]; status: AgentStatus; source: "live" | "demo"; warnings: string[] };

export const demoData: DashboardData = { overview:demoOverview, workloads:demoWorkloads, recommendations:demoRecommendations, snapshots:demoSnapshots, verifications:demoVerifications, halted:demoHalted, status:demoStatus, source:"demo", warnings:[] };

// Number of snapshots drawn in the cost trend charts.
export const TREND_POINTS = 12;

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(`Watchdog API returned ${status} (${code})`); }
}

async function getJSON<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`/api/watchdog/${path}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      throw new ApiError(response.status, body?.error?.code || "unknown");
    }
    return await response.json() as T;
  } finally { clearTimeout(timeout); }
}

// Demo data is shown only when the agent itself cannot be reached. Once it answers, every
// view reflects live state, including an empty cluster or a partially failing endpoint.
export async function loadDashboardData(): Promise<DashboardData> {
  let status: AgentStatus;
  try {
    status = await getJSON<AgentStatus>("status");
  } catch {
    return demoData;
  }

  const warnings: string[] = [];
  const settle = async <T,>(label: string, request: Promise<T>, fallback: T, isEmpty?: (error: unknown) => boolean): Promise<T> => {
    try { return await request; } catch (error) {
      if (!isEmpty?.(error)) warnings.push(`${label} unavailable`);
      return fallback;
    }
  };
  const noSnapshotsYet = (error: unknown) => error instanceof ApiError && error.code === "no_snapshots";
  // Agents older than post-deployment verification do not serve the endpoint at all.
  const noVerificationEndpoint = (error: unknown) => error instanceof ApiError && error.status === 404;

  const [overview, workloads, recommendations, snapshots, verifications] = await Promise.all([
    settle("Overview", getJSON<Overview>("overview"), emptyOverview, noSnapshotsYet),
    settle("Workloads", getJSON<{items:Workload[]}>("workloads"), {items:[]}),
    settle("Recommendations", getJSON<{items:Recommendation[]}>("recommendations"), {items:[]}),
    settle("Cost history", getJSON<{items:Snapshot[]}>(`snapshots?limit=${TREND_POINTS}`), {items:[]}),
    settle("Verifications", getJSON<{items:Verification[];halted:HaltedWorkload[]}>("verifications"), {items:[],halted:[]}, noVerificationEndpoint),
  ]);
  return { overview, workloads:workloads.items, recommendations:recommendations.items, snapshots:snapshots.items, verifications:verifications.items, halted:verifications.halted, status, source:"live", warnings };
}
