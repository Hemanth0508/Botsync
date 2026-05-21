import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import TopBar from "../components/TopBar";
import WarehouseMap from "../components/WarehouseMap";
import IncidentFeed from "../components/IncidentFeed";
import MetricsPanel from "../components/MetricsPanel";
import AIInsights from "../components/AIInsights";
import ControlPanel from "../components/ControlPanel";
import AgentInspector from "../components/AgentInspector";
import { fetchState, resetSim } from "../lib/api";
import { RotateCcw } from "lucide-react";

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [selectedRobotId, setSelectedRobotId] = useState(null);
  const interval = useRef(null);

  const tick = async () => {
    try { setData(await fetchState()); setErr(null); }
    catch (e) { setErr(e.message || "Connection lost"); }
  };

  useEffect(() => {
    tick();
    interval.current = setInterval(tick, 1100);
    return () => clearInterval(interval.current);
  }, []);

  // Esc to deselect
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setSelectedRobotId(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Selected robot object (live — updates every tick)
  const selectedRobot = selectedRobotId
    ? data?.robots?.find(r => r.id === selectedRobotId) ?? null
    : null;

  return (
    <div className="h-screen w-screen flex flex-col bg-base overflow-hidden">
      <TopBar tick={data?.tick} />

      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left: map ── */}
        <div className="flex-1 flex flex-col p-4 gap-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="font-display text-lg text-white tracking-tight">Operations Map</h2>
              <p className="font-mono-tech text-[10px] uppercase tracking-widest text-[#64748B]">
                multi-vendor fleet · execution stream
              </p>
            </div>
            <button
              onClick={async () => { await resetSim(); tick(); }}
              className="flex items-center gap-1.5 text-[11px] font-mono-tech uppercase tracking-widest text-[#94A3B8] border border-[#243041] rounded px-2 py-1 hover:border-white/40 hover:text-white transition-colors"
              data-testid="reset-sim-btn"
            >
              <RotateCcw size={11} /> reset sim
            </button>
          </div>

          {/* Map */}
          <div className="flex-1 min-h-0">
            <WarehouseMap
              data={data}
              selectedRobotId={selectedRobotId}
              onSelectRobot={setSelectedRobotId}
            />
          </div>

          {err && (
            <div className="font-mono-tech text-[10px] text-[#FF3B30] flex-shrink-0" data-testid="cc-error">
              {err}
            </div>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <div className="w-[420px] flex-shrink-0 h-full border-l border-[#243041] bg-[#0F131A] flex flex-col overflow-hidden">

          {/* Live Events — always visible */}
          <div className="flex-shrink-0" style={{ height: "260px" }}>
            <IncidentFeed incidents={data?.incidents} />
          </div>

          <div className="border-t border-[#243041] flex-shrink-0" />

          {/* Lower half — switches between inspector and default panels */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {selectedRobot ? (
                // AgentInspector — robot selected
                <div key="inspector" className="absolute inset-0 overflow-hidden">
                  <AgentInspector
                    robot={selectedRobot}
                    onClose={() => setSelectedRobotId(null)}
                  />
                </div>
              ) : (
                // Default panels — no selection
                <div
                  key="default"
                  className="absolute inset-0 overflow-y-auto overflow-x-hidden p-3 space-y-3"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#243041 transparent" }}
                >
                  <MetricsPanel metrics={data?.metrics} history={data?.metric_history} />
                  <ControlPanel
                    pausedZones={data?.paused_zones ?? []}
                    congestionSpikeActive={data?.congestion_spike_active ?? false}
                  />
                  <AIInsights initial={data?.ai_insights?.slice(-1)?.[0]} />
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}