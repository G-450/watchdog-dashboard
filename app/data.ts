export type Workload = {
  name: string; namespace: string; type: string; replicas: number;
  cpu_requests: number; cpu_limits: number; mem_requests: number; mem_limits: number;
  cpu_usage: number; mem_usage: number; net_rx_usage: number; net_tx_usage: number;
  total_cost: number; is_excluded: boolean; exclude_reason?: string; service_dependencies?: string[];
};

export type Recommendation = {
  id?: number; target: string; current_state: string; proposed_state: string;
  expected_savings: number; confidence_score: number; supporting_evidence: string;
  rule_trace: string[]; status: string; rejection_reason?: string; timestamp: string;
};

export type Snapshot = { timestamp: string; nodes: number; total_cost: number };
export type Overview = { timestamp: string; nodes: number; namespaces: number; workloads: number; total_cost: number; potential_savings: number; recommendations: Record<string, number> };
export type AgentStatus = { agent_name: string; status: string; started_at: string; last_snapshot_at: string | null; storage: string };

export const demoOverview: Overview = { timestamp: new Date(Date.now() - 42000).toISOString(), nodes: 3, namespaces: 6, workloads: 24, total_cost: 486.2, potential_savings: 67.84, recommendations: { approved: 2, rejected: 1, pending: 0 } };

export const demoWorkloads: Workload[] = [
  { name:"checkout-api", namespace:"storefront", type:"Deployment", replicas:4, cpu_requests:1.2, cpu_limits:2, mem_requests:536870912, mem_limits:1073741824, cpu_usage:.42, mem_usage:348127232, net_rx_usage:1840000, net_tx_usage:920000, total_cost:18.42, is_excluded:false, service_dependencies:["checkout","payments"] },
  { name:"recommendation-worker", namespace:"intelligence", type:"Deployment", replicas:2, cpu_requests:.8, cpu_limits:1.2, mem_requests:805306368, mem_limits:1073741824, cpu_usage:.33, mem_usage:618659840, net_rx_usage:480000, net_tx_usage:210000, total_cost:12.08, is_excluded:false, service_dependencies:["ai-reasoner"] },
  { name:"catalog-service", namespace:"storefront", type:"Deployment", replicas:3, cpu_requests:.6, cpu_limits:1, mem_requests:402653184, mem_limits:805306368, cpu_usage:.35, mem_usage:290455552, net_rx_usage:1300000, net_tx_usage:760000, total_cost:9.64, is_excluded:false, service_dependencies:["catalog"] },
  { name:"prometheus-server", namespace:"monitoring", type:"StatefulSet", replicas:1, cpu_requests:1, cpu_limits:2, mem_requests:2147483648, mem_limits:4294967296, cpu_usage:.61, mem_usage:2684354560, net_rx_usage:4500000, net_tx_usage:1600000, total_cost:44.18, is_excluded:true, exclude_reason:"Stateful monitoring workload", service_dependencies:["prometheus"] },
  { name:"payment-api", namespace:"payments", type:"Deployment", replicas:3, cpu_requests:.9, cpu_limits:1.5, mem_requests:536870912, mem_limits:1073741824, cpu_usage:.54, mem_usage:429916160, net_rx_usage:1120000, net_tx_usage:870000, total_cost:16.31, is_excluded:false, service_dependencies:["payments"] },
  { name:"redis-cache", namespace:"storefront", type:"StatefulSet", replicas:1, cpu_requests:.4, cpu_limits:.8, mem_requests:1073741824, mem_limits:2147483648, cpu_usage:.29, mem_usage:1224736768, net_rx_usage:2800000, net_tx_usage:2400000, total_cost:21.76, is_excluded:true, exclude_reason:"Stateful workload", service_dependencies:["redis"] },
];

export const demoRecommendations: Recommendation[] = [
  { id:1, target:"storefront/checkout-api", current_state:'{"cpu_requests":"1200m","replicas":4}', proposed_state:'{"cpu_requests":"850m","replicas":4}', expected_savings:41.2, confidence_score:.94, supporting_evidence:"P95 CPU remained below 46% of requested capacity across the observation window.", rule_trace:["namespace-allowed","min-replicas-pass","cpu-step-down-pass"], status:"Approved", timestamp:new Date(Date.now()-180000).toISOString() },
  { id:2, target:"intelligence/recommendation-worker", current_state:'{"memory_requests":"768Mi"}', proposed_state:'{"memory_requests":"640Mi"}', expected_savings:26.64, confidence_score:.87, supporting_evidence:"Memory working set is stable with 22% headroom after the proposed reduction.", rule_trace:["namespace-allowed","memory-headroom-pass"], status:"Approved", timestamp:new Date(Date.now()-360000).toISOString() },
  { id:3, target:"monitoring/prometheus-server", current_state:'{"cpu_requests":"1000m"}', proposed_state:'{"cpu_requests":"700m"}', expected_savings:18.1, confidence_score:.79, supporting_evidence:"CPU demand is moderate but the namespace is protected.", rule_trace:["namespace-excluded"], status:"Rejected", rejection_reason:"namespace monitoring is excluded from automated changes", timestamp:new Date(Date.now()-720000).toISOString() },
];

export const demoSnapshots: Snapshot[] = [492.8,491.3,489.7,490.2,488.1,487.4,486.2].map((cost,index)=>({ timestamp:new Date(Date.now()-(6-index)*86400000).toISOString(), nodes:3, total_cost:cost }));
export const demoStatus: AgentStatus = { agent_name:"watchdog-agent-01", status:"running", started_at:new Date(Date.now()-86400000*3).toISOString(), last_snapshot_at:demoOverview.timestamp, storage:"connected" };
