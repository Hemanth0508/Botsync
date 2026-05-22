import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, GitBranch, PauseCircle, Zap, CheckCircle, AlertCircle, Loader } from "lucide-react";
import axios from "axios";
import { API } from "../lib/api";

const ZONES = [
  { id: "inbound",    label: "Inbound" },
  { id: "outbound",   label: "Outbound" },
  { id: "storage",    label: "Storage" },
  { id: "assembly",   label: "Assembly" },
  { id: "inspection", label: "Inspection" },
  { id: "charging",   label: "Charging" },
];

function useAction() {
  const [state, setState] = useState({ status: "idle", message: null }); // idle | loading | success | error

  const run = async (fn, successMsg) => {
    setState({ status: "loading", message: null });
    try {
      const result = await fn();
      setState({ status: "success", message: successMsg(result) });
      setTimeout(() => setState({ status: "idle", message: null }), 2800);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Request failed";
      setState({ status: "error", message: msg });
      setTimeout(() => setState({ status: "idle", message: null }), 3500);
    }
  };

  return { ...state, run };
}

function FeedbackBadge({ status, message }) {
  if (status === "idle" || !message) return null;
  const cfg = {
    loading: { color: "text-cyan",    bg: "bg-cyan/10   border-cyan/20",   Icon: Loader,       spin: true },
    success: { color: "text-emerald", bg: "bg-emerald/10 border-emerald/20", Icon: CheckCircle,  spin: false },
    error:   { color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", Icon: AlertCircle,  spin: false },
  }[status];
  if (!cfg) return null;
  const { color, bg, Icon, spin } = cfg;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-1.5 text-[10px] font-mono-tech px-2 py-1 rounded border ${bg} ${color} mt-1.5`}
    >
      <Icon size={10} className={spin ? "animate-spin" : ""} />
      <span className="truncate">{message}</span>
    </motion.div>
  );
}

function ControlButton({ onClick, disabled, color, children }) {
  const colors = {
    cyan:   "border-cyan/30    text-cyan    hover:bg-cyan/10    active:bg-cyan/20",
    amber:  "border-amber/30   text-amber   hover:bg-amber/10   active:bg-amber/20",
    red:    "border-red-400/30 text-red-400 hover:bg-red-400/10 active:bg-red-400/20",
    slate:  "border-[#243041]  text-[#94A3B8] hover:border-white/30 hover:text-white",
  }[color] || colors.slate;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 text-[10px] font-mono-tech uppercase tracking-widest
        border rounded px-2.5 py-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        w-full ${colors}`}
    >
      {children}
    </button>
  );
}

export default function ControlPanel({ pausedZones = [], congestionSpikeActive = false }) {
  const [selectedZone, setSelectedZone] = useState("assembly");
  const rerouteAll   = useAction();
  const pauseZone    = useAction();
  const spikeCong    = useAction();

  const handleRerouteAll = () =>
    rerouteAll.run(
      () => axios.post(`${API}/sim/control/reroute-all`),
      (r) => `${r.data.count} units rerouted`
    );

  const handlePauseZone = () =>
    pauseZone.run(
      () => axios.post(`${API}/sim/control/pause-zone`, { zone_id: selectedZone, duration_ticks: 8 }),
      (r) => `${ZONES.find(z => z.id === r.data.zone_id)?.label} paused (${r.data.frozen_robots.length} held)`
    );

  const handleSpikeCongestion = () =>
    spikeCong.run(
      () => axios.post(`${API}/sim/control/spike-congestion`),
      () => "Congestion spike active — 6 ticks"
    );

  const isLoading = rerouteAll.status === "loading" || pauseZone.status === "loading" || spikeCong.status === "loading";

  return (
    <div className="panel" data-testid="control-panel">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#243041]">
        <Sliders size={13} className="text-[#FFB020]" />
        <h3 className="font-display text-sm text-white">Operator Controls</h3>
        <span className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] ml-1">live</span>
        {isLoading && <Loader size={10} className="text-cyan animate-spin ml-auto" />}
      </div>

      {/* Controls */}
      <div className="px-4 py-3 space-y-3">

        {/* Reroute All */}
        <div>
          <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] mb-1.5 flex items-center gap-1.5">
            <GitBranch size={9} /> Fleet Reroute
          </div>
          <ControlButton
            onClick={handleRerouteAll}
            disabled={rerouteAll.status === "loading"}
            color="cyan"
          >
            <GitBranch size={10} />
            reroute all active units
          </ControlButton>
          <AnimatePresence>
            <FeedbackBadge status={rerouteAll.status} message={rerouteAll.message} />
          </AnimatePresence>
        </div>

        {/* Pause Zone */}
        <div>
          <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] mb-1.5 flex items-center gap-1.5">
            <PauseCircle size={9} /> Zone Pause
            {pausedZones.length > 0 && (
              <span className="text-amber font-mono-tech text-[8px] ml-auto">
                {pausedZones.map(z => ZONES.find(x => x.id === z)?.label || z).join(", ")} paused
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="flex-1 bg-[#0F131A] border border-[#243041] rounded text-[10px] font-mono-tech text-[#CBD5E1]
                px-2 py-1.5 focus:outline-none focus:border-amber/40 transition-colors"
              data-testid="zone-select"
            >
              {ZONES.map(z => (
                <option key={z.id} value={z.id}>
                  {z.label}{pausedZones.includes(z.id) ? " ⏸" : ""}
                </option>
              ))}
            </select>
            <ControlButton
              onClick={handlePauseZone}
              disabled={pauseZone.status === "loading"}
              color="amber"
            >
              <PauseCircle size={10} />
              pause
            </ControlButton>
          </div>
          <AnimatePresence>
            <FeedbackBadge status={pauseZone.status} message={pauseZone.message} />
          </AnimatePresence>
        </div>

        {/* Congestion Spike */}
        <div>
          <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] mb-1.5 flex items-center gap-1.5">
            <Zap size={9} /> Stress Test
            {congestionSpikeActive && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-red-400 font-mono-tech text-[8px] ml-auto"
              >
                spike active
              </motion.span>
            )}
          </div>
          <ControlButton
            onClick={handleSpikeCongestion}
            disabled={spikeCong.status === "loading" || congestionSpikeActive}
            color="red"
          >
            <Zap size={10} />
            simulate congestion spike
          </ControlButton>
          <AnimatePresence>
            <FeedbackBadge status={spikeCong.status} message={spikeCong.message} />
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}