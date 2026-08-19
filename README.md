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

Copy `.env.example` to `.env.local`, start the Watchdog agent on port `8081`, then install dependencies and run `npm run dev`. The app uses demo data if the API is unavailable.

## Checks

Run `npm test` for the production build and source-level contract checks, and `npm run lint` for static analysis.

## Related Repositories

- `watchdog-agent`: collection, persistence, reasoning, policy, and visibility API
- `watchdog-infra`: GitOps deployment manifests
- `watchdog-docs`: architecture, phase, API, and operator documentation
