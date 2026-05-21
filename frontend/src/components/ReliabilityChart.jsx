import React, { useMemo, useId } from "react";
import {
  Area,
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TREND = {
  recovery:  { stroke: "#00E59B", label: "recovering",  gradTop: 0.35, gradBot: 0 },
  stable:    { stroke: "#00D1FF", label: "stable",      gradTop: 0.2,  gradBot: 0 },
  degraded:  { stroke: "#FFB020", label: "degrading",   gradTop: 0.3,  gradBot: 0 },
  critical:  { stroke: "#FF3B30", label: "degrading",   gradTop: 0.35, gradBot: 0 },
};

function resolveTrend(data) {
  if (!data?.length) return TREND.stable;
  const last = data[data.length - 1].score;
  const prev = data.length > 1 ? data[data.length - 2].score : last;
  const span = data.length > 1 ? last - data[0].score : 0;
  const delta = last - prev;

  if (last < 50) return TREND.critical;
  if (delta > 1 || span > 3) return TREND.recovery;
  if (delta < -2 || span < -5) return TREND.degraded;
  if (delta < 0 || span < 0) return TREND.degraded;
  return TREND.stable;
}

function ReliabilityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  return (
    <div
      className="bg-[#0B0F14]/95 border border-[#243041] rounded-md px-2.5 py-2 font-mono-tech text-[10px] shadow-xl backdrop-blur"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div className="text-[#64748B] mb-1 uppercase tracking-widest">tick {label}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm" style={{ background: payload[0]?.color || payload[0]?.stroke }} />
        <span className="text-[#94A3B8]">reliability</span>
        <span className="text-white ml-auto">{typeof score === "number" ? `${score}%` : score}</span>
      </div>
    </div>
  );
}

/** Build 0–100 reliability series from API history or event replay. */
export function buildReliabilityHistory(robot) {
  if (!robot) return [];

  const fromApi = robot.reliability_history;
  if (fromApi?.length >= 2) {
    return fromApi.map((p) => ({
      tick: p.tick ?? p.t ?? 0,
      score: Math.round(Math.max(0, Math.min(100, p.score ?? p.value ?? 0)) * 10) / 10,
    }));
  }

  const events = [...(robot.history || [])]
    .filter((e) => e.type === "task_complete" || e.type === "task_failed")
    .sort((a, b) => (a.tick || 0) - (b.tick || 0));

  if (!events.length) {
    if (robot.health_score == null) return [];
    return [
      { tick: 0, score: 100 },
      { tick: 1, score: Number(robot.health_score) },
    ];
  }

  let completed = 0;
  let failed = 0;
  const points = [];

  for (const e of events) {
    if (e.type === "task_complete") completed += 1;
    else failed += 1;

    const total = completed + failed;
    const base = total ? (completed / total) * 100 : 100;
    const recent = events.filter(
      (ev) =>
        (ev.type === "task_complete" || ev.type === "task_failed") &&
        (ev.tick || 0) <= (e.tick || 0),
    );
    const window = recent.slice(-20);
    const recentFails = window.filter((ev) => ev.type === "task_failed").length;
    const recencyPenalty = (recentFails / Math.max(1, window.length)) * 20;
    const score = Math.round(Math.max(0, Math.min(100, base - recencyPenalty)) * 10) / 10;
    points.push({ tick: e.tick ?? 0, score });
  }

  if (robot.health_score != null) {
    const cur = Number(robot.health_score);
    const last = points[points.length - 1];
    if (!last || last.score !== cur) {
      points.push({
        tick: (last?.tick ?? 0) + 1,
        score: cur,
      });
    }
  }

  return points.length >= 2
    ? points
    : robot.health_score != null
    ? [
        { tick: Math.max(0, (events[0]?.tick ?? 1) - 1), score: 100 },
        { tick: events[0]?.tick ?? 1, score: Number(robot.health_score) },
      ]
    : points;
}

export default function ReliabilityChart({ history, height = 88 }) {
  const gradKey = useId().replace(/:/g, "");
  const data = useMemo(
    () => (history || []).map((p) => ({ tick: p.tick, score: p.score })),
    [history],
  );
  const trend = useMemo(() => resolveTrend(data), [data]);

  if (data.length < 2) return null;

  return (
    <div style={{ height }} data-testid="reliability-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={`relGrad-${gradKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trend.stroke} stopOpacity={trend.gradTop} />
              <stop offset="100%" stopColor={trend.stroke} stopOpacity={trend.gradBot} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1A2230" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="tick"
            tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
            tickLine={false}
            axisLine={{ stroke: "#243041" }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
            tickLine={false}
            axisLine={{ stroke: "#243041" }}
            width={28}
          />
          <Tooltip
            content={<ReliabilityTooltip />}
            cursor={{ stroke: "#243041", strokeWidth: 1 }}
            animationDuration={180}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="none"
            fill={`url(#relGrad-${gradKey})`}
            animationDuration={420}
            animationEasing="ease-out"
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={trend.stroke}
            strokeWidth={1.8}
            dot={false}
            activeDot={{
              r: 3.5,
              fill: trend.stroke,
              stroke: "#0B0F14",
              strokeWidth: 2,
            }}
            animationDuration={420}
            animationEasing="ease-out"
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { resolveTrend, TREND };
