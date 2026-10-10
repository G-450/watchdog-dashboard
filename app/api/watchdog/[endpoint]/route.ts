const allowedEndpoints = new Set(["overview", "workloads", "recommendations", "snapshots", "status", "verifications"]);

export async function GET(request: Request, context: { params: Promise<{ endpoint: string }> }) {
  const { endpoint } = await context.params;
  if (!allowedEndpoints.has(endpoint)) return Response.json({ error: { code:"not_found", message:"Unknown API endpoint" } }, { status:404 });
  const upstream = (process.env.WATCHDOG_API_URL || "http://localhost:8081").replace(/\/$/, "");
  const incoming = new URL(request.url);
  try {
    const response = await fetch(`${upstream}/api/v1/${endpoint}${incoming.search}`, { headers:{Accept:"application/json"}, cache:"no-store" });
    return new Response(response.body, { status:response.status, headers:{"Content-Type":response.headers.get("Content-Type") || "application/json"} });
  } catch {
    return Response.json({ error:{ code:"upstream_unavailable", message:"Watchdog agent is unavailable" } }, { status:503 });
  }
}
