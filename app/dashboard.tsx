"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DashboardData, TREND_POINTS, demoData, loadDashboardData } from "./api-client";
import { HealthSignals, Verification, Workload } from "./data";

type View = "overview" | "workloads" | "cost" | "recommendations" | "verification" | "status";
const nav: {id:View; label:string}[] = [
  {id:"overview",label:"Overview"},{id:"workloads",label:"Workloads"},{id:"cost",label:"Cost explorer"},{id:"recommendations",label:"Recommendations"},{id:"verification",label:"Verification"},{id:"status",label:"System status"},
];
const REFRESH_MS = 30000;
const subscribeNever = () => () => {};

const money = (value:number) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:2}).format(value);
const relative = (date:string|null, now:number|null) => {
  if (!date) return "Never";
  if (now === null) return "Updating…";
  const seconds = Math.max(0, Math.round((now-new Date(date).getTime())/1000));
  if (seconds < 60) return `${seconds}s ago`; if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`; return `${Math.floor(seconds/3600)}h ago`;
};
const dateOnly = (date:string, ready:boolean) => ready ? new Intl.DateTimeFormat("en-US", {year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(date)) : "Updating…";
const dateTime = (date:string, ready:boolean) => ready ? new Intl.DateTimeFormat("en-US", {dateStyle:"medium",timeStyle:"medium",timeZone:"UTC"}).format(new Date(date)) : "Updating…";
const rate = (bytesPerSecond:number) => { const units=["B/s","KiB/s","MiB/s","GiB/s"]; let value=bytesPerSecond; let unit=0; while (value >= 1024 && unit < units.length-1) { value/=1024; unit++; } return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`; };
// Usage is summed across replicas while requests are per replica.
const percent = (workload:Workload, usage:number, request:number) => { const total=request*Math.max(workload.replicas,1); return total > 0 ? Math.min(100, Math.round((usage/total)*100)) : 0; };
const actionLabels:Record<string,string> = { RIGHTSIZE_CPU_DOWN:"Reduce CPU request", SCALE_UP_CPU_SAFETY:"Raise CPU request", RIGHTSIZE_REPLICAS:"Reduce replicas" };
const describeState = (state:string) => { try { const parsed=JSON.parse(state) as Record<string,unknown>; return Object.entries(parsed).map(([key,value])=>key==="cpu_requests"&&typeof value==="number"?`CPU ${value} cores`:key==="mem_requests"&&typeof value==="number"?`Memory ${(value/1073741824).toFixed(2)} GiB`:key==="replicas"?`${value} replicas`:`${key} ${value}`).join(" · "); } catch { return state; } };

