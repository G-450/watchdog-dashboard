# Watchdog Dashboard

Read-only operations and FinOps visibility for the Watchdog Kubernetes control plane.

## Capabilities

- Cluster overview and snapshot freshness
- Searchable workload utilization and cost inventory
- Workload detail inspection with resource allocation and service mappings
- Cost trend, namespace distribution, and top cost drivers
- Recommendation evidence, confidence, policy trace, and validation result
- Agent and storage status
- Explicit demonstration fallback when the agent API is unavailable

## Local Development

The dashboard needs the agent version that exposes the `/api/v1/*` visibility routes. In the `watchdog-agent` repository, use the `feature/dashboard-api` branch until that branch is merged into `main`.

Create `.env.local` with this exact content (or set the same environment variable in the PowerShell window that starts the dashboard):

```dotenv
WATCHDOG_API_URL=http://localhost:8081
```

Then restart the dashboard server so it reads the value:

```powershell
npm ci
npm run dev
```

Do not copy Markdown link syntax or escaped underscores into the PowerShell value. The correct one-line form is `$env:WATCHDOG_API_URL="http://localhost:8081"`.

The app uses labelled demo data if any required API route is unavailable. Verify live mode with `Invoke-RestMethod http://localhost:8081/api/v1/status` before starting the dashboard.

## Checks

Run `npm test` for the production build and source-level contract checks, and `npm run lint` for static analysis.

## Related Repositories

- `watchdog-agent`: collection, persistence, reasoning, policy, and visibility API
- `watchdog-infra`: GitOps deployment manifests
- `watchdog-docs`: architecture, phase, API, and operator documentation
