# Watchdog Dashboard

![Node Version](https://img.shields.io/badge/node-22+-blue.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)

Operations dashboard for the Watchdog FinOps Control Plane. Displays cluster cost, workload utilization, and AI-generated rightsizing recommendations sourced from the agent API.

## Quick Start

**Prerequisites**: Node.js 22+

```bash
git clone <watchdog-dashboard-repo>
cd watchdog-dashboard

# Configure the agent API endpoint
cp .env.example .env.local
# Edit .env.local: set WATCHDOG_API_URL=http://localhost:8081

npm ci
npm run dev
# Dashboard opens at http://localhost:3000
```

When the agent is unreachable the dashboard automatically switches to labelled demo mode — you can develop and test the UI without a running agent.

## Environment

| Variable | Default | Description |
|---|---|---|
| `WATCHDOG_API_URL` | `http://localhost:8081` | Agent visibility API base URL |

Set in `.env.local` (gitignored). The server-side proxy at `app/api/watchdog/[endpoint]/route.ts` forwards requests to this URL, so there are no CORS issues.

## Commands

```bash
npm ci           # Install dependencies (respects lockfile)
npm run dev      # Dev server on :3000 with hot reload
npm run build    # Production build
npm run lint     # ESLint
npm test         # HTML contract tests
```

## Project Structure

```
app/
  api/watchdog/[endpoint]/route.ts   # Server-side proxy to agent API
  api-client.ts                      # Fetch wrapper with demo-data fallback
  page.tsx                           # Overview (cost + recommendation summary)
  workloads/                         # Workload utilization view
  recommendations/                   # Recommendations list
  cost/                              # Cost trend view
  status/                            # Agent status view
```

## Demo Mode

If `WATCHDOG_API_URL` is unset or the agent is unreachable, the dashboard falls back to built-in demo data and shows a "Demo Mode" label in the header. No config change needed — just run `npm run dev` without `.env.local`.

## Related Repos

- [watchdog-agent](https://github.com/G-450/watchdog-agent) — provides the API this dashboard consumes
- [watchdog-infra](https://github.com/mithulpranav24/watchdog-infra) — in-cluster deployment manifests
- [watchdog-docs](https://github.com/mithulpranav24/watchdog-docs) (private) — architecture docs

## Team

- mithulpranav24
- Kiruthi001
- Maalika07
- RITHAN-SIVASAMY
