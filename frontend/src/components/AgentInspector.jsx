import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Battery, Zap, CheckCircle2, AlertTriangle,
  RotateCcw, GitBranch, Clock, Radio, BatteryCharging,
  ChevronRight,
} from "lucide-react";

const EVENT_CFG = {
  task_assigned:       { color: "#00D1FF", Icon: ChevronRight,    label: "Dispatched" },
  task_complete:       { color: "#00E59B", Icon: CheckCircle2,    label: "Completed" },
  task_failed:         { color: "#FF3B30", Icon: AlertTriangle,   label: "Failed" },
  reroute:             { color: "#FFB020", Icon: GitBranch,       label: "Rerouted" },
  charge_dispatched:   { color: "#00E59B", Icon: BatteryCharging, label: "→ Charging" },
  charge_started:      { color: "#00E59B", Icon: BatteryCharging, label: "Charging" },
  charge_complete:     { color: "#00E59B", Icon: Battery,         label: "Charged" },
  charging_progress:   { color: "#00E59B", Icon: BatteryCharging, label: "Progress" },
  battery_critical:    { color: "#FF3B30", Icon: Zap,             label: "Critical" },
  idle:                { color: "#64748B", Icon: Radio,           label: "Idle" },
};

function eventCfg(type) {
  return EVENT_CFG[type] || { color: "#64748B", Icon: Radio, label: type };
}

function BatteryBar({ value, isCharging }) {
  const color = value < 10 ? "#FF3B30" : value < 30 ? "#FFB020" : "#00E59B";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1A2230] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="font-mono-tech text-[10px] w-8 text-right" style={{ color }}>
        {Math.round(value)}%
      </span>
      {isCharging && (
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <BatteryCharging size={11} className="text-emerald" />
        </motion.span>
      )}
    </div>
  );
}

const TASK_LABEL = {
  "move-inventory":    "Transporting",
  "transfer-package":  "Transferring",
  "dock-station":      "Docking",
  "deliver-component": "Delivering",
  "charge-cycle":      "En Route to Charge",
  "pallet-relocate":   "Relocating",
};

function richStatus(robot) {
  if (robot.status === "executing" && robot.task?.type) {
    return TASK_LABEL[robot.task.type] || "Executing";
  }
  return { idle: "Idle", charging: "Charging", rerouting: "Rerouting", retrying: "Retrying" }[robot.status] || robot.status;
}

function StatusBadge({ robot }) {
  const status = robot.status;
  const label = richStatus(robot);
  const cfg = {
    executing: { color: "#00D1FF" },
    idle:      { color: "#64748B" },
    rerouting: { color: "#FFB020" },
    retrying:  { color: "#FF3B30" },
    charging:  { color: "#00E59B" },
  }[status] || { color: "#64748B" };
  return (
    <span
      className="font-mono-tech text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border"
      style={{ color: cfg.color, background: `${cfg.color}15`, borderColor: `${cfg.color}40` }}
    >
      {label}
    </span>
  );
}

function EventRow({ event, isLast }) {
  const cfg = eventCfg(event.type);
  const { Icon } = cfg;

  const detail = () => {
    switch (event.type) {
      case "task_assigned":     return `${event.task_type} → ${event.zone_label || event.zone}`;
      case "task_complete":     return `${event.task_type || "task"} · batt ${event.battery}%`;
      case "task_failed":       return `${event.failure_type?.replace(/_/g, " ")} in ${event.zone_label || event.zone}`;
      case "reroute":           return `${event.from_zone_label || event.from_zone} → ${event.to_zone_label || event.to_zone}`;
      case "charge_dispatched": return `${event.reason} · ${event.battery}%`;
      case "charge_started":    return `docked at bay · ${event.battery}%`;
      case "charge_complete":   return `full charge · ${event.battery}%`;
      case "charging_progress": return `${event.battery_from}% → ${event.battery_to}%`;
      case "battery_critical":  return `${event.battery}%${event.interrupted_task ? ` · interrupted ${event.interrupted_task}` : ""}`;
      default:                  return null;
    }
  };

  return (
    <div className="flex gap-2.5 relative">
      {!isLast && (
        <div className="absolute left-[9px] top-5 bottom-0 w-px bg-[#1A2230]" />
      )}
      <div
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}
      >
        <Icon size={9} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 pb-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-tech text-[9px] uppercase tracking-widest" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="font-mono-tech text-[9px] text-[#475569]">
            {event.ts} · t{event.tick}
          </span>
        </div>
        {detail() && (
          <div className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{detail()}</div>
        )}
      </div>
    </div>
  );
}

