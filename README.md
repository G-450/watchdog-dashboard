# Watchdog Dashboard

Read-only operations and FinOps visibility for the Watchdog Kubernetes control plane.

## Capabilities

- Cluster overview and snapshot freshness
- Searchable workload utilization and cost inventory
- Workload detail inspection with resource allocation and service mappings
- Cost trend, namespace distribution, and top cost drivers
- Recommendation evidence, confidence, policy trace, and validation result
- Agent and storage status
- Automatic demonstration fallback when the agent API is unavailable

## Prerequisites

- Node.js 22+
- A running `watchdog-agent` instance exposing the `/api/v1/*` visibility endpoints on port 8081

## Local Development

1. **Configure the agent URL.** Create `.env.local` in the project root:

   ```dotenv
   WATCHDOG_API_URL=http://localhost:8081
   ```

   Alternatively, set the variable in your shell session before starting the dev server:

   ```powershell
   $env:WATCHDOG_API_URL="http://localhost:8081"
   ```

2. **Install dependencies and start the dev server:**

   ```bash
   npm ci
   npm run dev
   ```

3. **Verify the agent is reachable** before expecting live data:

   ```bash
   curl http://localhost:8081/api/v1/status
   ```

   If the agent is unreachable, the dashboard falls back to labelled demo data automatically.

## Available Scripts

| Command | Purpose |
|---------|---------|
| `npm ci` | Install dependencies using the lockfile |
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint static analysis |
| `npm test` | Run production build and source-level contract checks |

## Related Repositories

- [`watchdog-agent`](https://github.com/G-450/watchdog-agent): collection, persistence, reasoning, policy, and visibility API
- [`infra-manifests`](https://github.com/mithulpranav24/infra-manifests): ArgoCD and Kubernetes deployment manifests
- [`watchdog-docs`](https://github.com/mithulpranav24/watchdog-docs): architecture, decision records, phase plans, and operator guides
