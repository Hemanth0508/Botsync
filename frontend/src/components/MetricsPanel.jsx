import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Bot, CheckCircle2, AlertOctagon, BatteryCharging } from "lucide-react";

function Stat({ label, value, accent, suffix, Icon, testId, sub }) {
  return (
    <div className="panel px-3 py-2.5 flex items-center justify-between" data-testid={testId}>
      <div>
        <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B]">{label}</div>
        <div className="font-display text-xl text-white mt-0.5">
          {value}<span className="text-[#64748B] text-xs ml-0.5">{suffix}</span>
        </div>
        {sub && (
          <div className="font-mono-tech text-[9px] text-emerald mt-0.5">{sub}</div>
        )}
      </div>
      <Icon size={16} style={{ color: accent }} />
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0B0F14]/95 border border-[#243041] rounded-md px-2.5 py-2 font-mono-tech text-[10px] shadow-xl backdrop-blur">
      <div className="text-[#64748B] mb-1 uppercase tracking-widest">tick {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5 last:mb-0">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-[#94A3B8] capitalize">{p.dataKey}</span>
          <span className="text-white ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function MetricsPanel({ metrics, history }) {
  if (!metrics) return (
    <div className="panel p-4 text-[#64748B] font-mono-tech text-xs uppercase tracking-widest" data-testid="metrics-panel">
      warming up…
    </div>
  );

  const trimmed = (history || []).slice(-40).map((h) => ({
    t: h.t,
    completed: h.completed,
    congestion: h.congestion,
  }));

  // Chunk E — split active vs charging
  const activeCount   = metrics.active;
  const chargingCount = metrics.charging ?? 0;

  return (
    <div className="panel flex flex-col overflow-hidden" data-testid="metrics-panel">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#243041]">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} className="text-cyan" />
          <h3 className="font-display text-sm text-white">Live Metrics</h3>
        </div>
        <div className="flex items-center gap-3">
          {chargingCount > 0 && (
            <div className="flex items-center gap-1 font-mono-tech text-[9px] text-emerald uppercase tracking-widest">
              <BatteryCharging size={10} />
              {chargingCount} charging
            </div>
          )}
          <span className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B]">tick {metrics.t}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 pb-2">
        <Stat
          testId="metric-active"
          label="Active"
          value={activeCount}
          accent="#00D1FF"
          Icon={Bot}
          sub={chargingCount > 0 ? `+${chargingCount} charging` : null}
        />
        <Stat testId="metric-completed"  label="Completed"  value={metrics.completed}     accent="#00E59B" Icon={CheckCircle2} />
        <Stat testId="metric-recovery"   label="Recovered"  value={metrics.recovery_rate} suffix="%" accent="#00E59B" Icon={CheckCircle2} />
        <Stat testId="metric-congestion" label="Congestion" value={metrics.congestion}    suffix="%" accent="#FFB020" Icon={AlertOctagon} />
        <Stat testId="metric-throughput" label="Throughput" value={metrics.throughput}    suffix="/min" accent="#00D1FF" Icon={TrendingUp} />
        <Stat testId="metric-failed"     label="Failed"     value={metrics.failed}        accent="#FF3B30" Icon={AlertOctagon} />
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B]">workflows · congestion</span>
          <div className="flex items-center gap-3 font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-0.5" style={{ background: "#00E59B" }} />completed</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-0.5" style={{ background: "#FFB020" }} />congestion</span>
          </div>
        </div>
        <div className="h-36" data-testid="metric-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trimmed} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E59B" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#00E59B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAmberArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFB020" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#FFB020" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A2230" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "#243041" }} />
              <YAxis yAxisId="left" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "#243041" }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: "#243041" }} width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#243041", strokeWidth: 1 }} />
              <Area yAxisId="left"  type="monotone" dataKey="completed"  stroke="#00E59B" strokeWidth={1.8} fill="url(#gradEmerald)"   isAnimationActive={false} />
              <Area yAxisId="right" type="monotone" dataKey="congestion" stroke="#FFB020" strokeWidth={1.4} fill="url(#gradAmberArea)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}