export default function AgentInspector({ robot, onClose }) {
  const [scrollRef, setScrollRef] = useState(null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (scrollRef) scrollRef.scrollTop = 0;
  }, [robot?.id, scrollRef]);
  useEffect(() => { setShowAll(false); }, [robot?.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!robot) return null;

  const isCharging = robot.status === "charging";
  const isCritical = robot.battery < 10;

  const lastReroute = [...(robot.history || [])].reverse().find(e => e.type === "reroute");

  const stateFlow = (robot.history || [])
    .filter(e => ["task_assigned","reroute","task_complete","task_failed","charge_dispatched","charge_started","charge_complete","battery_critical"].includes(e.type))
    .slice(-5)
    .map(e => ({
      task_assigned:     "DISPATCH",
      reroute:           "REROUTE",
      task_complete:     "DONE",
      task_failed:       "FAIL",
      charge_dispatched: "→CHARGE",
      charge_started:    "CHARGING",
      charge_complete:   "CHARGED",
      battery_critical:  "CRITICAL",
    }[e.type] || e.type.toUpperCase()))
    .join(" → ");

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-[#243041] flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-base text-white">{robot.id}</span>
            {robot.callsign && (
              <span className="font-mono-tech text-[10px] text-[#64748B]">· {robot.callsign}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge robot={robot} />
            <span className="font-mono-tech text-[9px] text-[#475569] uppercase tracking-widest">
              vendor {robot.vendor}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#475569] hover:text-white transition-colors mt-0.5"
          data-testid="inspector-close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div
        ref={setScrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#243041 transparent" }}
      >
        {/* Battery */}
        <div>
          <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-1.5">Battery</div>
          <BatteryBar value={robot.battery} isCharging={isCharging} />
          {isCharging && robot.est_charge_ticks != null && (
            <div className="font-mono-tech text-[9px] text-[#64748B] mt-1">
              Est. {robot.est_charge_ticks} ticks to full
              {robot.charge_started_at_battery != null && (
                <span className="ml-2 text-emerald">from {Math.round(robot.charge_started_at_battery)}%</span>
              )}
            </div>
          )}
          {isCritical && !isCharging && (
            <div className="font-mono-tech text-[9px] text-[#FF3B30] mt-1 flex items-center gap-1">
              <Zap size={9} /> critical — emergency charge en route
            </div>
          )}
        </div>

        {/* Current task */}
        <div>
          <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-1.5">Current Task</div>
          {robot.task ? (
            <div className="bg-[#0B0F14] border border-[#243041] rounded-md px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-[10px] text-white">{robot.task.type}</span>
                <span className="font-mono-tech text-[9px] text-[#64748B]">#{robot.task.id}</span>
              </div>
              <div className="font-mono-tech text-[9px] text-[#64748B] uppercase tracking-widest">
                → {robot.task.zone}
              </div>
            </div>
          ) : (
            <div className="font-mono-tech text-[10px] text-[#475569]">No active task</div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0B0F14] border border-[#243041] rounded-md px-3 py-2">
            <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-0.5">Completed</div>
            <div className="font-display text-lg text-emerald">{robot.completed}</div>
          </div>
          <div className="bg-[#0B0F14] border border-[#243041] rounded-md px-3 py-2">
            <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-0.5">Failed</div>
            <div className="font-display text-lg" style={{ color: robot.failed > 0 ? "#FF3B30" : "#64748B" }}>
              {robot.failed}
            </div>
          </div>
        </div>

        {/* Reliability */}
        {robot.health_score != null && (() => {
          const tier = robot.reliability_tier || "nominal";
          const tierCfg = {
            nominal:  { color: "#00E59B", label: "Nominal",  bg: "rgba(0,229,155,0.06)",  border: "rgba(0,229,155,0.2)"  },
            degraded: { color: "#FFB020", label: "Degraded", bg: "rgba(255,176,32,0.06)", border: "rgba(255,176,32,0.2)" },
            critical: { color: "#FF3B30", label: "Critical", bg: "rgba(255,59,48,0.06)",  border: "rgba(255,59,48,0.2)"  },
          }[tier];
          return (
            <div>
              <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-1.5">Reliability</div>
              <div
                className="rounded-md px-3 py-2 flex items-center justify-between"
                style={{ background: tierCfg.bg, border: `1px solid ${tierCfg.border}` }}
              >
                <div>
                  <div className="font-mono-tech text-[9px] uppercase tracking-widest mb-0.5" style={{ color: tierCfg.color }}>
                    {tierCfg.label}
                  </div>
                  <div className="font-display text-base" style={{ color: tierCfg.color }}>
                    {robot.health_score}%
                  </div>
                </div>
                {/* Mini health bar */}
                <div className="w-16 h-1.5 bg-[#1A2230] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: tierCfg.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${robot.health_score}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Last reroute */}
        {lastReroute && (
          <div>
            <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-1.5">Last Reroute</div>
            <div className="bg-[#0B0F14] border border-[#FFB020]/20 rounded-md px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <GitBranch size={9} className="text-amber" />
                <span className="font-mono-tech text-[9px] text-amber uppercase tracking-widest">
                  t{lastReroute.tick} · {lastReroute.ts}
                </span>
              </div>
              <div className="font-mono-tech text-[10px] text-[#94A3B8]">
                {lastReroute.from_zone_label || lastReroute.from_zone}
                <span className="text-amber mx-1.5">→</span>
                {lastReroute.to_zone_label || lastReroute.to_zone}
              </div>
              {lastReroute.reason && (
                <div className="font-mono-tech text-[9px] text-[#64748B] mt-0.5">{lastReroute.reason}</div>
              )}
            </div>
          </div>
        )}

        {/* State flow */}
        {stateFlow && (
          <div>
            <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-1.5">State Flow</div>
            <div className="font-mono-tech text-[9px] text-[#64748B] leading-relaxed break-all">{stateFlow}</div>
          </div>
        )}

        {/* Event timeline */}
        <div>
          {(() => {
            const allEvents = [...(robot.history || [])].reverse();
            const visible = showAll ? allEvents : allEvents.slice(0, 8);
            return (
              <div>
                <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-2 flex items-center justify-between">
                  <span>Event Timeline <span className="text-[#374151]">({allEvents.length} events)</span></span>
                  {allEvents.length > 8 && (
                    <button
                      onClick={() => setShowAll(s => !s)}
                      className="font-mono-tech text-[9px] text-cyan hover:text-white transition-colors"
                    >
                      {showAll ? "show less" : `+${allEvents.length - 8} more`}
                    </button>
                  )}
                </div>
                {visible.length === 0 ? (
                  <div className="font-mono-tech text-[9px] text-[#374151]">No events yet</div>
                ) : (
                  <div>
                    {visible.map((event, idx) => (
                      <EventRow
                        key={`${event.tick}-${event.type}-${idx}`}
                        event={event}
                        isLast={idx === visible.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}