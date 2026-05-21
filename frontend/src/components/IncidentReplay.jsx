import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, X, Clock, Rewind } from "lucide-react";

const SEV = {
  info:     { color: "#94A3B8", label: "INFO" },
  warning:  { color: "#FFB020", label: "WARN" },
  critical: { color: "#FF3B30", label: "CRIT" },
  recovery: { color: "#00E59B", label: "RCVR" },
};

function buildTimeline(anchor, all) {
  if (!anchor || !all.length) return anchor ? [anchor] : [];
  const sorted = [...all].sort((a, b) => (a.tick || 0) - (b.tick || 0));
  const anchorTick = anchor.tick || 0;
  const window = sorted.filter(ev => Math.abs((ev.tick || 0) - anchorTick) <= 15);
  if (!window.find(e => e.id === anchor.id)) window.push(anchor);
  window.sort((a, b) => (a.tick || 0) - (b.tick || 0));
  return window.slice(0, 20);
}

export default function IncidentReplay({ incident, allIncidents = [], onClose, onSeek }) {
  const timeline = buildTimeline(incident, allIncidents);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [speed, setSpeed]           = useState(1);
  const intervalRef                 = useRef(null);

  useEffect(() => {
    if (!playing) { clearInterval(intervalRef.current); return; }
    const ms = 900 / speed;
    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => {
        if (prev >= timeline.length - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
    }, ms);
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, timeline.length]);

  useEffect(() => {
    const ev = timeline[currentIdx];
    if (ev) onSeek?.(ev);
  }, [currentIdx]); // eslint-disable-line

  const current = timeline[currentIdx];
  const pct     = timeline.length > 1 ? (currentIdx / (timeline.length - 1)) * 100 : 0;

  const seek = useCallback((idx) => {
    setCurrentIdx(Math.max(0, Math.min(timeline.length - 1, idx)));
    setPlaying(false);
  }, [timeline.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="panel flex flex-col overflow-hidden"
      data-testid="incident-replay"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#243041]">
        <div className="flex items-center gap-2">
          <Rewind size={13} className="text-amber" />
          <h3 className="font-display text-sm text-white">Incident Replay</h3>
          <span className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B]">
            {timeline.length} events
          </span>
        </div>
        <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors p-1">
          <X size={13} />
        </button>
      </div>

      {/* Current event */}
      <div className="px-4 py-3 border-b border-[#243041] min-h-[72px]">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="font-mono-tech text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border"
                  style={{
                    color: SEV[current.severity]?.color || "#94A3B8",
                    borderColor: `${SEV[current.severity]?.color || "#94A3B8"}40`,
                    background: `${SEV[current.severity]?.color || "#94A3B8"}10`,
                  }}
                >
                  {SEV[current.severity]?.label || "INFO"}
                </span>
                <span className="font-mono-tech text-[10px] text-[#64748B]">{current.ts}</span>
                {current.robot_id && (
                  <span className="font-mono-tech text-[10px] text-cyan">{current.robot_id}</span>
                )}
              </div>
              <p className="text-[12.5px] text-[#CBD5E1] leading-snug">{current.message}</p>
              {current.action && (
                <div className="mt-1.5 font-mono-tech text-[10px] text-emerald">▸ {current.action}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrubber */}
      <div className="px-4 pt-3 pb-1">
        <div
          className="relative h-1.5 bg-[#1A1F28] rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = (e.clientX - rect.left) / rect.width;
            seek(Math.round(frac * (timeline.length - 1)));
          }}
        >
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #00D1FF, #00E59B)", width: `${pct}%` }}
          />
          {timeline.map((ev, i) => {
            const evPct = timeline.length > 1 ? (i / (timeline.length - 1)) * 100 : 0;
            const color = SEV[ev.severity]?.color || "#64748B";
            return (
              <div
                key={ev.id}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full cursor-pointer"
                style={{ left: `${evPct}%`, background: color, opacity: i === currentIdx ? 1 : 0.45 }}
                onClick={(e) => { e.stopPropagation(); seek(i); }}
              />
            );
          })}
        </div>
        <div className="flex justify-between font-mono-tech text-[9px] text-[#64748B] mt-1">
          <span>{timeline[0]?.ts || "--"}</span>
          <span>{currentIdx + 1} / {timeline.length}</span>
          <span>{timeline[timeline.length - 1]?.ts || "--"}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => seek(0)} className="p-1.5 rounded text-[#64748B] hover:text-white hover:bg-white/5 transition-colors">
            <SkipBack size={13} />
          </button>
          <button onClick={() => seek(currentIdx - 1)} className="p-1.5 rounded text-[#64748B] hover:text-white hover:bg-white/5 transition-colors">
            <SkipBack size={13} />
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-2 rounded-md border border-[#243041] hover:border-cyan transition-colors"
            style={{ color: playing ? "#FFB020" : "#00D1FF" }}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => seek(currentIdx + 1)} className="p-1.5 rounded text-[#64748B] hover:text-white hover:bg-white/5 transition-colors">
            <SkipForward size={13} />
          </button>
          <button onClick={() => seek(timeline.length - 1)} className="p-1.5 rounded text-[#64748B] hover:text-white hover:bg-white/5 transition-colors">
            <SkipForward size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-[#64748B]" />
          {[0.5, 1, 2, 4].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded border transition-colors"
              style={{
                color: speed === s ? "#00D1FF" : "#64748B",
                borderColor: speed === s ? "#00D1FF40" : "#243041",
                background: speed === s ? "#00D1FF10" : "transparent",
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Mini event list */}
      <div className="border-t border-[#243041] overflow-y-auto" style={{ maxHeight: "130px" }}>
        {timeline.map((ev, i) => {
          const isCurrent = i === currentIdx;
          const color = SEV[ev.severity]?.color || "#94A3B8";
          return (
            <button
              key={ev.id}
              onClick={() => seek(i)}
              className="w-full flex items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.02]"
              style={{ background: isCurrent ? `${color}08` : "transparent" }}
            >
              <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: color, boxShadow: isCurrent ? `0 0 6px ${color}` : "none" }} />
              <span className="font-mono-tech text-[9px] text-[#64748B] shrink-0 mt-0.5">{ev.ts}</span>
              <span className="text-[11px] leading-snug truncate" style={{ color: isCurrent ? "#F1F5F9" : "#94A3B8" }}>
                {ev.message}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}