export default function Dashboard() {
  const [view,setView] = useState<View>("overview");
  const [data,setData] = useState(demoData);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState("");
  const [namespace,setNamespace] = useState("all");
  const [selected,setSelected] = useState<Workload|null>(null);
  const [recommendationStatus,setRecommendationStatus] = useState("All");
  const [now,setNow] = useState(()=>Date.now());
  // False during server rendering and hydration, true afterwards.
  const hydrated = useSyncExternalStore(subscribeNever, ()=>true, ()=>false);

  useEffect(()=>{
    let active=true;
    const refresh=()=>loadDashboardData().then(result=>{if(active){setData(result);setLoading(false);setNow(Date.now())}});
    refresh();
    const timer=window.setInterval(refresh,REFRESH_MS);
    return()=>{active=false;window.clearInterval(timer)};
  },[]);
  const namespaces = useMemo(()=>["all",...Array.from(new Set(data.workloads.map(item=>item.namespace))).sort()], [data.workloads]);
  const filtered = useMemo(()=>data.workloads.filter(item=>(namespace==="all"||item.namespace===namespace)&&(`${item.name} ${item.namespace}`.toLowerCase().includes(search.toLowerCase()))),[data.workloads,namespace,search]);
  const recommendations = data.recommendations.filter(item=>recommendationStatus==="All"||item.status===recommendationStatus);
  const maxCost = Math.max(...data.snapshots.map(item=>item.total_cost),1);

  return <main className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={()=>setView("overview")}><span className="brand-mark">W</span><span>WATCHDOG</span></button>
      <nav aria-label="Primary navigation">{nav.map((item,index)=><button key={item.id} className={`nav-item ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}><span>0{index+1}</span>{item.label}{item.id==="recommendations"&&<b>{data.overview.recommendations.approved||0}</b>}{item.id==="verification"&&attention(data.verifications)>0&&<b className="alert">{attention(data.verifications)}</b>}</button>)}</nav>
      <div className="agent-card"><span className="status-dot"/><div><strong>{data.status.agent_name}</strong><small>{data.source==="live"?`Synced ${relative(data.status.last_snapshot_at,now)}`:"Demonstration data"}</small></div></div>
    </aside>

    <section className="workspace">
      <header className="topbar">
        <div><p className="eyebrow">CLUSTER / DEVELOPMENT</p><h1>{view==="overview"?"Infrastructure, understood.":nav.find(item=>item.id===view)?.label}</h1><p className="subtitle">{subtitleFor(view,data)}</p></div>
        <div className={`live-pill ${data.source}`}><span className="status-dot"/>{loading?"Connecting…":data.source==="live"?"Live telemetry":"Demo mode"}</div>
      </header>
      {data.warnings.length>0&&<p className="rejection" role="status">Partial data: {data.warnings.join(", ")}. Showing what the agent returned.</p>}

      {view==="overview"&&<Overview data={data} maxCost={maxCost} navigate={setView} now={now} hydrated={hydrated} />}
      {view==="workloads"&&<section>
        <div className="toolbar"><label className="search"><span>⌕</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search workloads or namespaces" aria-label="Search workloads"/></label><select value={namespace} onChange={event=>setNamespace(event.target.value)} aria-label="Filter namespace">{namespaces.map(item=><option key={item} value={item}>{item==="all"?"All namespaces":item}</option>)}</select><span className="result-count">{filtered.length} workloads</span></div>
        <WorkloadTable workloads={filtered} onSelect={setSelected}/>
      </section>}
      {view==="cost"&&<CostExplorer data={data} maxCost={maxCost} hydrated={hydrated}/>} 
      {view==="recommendations"&&<section><div className="segmented" aria-label="Filter recommendations">{["All","Approved","Rejected","Pending"].map(item=><button key={item} className={recommendationStatus===item?"active":""} onClick={()=>setRecommendationStatus(item)}>{item}</button>)}</div><div className="recommendation-list">{recommendations.length===0&&<div className="empty-state"><strong>No recommendations</strong><span>{data.source==="live"?"The latest analysis found nothing to change for this filter.":"Try another filter."}</span></div>}{recommendations.map(item=><article className="recommendation-card" key={item.id||`${item.target}-${item.action}`}><div className="recommendation-main"><div className="rec-top"><span className={`state ${item.status.toLowerCase()}`}>{item.status}</span><span>{relative(item.timestamp,now)}</span></div><h2>{item.target}</h2>{item.action&&<p className="eyebrow">{actionLabels[item.action]||item.action}</p>}<p>{item.supporting_evidence}</p><div className="state-change"><code>{describeState(item.current_state)}</code><span>→</span><code>{describeState(item.proposed_state)}</code></div><div className="rule-trace">{item.rule_trace.map((rule,index)=><span key={`${rule}-${index}`}>{rule}</span>)}</div>{item.rejection_reason&&<p className="rejection">Policy: {item.rejection_reason}</p>}</div><div className="rec-impact"><small>EXPECTED SAVINGS</small><strong>{money(item.expected_savings)}</strong><span>/ month</span><div className="confidence-meter"><i style={{width:`${item.confidence_score*100}%`}}/></div><b>{Math.round(item.confidence_score*100)}% confidence</b></div></article>)}</div></section>}
      {view==="verification"&&<VerificationView data={data} now={now} hydrated={hydrated}/>}
      {view==="status"&&<StatusView data={data} now={now}/>}
    </section>
    {selected&&<WorkloadDrawer workload={selected} close={()=>setSelected(null)}/>} 
  </main>;
}

function subtitleFor(view:View,data:DashboardData) { const subtitles:Record<View,string>={overview:`${data.overview.workloads} workloads across ${data.overview.namespaces} namespaces, with ${money(data.overview.potential_savings)} in potential savings.`,workloads:"Inspect requests, real utilization, dependencies, exclusions, and cost.",cost:"Follow cluster spend and find the workloads driving it.",recommendations:"Understand every proposed change, its evidence, and its policy outcome.",verification:"Follow each merged change after it rolls out, and the rollbacks Watchdog proposes when one hurts a workload.",status:"Confirm the agent, storage, and collected data are ready."}; return subtitles[view]; }

function Overview({data,maxCost,navigate,now,hydrated}:{data:DashboardData;maxCost:number;navigate:(view:View)=>void;now:number|null;hydrated:boolean}) {
  const top=data.recommendations.find(item=>item.status==="Approved")||data.recommendations[0];
  return <>
    <div className="metrics-grid"><article className="metric-card accent"><p>ESTIMATED MONTHLY COST</p><strong>{money(data.overview.total_cost)}</strong><span>Run-rate from the latest allocation</span></article><article className="metric-card"><p>ACTIVE WORKLOADS</p><strong>{data.overview.workloads}</strong><span>Across {data.overview.namespaces} namespaces</span></article><article className="metric-card"><p>POTENTIAL SAVINGS</p><strong>{money(data.overview.potential_savings)}</strong><span className="positive">{data.overview.recommendations.approved||0} approved opportunities</span></article><article className="metric-card"><p>CLUSTER NODES</p><strong>{data.overview.nodes}</strong><span>{data.overview.timestamp?`Snapshot ${relative(data.overview.timestamp,now)}`:"Waiting for first snapshot"}</span></article></div>
    <div className="content-grid"><article className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">COST PULSE</p><h2>Run-rate over the last {Math.min(data.snapshots.length,TREND_POINTS)} snapshots</h2></div><span className="panel-meta">USD / MONTH</span></div><Bars snapshots={data.snapshots} maxCost={maxCost} hydrated={hydrated}/></article>{top&&<article className="panel opportunity"><p className="eyebrow">TOP OPPORTUNITY</p><div className="savings-ring"><strong>{money(top.expected_savings).replace(".00","")}</strong><span>/ mo</span></div><h2>{top.target}</h2><p>{top.supporting_evidence}</p><div className="confidence"><span>Confidence</span><strong>{Math.round(top.confidence_score*100)}%</strong></div><button className="primary-button" onClick={()=>navigate("recommendations")}>Review recommendation →</button></article>}</div>
    <div className="panel-heading section-heading"><div><p className="eyebrow">LIVE INVENTORY</p><h2>Workload efficiency</h2></div><button className="text-button" onClick={()=>navigate("workloads")}>View all workloads →</button></div><WorkloadTable workloads={data.workloads.slice(0,4)} onSelect={()=>navigate("workloads")}/>
  </>;
}

// Labels use the viewer's time zone, so they are rendered only after hydration.
function Bars({snapshots,maxCost,hydrated}:{snapshots:{timestamp:string;total_cost:number}[];maxCost:number;hydrated:boolean}) { const spansDays=snapshots.length>1&&new Date(snapshots[snapshots.length-1].timestamp).getTime()-new Date(snapshots[0].timestamp).getTime()>86400000; if (snapshots.length===0) return <div className="empty-state"><strong>No cost history yet</strong><span>Trends appear after the agent records snapshots.</span></div>; return <div className="bar-chart" role="img" aria-label="Cluster cost across recent snapshots">{snapshots.map((item,index)=><div className="bar-column" key={`${item.timestamp}-${index}`}><span>{money(item.total_cost)}</span><i style={{height:`${Math.max(18,(item.total_cost/maxCost)*100)}%`}}/><small>{hydrated?new Date(item.timestamp).toLocaleString("en-US",spansDays?{weekday:"short"}:{hour:"2-digit",minute:"2-digit",hour12:false}):"·"}</small></div>)}</div>; }

function WorkloadTable({workloads,onSelect}:{workloads:Workload[];onSelect:(workload:Workload)=>void}) { return <article className="panel workload-panel"><div className="table" role="table" aria-label="Workload efficiency"><div className="table-row table-head" role="row"><span>WORKLOAD</span><span>CPU / REQUEST</span><span>MEMORY / REQUEST</span><span>COST</span><span>STATE</span></div>{workloads.map(item=><button className="table-row" role="row" key={`${item.namespace}/${item.name}`} onClick={()=>onSelect(item)}><span><strong>{item.name}</strong><small>{item.namespace} · {item.type}</small></span><span><i className="usage"><b style={{width:`${percent(item,item.cpu_usage,item.cpu_requests)}%`}}/></i>{item.cpu_requests>0?`${percent(item,item.cpu_usage,item.cpu_requests)}%`:"Unset"}</span><span><i className="usage memory"><b style={{width:`${percent(item,item.mem_usage,item.mem_requests)}%`}}/></i>{item.mem_requests>0?`${percent(item,item.mem_usage,item.mem_requests)}%`:"Unset"}</span><span>{money(item.total_cost)}</span><span className={item.is_excluded?"excluded":"healthy"}>{item.is_excluded?"Protected":"Optimizable"}</span></button>)}</div>{workloads.length===0&&<div className="empty-state"><strong>No matching workloads</strong><span>Try another name or namespace.</span></div>}</article>; }

function CostExplorer({data,maxCost,hydrated}:{data:DashboardData;maxCost:number;hydrated:boolean}) { const byNamespace=Object.entries(data.workloads.reduce<Record<string,number>>((sum,item)=>{sum[item.namespace]=(sum[item.namespace]||0)+item.total_cost;return sum},{})).sort((a,b)=>b[1]-a[1]); const top=[...data.workloads].sort((a,b)=>b.total_cost-a.total_cost); return <section><div className="cost-layout"><article className="panel wide-chart"><div className="panel-heading"><div><p className="eyebrow">CLUSTER TREND</p><h2>Allocated monthly cost</h2></div><strong>{money(data.overview.total_cost)}</strong></div><Bars snapshots={data.snapshots} maxCost={maxCost} hydrated={hydrated}/></article><article className="panel namespace-cost"><p className="eyebrow">BY NAMESPACE</p><h2>Cost distribution</h2><div>{byNamespace.map(([name,cost])=><div className="cost-row" key={name}><span><b>{name}</b><small>{money(cost)}</small></span><i><b style={{width:`${(cost/(byNamespace[0]?.[1]||1))*100}%`}}/></i></div>)}</div></article></div><article className="panel top-spend"><div className="panel-heading"><div><p className="eyebrow">COST DRIVERS</p><h2>Most expensive workloads</h2></div><span className="panel-meta">CURRENT SNAPSHOT</span></div>{top.map((item,index)=><div className="spend-row" key={`${item.namespace}/${item.name}`}><span className="rank">{String(index+1).padStart(2,"0")}</span><span><strong>{item.name}</strong><small>{item.namespace}</small></span><i><b style={{width:`${(item.total_cost/(top[0]?.total_cost||1))*100}%`}}/></i><strong>{money(item.total_cost)}</strong></div>)}</article></section>; }

// Verification statuses from the agent, grouped by what they ask of the reader.
const verificationLabels:Record<string,string> = { WaitingForRollout:"Waiting for rollout", Verifying:"Verifying", Verified:"Verified", Degraded:"Regression found", RollbackProposed:"Rollback proposed", RollbackDeclined:"Rollback declined", RolledBack:"Rolled back", NotDeployed:"Not deployed", Skipped:"Not verifiable" };
const needsAttention = new Set(["Degraded","RollbackProposed","RollbackDeclined"]);
const inProgress = new Set(["WaitingForRollout","Verifying"]);
const attention = (items:Verification[]) => items.filter(item=>needsAttention.has(item.status)).length;
const verificationTone = (status:string) => status==="Verified"?"approved":needsAttention.has(status)?"rejected":inProgress.has(status)?"pending":"neutral";
const verificationFilters:{label:string;match:(item:Verification)=>boolean}[] = [
  {label:"All",match:()=>true},{label:"Needs attention",match:item=>needsAttention.has(item.status)},{label:"In progress",match:item=>inProgress.has(item.status)},{label:"Verified",match:item=>item.status==="Verified"},
];
const describeChange = (json?:string) => { if (!json) return "Not recorded"; try { const parsed=JSON.parse(json) as Record<string,unknown>; return Object.entries(parsed).map(([key,value])=>key==="cpu"?`CPU ${value}`:key==="memory"?`Memory ${value}`:key==="replicas"?`${value} replicas`:`${key} ${value}`).join(" · "); } catch { return json; } };
const pullURL = (item:Verification, pr:number) => item.pr_url.replace(/\/pull\/\d+$/, `/pull/${pr}`);
// Higher is worse for every signal except availability.
const signalRows:{key:keyof HealthSignals;label:string;format:(value:number)=>string;higherIsWorse:boolean}[] = [
  {key:"restarts",label:"Restarts",format:value=>value.toFixed(0),higherIsWorse:true},
  {key:"oom_kills",label:"OOM kills",format:value=>value.toFixed(0),higherIsWorse:true},
  {key:"throttle_ratio",label:"CPU throttling",format:value=>`${(value*100).toFixed(0)}%`,higherIsWorse:true},
  {key:"avg_replicas",label:"Avg replicas",format:value=>value.toFixed(1),higherIsWorse:true},
  {key:"availability",label:"Availability",format:value=>`${(value*100).toFixed(0)}%`,higherIsWorse:false},
];

function VerificationView({data,now,hydrated}:{data:DashboardData;now:number|null;hydrated:boolean}) {
  const [filter,setFilter] = useState("All");
  const match = verificationFilters.find(item=>item.label===filter)?.match || (()=>true);
  const items = data.verifications.filter(match);
  return <section>
    {data.halted.map(item=><div className="halted-banner" role="alert" key={item.target}><strong>Watchdog stopped changing {item.target}</strong><span>{item.failed_prs.length} changes were rolled back ({item.failed_prs.map(pr=>`#${pr}`).join(", ")}). New recommendations for it are rejected until someone sets <code>watchdog.finops.io/resume-after</code> on the Deployment to a time after {dateTime(item.since,hydrated)}.</span></div>)}
    <div className="segmented" aria-label="Filter verifications">{verificationFilters.map(item=><button key={item.label} className={filter===item.label?"active":""} onClick={()=>setFilter(item.label)}>{item.label}</button>)}</div>
    <div className="recommendation-list">
      {items.length===0&&<div className="empty-state"><strong>No verifications</strong><span>{data.verifications.length===0?"Each Watchdog PR that someone merges is checked here once it rolls out.":"No merged change matches this filter."}</span></div>}
      {items.map(item=>{ const failed=needsAttention.has(item.status)||item.status==="RolledBack"; return <article className="verification-card" key={item.pr}>
        <div className="recommendation-main">
          <div className="rec-top"><span className={`state ${verificationTone(item.status)}`}>{verificationLabels[item.status]||item.status}</span><span>Merged {relative(item.merged_at,now)}</span></div>
          <h2>{item.target}</h2>
          <p className="eyebrow"><a href={item.pr_url} target="_blank" rel="noreferrer">PR #{item.pr}</a></p>
          <div className="state-change"><code>{describeChange(item.previous)}</code><span>→</span><code>{describeChange(item.changes)}</code></div>
          <ol className="timeline" aria-label="Verification progress">
            <li className="done">Merged<small>{dateTime(item.merged_at,hydrated)}</small></li>
            <li className={item.deployed_at?"done":""}>Rolled out<small>{item.deployed_at?dateTime(item.deployed_at,hydrated):item.status==="NotDeployed"?"Timed out":"Pending"}</small></li>
            <li className={item.status==="Verified"?"done":failed?"failed":""}>Verdict<small>{item.status==="Verified"?"Healthy":failed?"Regression":item.status==="Verifying"?"Watching":"—"}</small></li>
            {item.rollback_pr?<li className={item.status==="RolledBack"?"done":""}>Rollback<small><a href={pullURL(item,item.rollback_pr)} target="_blank" rel="noreferrer">PR #{item.rollback_pr}</a> {item.status==="RolledBack"?"merged":"awaiting review"}</small></li>:null}
          </ol>
          {item.findings?.map(finding=><p className="rejection" key={finding}>{finding}</p>)}
        </div>
        <Signals baseline={item.baseline} observed={item.observed} flagWorse={failed}/>
      </article>; })}
    </div>
  </section>;
}

// Worse values are highlighted only for a failed change; small drifts in a healthy one are noise.
function Signals({baseline,observed,flagWorse}:{baseline?:HealthSignals;observed?:HealthSignals;flagWorse:boolean}) {
  if (!baseline) return <div className="signal-panel"><small>HEALTH SIGNALS</small><p>Measured once the change rolls out.</p></div>;
  return <div className="signal-panel"><small>HEALTH SIGNALS</small><table><thead><tr><th scope="col">Signal</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>{signalRows.map(row=>{ const before=baseline[row.key]; const after=observed?.[row.key]; const worse=flagWorse&&after!==undefined&&(row.higherIsWorse?after>before:after<before); return <tr key={row.key}><th scope="row">{row.label}</th><td>{row.format(before)}</td><td className={worse?"worse":""}>{after===undefined?"—":row.format(after)}</td></tr>; })}</tbody></table></div>;
}

function StatusView({data,now}:{data:DashboardData;now:number|null}) { const ready=now!==null; const waiting=data.source==="live"&&!data.status.last_snapshot_at; const services=[{name:"Watchdog agent",detail:data.status.agent_name,state:data.status.status},{name:"Snapshot storage",detail:"SQLite persistence",state:data.status.storage},{name:"Data freshness",detail:`Last snapshot ${relative(data.status.last_snapshot_at,now)}`,state:data.status.last_snapshot_at?"current":"waiting"},{name:"Dashboard source",detail:data.source==="live"?"Agent API v1":"Built-in demonstration fixture",state:data.source}]; return <section><div className="status-banner"><div><span className="status-dot"/><p className="eyebrow">{waiting?"STARTING UP":"SYSTEM READY"}</p><h2>{waiting?"Waiting for the first reconciliation cycle":"Visibility plane is operational"}</h2><p>The dashboard is reading {data.source==="live"?"the agent's current persisted state":"a representative offline dataset"}.</p></div><span>UP SINCE<br/><strong>{dateOnly(data.status.started_at,ready)}</strong></span></div><div className="status-grid">{services.map(service=><article className="panel service-card" key={service.name}><div><span className="status-dot"/><strong>{service.name}</strong></div><p>{service.detail}</p><span className={`state ${service.state}`}>{service.state}</span></article>)}</div><article className="panel freshness"><div><p className="eyebrow">DATA CONTRACT</p><h2>What the dashboard knows</h2></div><dl><div><dt>Latest snapshot</dt><dd>{data.status.last_snapshot_at?dateTime(data.status.last_snapshot_at,ready):"Not available"}</dd></div><div><dt>API mode</dt><dd>Read-only / v1</dd></div><div><dt>Storage</dt><dd>{data.status.storage}</dd></div><div><dt>Source</dt><dd>{data.source}</dd></div></dl></article></section>; }

function WorkloadDrawer({workload,close}:{workload:Workload;close:()=>void}) { return <div className="drawer-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)close()}}><aside className="drawer" aria-label={`${workload.name} details`}><button className="drawer-close" onClick={close} aria-label="Close workload details">×</button><p className="eyebrow">{workload.namespace} / {workload.type}</p><h2>{workload.name}</h2><div className={`detail-state ${workload.is_excluded?"excluded":"healthy"}`}>{workload.is_excluded?`Protected · ${workload.exclude_reason}`:"Eligible for optimization"}</div><div className="detail-metrics"><div><span>Replicas</span><strong>{workload.replicas}</strong></div><div><span>Monthly cost</span><strong>{money(workload.total_cost)}</strong></div></div><h3>CPU allocation · all {workload.replicas} replicas</h3><ResourceBar usage={workload.cpu_usage} request={workload.cpu_requests*workload.replicas} limit={workload.cpu_limits*workload.replicas} unit=" cores"/><h3>Memory allocation · all {workload.replicas} replicas</h3><ResourceBar usage={workload.mem_usage/1073741824} request={workload.mem_requests*workload.replicas/1073741824} limit={workload.mem_limits*workload.replicas/1073741824} unit=" GiB"/><h3>Network activity</h3><dl className="network"><div><dt>Received</dt><dd>{rate(workload.net_rx_usage)}</dd></div><div><dt>Transmitted</dt><dd>{rate(workload.net_tx_usage)}</dd></div></dl><h3>Mapped services</h3><div className="chips">{(workload.service_dependencies||[]).map(service=><span key={service}>{service}</span>)}{!workload.service_dependencies?.length&&<small>No services mapped</small>}</div></aside></div>; }

function ResourceBar({usage,request,limit,unit}:{usage:number;request:number;limit:number;unit:string}) { const max=Math.max(limit,request,usage,1); return <div className="resource"><div className="resource-bar"><i className="limit" style={{width:`${(limit/max)*100}%`}}/><i className="request" style={{width:`${(request/max)*100}%`}}/><i className="actual" style={{width:`${(usage/max)*100}%`}}/></div><div><span>Used <b>{usage.toFixed(2)}{unit}</b></span><span>Requested <b>{request.toFixed(2)}{unit}</b></span><span>Limit <b>{limit.toFixed(2)}{unit}</b></span></div></div>; }
