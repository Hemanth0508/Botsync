import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Activity, ShieldCheck, Radio, Rewind } from "lucide-react";

const SEV = {
  info:     { color: "#94A3B8", glow: "rgba(148,163,184,0.2)", label: "INFO", Icon: Radio },
  warning:  { color: "#FFB020", glow: "rgba(255,176,32,0.25)",  label: "WARN", Icon: AlertTriangle },
  critical: { color: "#FF3B30", glow: "rgba(255,59,48,0.3)",    label: "CRIT", Icon: AlertTriangle },
  recovery: { color: "#00E59B", glow: "rgba(0,229,155,0.25)",   label: "RCVR", Icon: ShieldCheck },
};

const REPLAYABLE = new Set([
  "congestion", "docking_failure", "blocked_path", "stalled_execution",
  "vendor_latency", "throughput_drop", "idle_timeout", "ack_missing",
  "battery_critical", "congestion_spike",
]);

export default function IncidentFeed({ incidents, onReplay, replayingId }) {
  return (
    <div className="panel flex flex-col h-full overflow-hidden" data-testid="incident-feed">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#243041]">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-cyan" />
          <h3 className="font-display text-sm text-white">Live Events</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] blink-dot" />
          <span className="font-mono-tech text-[9px] text-[#94A3B8] uppercase tracking-widest">streaming</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <AnimatePresence initial={false}>
          {(incidents || []).map((inc) => {
            const s = SEV[inc.severity] || SEV.info;
            const Icon = s.Icon;
            const canReplay  = REPLAYABLE.has(inc.kind);
            const isReplaying = replayingId === inc.id;

            return (
              <motion.div
                key={inc.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="group flex items-start gap-2 px-2 py-1.5 rounded transition-colors"
                style={{ background: isReplaying ? `${s.color}08` : "transparent" }}
                data-testid={`incident-${inc.id}`}
              >
                <span className="font-mono-tech text-[10px] text-[#64748B] mt-0.5 shrink-0">{inc.ts}</span>
                <span
                  className="font-mono-tech text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 mt-0.5"
                  style={{ color: s.color, borderColor: s.glow, background: `${s.color}10` }}
                >
                  <Icon size={9} className="inline -mt-0.5 mr-1" />{s.label}
                </span>
                <span className="flex-1 text-[12px] leading-snug text-[#CBD5E1]">{inc.message}</span>

                {canReplay && (
                  <button
                    onClick={() => onReplay?.(inc)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-mono-tech text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border"
                    style={{
                      color: isReplaying ? "#FFB020" : "#64748B",
                      borderColor: isReplaying ? "#FFB02040" : "#243041",
                      background: isReplaying ? "#FFB02010" : "transparent",
                    }}
                    title="Replay this incident"
                  >
                    <Rewind size={9} />
                    <span className="ml-0.5">{isReplaying ? "playing" : "replay"}</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {(!incidents || incidents.length === 0) && (
          <div className="flex items-center justify-center h-32 text-[#64748B] font-mono-tech text-xs uppercase tracking-widest">
            no incidents yet — awaiting telemetry
          </div>
        )}
      </div>
    </div>
  );
}