import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_STYLE = {
  executing: { ring: "rgba(0,209,255,0.55)",  label: "Executing" },
  idle:      { ring: "rgba(148,163,184,0.3)", label: "Idle" },
  rerouting: { ring: "rgba(255,176,32,0.85)", label: "Rerouting" },
  retrying:  { ring: "rgba(255,59,48,0.8)",   label: "Retrying" },
  charging:  { ring: "rgba(0,229,155,0.6)",   label: "Charging" },
};
const STATUS_DOT = {
  executing: "#00D1FF",
  idle:      "#64748B",
  rerouting: "#FFB020",
  retrying:  "#FF3B30",
  charging:  "#00E59B",
};

const ROUTE_EVENT_COLOR = {
  dispatch:        "#00D1FF",
  complete:        "#00E59B",
  reroute:         "#FFB020",
  failure:         "#FF3B30",
  charge_dispatch: "#00E59B",
  charge_start:    "#00E59B",
  charge_complete: "#00E59B",
};

const RICH_STATUS = {
  "move-inventory":   "Transporting",
  "transfer-package": "Transferring",
  "dock-station":     "Docking",
  "deliver-component":"Delivering",
  "charge-cycle":     "En Route to Charge",
  "pallet-relocate":  "Relocating",
};

function getRichLabel(r) {
  if (r.status === "executing" && r.task?.type) {
    return RICH_STATUS[r.task.type] || "Executing";
  }
  return STATUS_STYLE[r.status]?.label || r.status;
}

export default function WarehouseMap({ data, selectedRobotId, onSelectRobot, replayEvent }) {
  const [hovered, setHovered] = useState(null);

  if (!data) return (
    <div className="flex-1 flex items-center justify-center text-[#64748B] font-mono-tech text-xs h-full">
      starting simulation…
    </div>
  );

  const { grid, zones, robots, vendors, trails = [], zone_congestion_stats = [], operational_forecast } = data;
  const replayRobotId = replayEvent?.robot_id ?? null;
  const zoneForecast = Object.fromEntries(
    (operational_forecast?.zone_risks || []).map((zr) => [zr.id, zr]),
  );
  const xPct = (v) => (v / grid.w) * 100;
  const yPct = (v) => (v / grid.h) * 100;

  // Build a lookup for congestion stats by zone id
  const zoneStats = Object.fromEntries(zone_congestion_stats.map(s => [s.id, s]));

  const handleRobotClick = (e, robotId) => {
    e.stopPropagation();
    onSelectRobot?.(selectedRobotId === robotId ? null : robotId);
  };

  // Selected robot for route overlay
  const selectedRobot = robots.find(r => r.id === selectedRobotId);
  const routePts = selectedRobot?.route_history || [];

  return (
    <div
      className="relative w-full h-full rounded-lg border border-[#243041] bg-[#0B0F14]"
      style={{ overflow: "visible" }}
      data-testid="warehouse-map"
      onClick={() => onSelectRobot?.(null)}
    >
      {/* Background effects */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        <div className="absolute inset-0 grid-overlay opacity-60" />
        <div className="absolute inset-0 scanlines opacity-40" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,209,255,0.06), transparent 60%)" }} />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-b border-[#243041] bg-[#0B0F14]/90 backdrop-blur z-20 rounded-t-lg">
        <div className="font-mono-tech text-[10px] uppercase tracking-widest text-[#94A3B8]">
          warehouse · <span className="text-cyan">{grid.w} × {grid.h}</span>
          {replayRobotId ? (
            <span className="ml-3 text-amber">· replay {replayRobotId}</span>
          ) : selectedRobotId ? (
            <span className="ml-3 text-amber">· inspecting {selectedRobotId}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono-tech uppercase tracking-widest" data-testid="vendor-legend">
          {selectedRobotId && routePts.length > 0 && (
            <div className="flex items-center gap-3 mr-2 border-r border-[#243041] pr-3">
              {[
                { color: "#00D1FF", label: "dispatch" },
                { color: "#FFB020", label: "reroute" },
                { color: "#FF3B30", label: "failure" },
                { color: "#00E59B", label: "charge" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ background: color, opacity: 0.7 }} />
                  <span className="text-[#475569]">{label}</span>
                </div>
              ))}
            </div>
          )}
          {Object.entries(vendors).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: v.color, boxShadow: `0 0 8px ${v.color}` }} />
              <span className="text-[#94A3B8]">fleet {k}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="absolute inset-0 pt-9 pb-8">
        {/* Zones */}
        {zones.map((z) => {
          const hasCharging = robots.some(r => r.status === "charging" && r.task?.zone === z.id);
          const stats = zoneStats[z.id];
          const spikes = stats?.spikes || 0;
          const forecast = zoneForecast[z.id];
          const forecastCritical = forecast?.level === "critical";
          const forecastElevated = forecast?.level === "elevated";

          // Spike tinting: 0 = neutral, 1-3 = subtle amber, 4+ = soft red pulse
          const spikeHigh = spikes >= 4;
          const spikeMed  = spikes >= 1 && spikes < 4;
          let borderColor = hasCharging
            ? "rgba(0,229,155,0.35)"
            : spikeHigh ? "rgba(255,59,48,0.4)"
            : spikeMed  ? "rgba(255,176,32,0.3)"
            : "#243041";
          let bgColor = hasCharging
            ? "rgba(0,229,155,0.04)"
            : spikeHigh ? "rgba(255,59,48,0.05)"
            : spikeMed  ? "rgba(255,176,32,0.03)"
            : "rgba(255,255,255,0.012)";

          if (!hasCharging && forecastCritical) {
            borderColor = "rgba(255,59,48,0.55)";
            bgColor = "rgba(255,59,48,0.07)";
          } else if (!hasCharging && forecastElevated) {
            borderColor = "rgba(0,209,255,0.4)";
            bgColor = "rgba(0,209,255,0.04)";
          }

          const pulseForecast = forecastCritical && !spikeHigh;
          const pulseElevated = forecastElevated && !spikeHigh && !forecastCritical;

          return (
            <motion.div key={z.id}
              className="absolute border rounded-md"
              style={{
                left: `${xPct(z.x)}%`, top: `${yPct(z.y)}%`,
                width: `${xPct(z.w)}%`, height: `${yPct(z.h)}%`,
                borderColor,
                background: bgColor,
                borderStyle: forecast && !hasCharging ? "dashed" : "solid",
              }}
              animate={
                spikeHigh
                  ? { borderColor: ["rgba(255,59,48,0.4)", "rgba(255,59,48,0.15)", "rgba(255,59,48,0.4)"] }
                  : pulseForecast
                  ? { borderColor: ["rgba(255,59,48,0.55)", "rgba(255,59,48,0.2)", "rgba(255,59,48,0.55)"] }
                  : pulseElevated
                  ? { borderColor: ["rgba(0,209,255,0.4)", "rgba(0,209,255,0.15)", "rgba(0,209,255,0.4)"] }
                  : {}
              }
              transition={
                spikeHigh || pulseForecast || pulseElevated
                  ? { duration: pulseForecast ? 2 : 3, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
              data-testid={`zone-${z.id}`}
            >
              <div className="absolute top-1 left-2 font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] flex items-center gap-1.5">
                {z.label}
                {forecastCritical && (
                  <span style={{ color: "#FF3B30", fontSize: "8px" }}>FCST</span>
                )}
                {forecastElevated && !forecastCritical && (
                  <span style={{ color: "#00D1FF", fontSize: "8px" }}>FCST</span>
                )}
                {spikeHigh && <span style={{ color: "#FF3B30", fontSize: "8px" }}>▲{spikes}</span>}
                {spikeMed  && <span style={{ color: "#FFB020", fontSize: "8px" }}>▲{spikes}</span>}
              </div>
            </motion.div>
          );
        })}

        {/* SVG layer — trails + route history overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">

          {/* Live reroute trails */}
          <AnimatePresence>
            {trails.map((t) => {
              const isSelected = t.robot_id === selectedRobotId;
              const isReplayTrail = replayRobotId && t.robot_id === replayRobotId;
              const focusId = replayRobotId || selectedRobotId;
              const isFocused = isSelected || isReplayTrail;
              const baseOpacity = (1 - Math.min(1, t.age / 8)) * 0.75;
              const opacity = focusId
                ? isFocused ? baseOpacity * 1.4 : baseOpacity * 0.2
                : baseOpacity;
              const stroke = t.kind === "retry" ? "#FF3B30" : "#FFB020";
              const strokeWidth = isSelected ? "0.4" : "0.25";
              return (
                <motion.g key={t.id} initial={{ opacity: 0 }} animate={{ opacity }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                  <motion.line
                    x1={xPct(t.from_x)} y1={yPct(t.from_y)}
                    x2={xPct(t.to_x)}   y2={yPct(t.to_y)}
                    stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="0.7 0.5"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                  <circle cx={xPct(t.to_x)} cy={yPct(t.to_y)} r={isSelected ? "0.9" : "0.6"} fill={stroke} />
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Route history overlay — only when a robot is selected */}
          {selectedRobot && routePts.length >= 2 && (() => {
            const segments = [];
            for (let i = 0; i < routePts.length - 1; i++) {
              const from = routePts[i];
              const to   = routePts[i + 1];
              const color = ROUTE_EVENT_COLOR[from.event] || "#64748B";
              const dashed = from.event === "reroute" || from.event === "failure";
              segments.push({ from, to, color, dashed });
            }

            return (
              <g>
                {/* Path segments */}
                {segments.map((seg, i) => (
                  <line
                    key={`seg-${i}`}
                    x1={xPct(seg.from.x)} y1={yPct(seg.from.y)}
                    x2={xPct(seg.to.x)}   y2={yPct(seg.to.y)}
                    stroke={seg.color}
                    strokeWidth="0.35"
                    strokeOpacity="0.5"
                    strokeDasharray={seg.dashed ? "0.8 0.5" : "none"}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* Checkpoint dots */}
                {routePts.map((pt, i) => {
                  const color = ROUTE_EVENT_COLOR[pt.event] || "#64748B";
                  const isFirst = i === 0;
                  const isLast  = i === routePts.length - 1;
                  const r = isFirst || isLast ? "1.2" : "0.7";
                  return (
                    <g key={`pt-${i}`}>
                      <circle
                        cx={xPct(pt.x)} cy={yPct(pt.y)}
                        r={r}
                        fill={color}
                        fillOpacity="0.75"
                        stroke={color}
                        strokeWidth="0.15"
                        strokeOpacity="0.4"
                      />
                      {/* Label for key events only */}
                      {(pt.event === "failure" || pt.event === "reroute" || isFirst || isLast) && (
                        <text
                          x={xPct(pt.x)}
                          y={yPct(pt.y) - 1.4}
                          fontSize="1.8"
                          fill={color}
                          fillOpacity="0.8"
                          textAnchor="middle"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}
                        >
                          {pt.event === "failure"  ? "FAIL" :
                           pt.event === "reroute"  ? "↺" :
                           isFirst                 ? "START" :
                           isLast                  ? "NOW" : ""}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })()}

        </svg>

        {/* Robots */}
        {robots.map((r) => {
          const style       = STATUS_STYLE[r.status] || STATUS_STYLE.idle;
          const statusColor = STATUS_DOT[r.status] || STATUS_DOT.idle;
          const richLabel   = getRichLabel(r);
          const isAlert     = r.status === "rerouting" || r.status === "retrying";
          const isCharging  = r.status === "charging";
          const isCritical  = r.battery < 10;
          const isSelected    = selectedRobotId === r.id;
          const isReplayRobot = replayRobotId === r.id;
          const isHovered     = hovered === r.id;
          const isDimmed      = (selectedRobotId && !isSelected) || (replayRobotId && !isReplayRobot);

          const xPos = xPct(r.x);
          const yPos = yPct(r.y);
          const tooltipLeft = xPos < 20 ? "left-0" :
                              xPos > 75 ? "right-0 left-auto" :
                              "left-1/2 -translate-x-1/2";
          const tooltipBelow = yPos < 22;

          return (
            <motion.div
              key={r.id}
              data-testid={`robot-${r.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ zIndex: isSelected || isReplayRobot ? 60 : isHovered ? 50 : 10 }}
              animate={{
                left: `${xPos}%`,
                top:  `${yPos}%`,
                opacity: isDimmed ? 0.35 : 1,
              }}
              transition={{ type: "tween", duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => handleRobotClick(e, r.id)}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(cur => cur === r.id ? null : cur)}
            >
              <div className="relative">
                {/* Selected ring */}
                {isSelected && (
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      inset: "-5px",
                      border: `1.5px solid ${r.color}`,
                      boxShadow: `0 0 12px ${r.color}`,
                    }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}

                {/* Replay focus pulse */}
                {isReplayRobot && (
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ background: "#FFB020" }}
                    animate={{ opacity: [0.55, 0, 0.55], scale: [1, 2.8, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}

                {/* Critical battery red halo */}
                {isCritical && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: "#FF3B30" }}
                    animate={{ opacity: [0.7, 0, 0.7], scale: [1, 3.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {/* Alert pulse */}
                {isAlert && !isCritical && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: statusColor }}
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 3.2 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}

                {/* Charging soft pulse */}
                {isCharging && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: "#00E59B" }}
                    animate={{ opacity: [0.5, 0.1, 0.5], scale: [1, 2.5, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {/* Robot dot */}
                <div
                  className="w-3 h-3 rounded-full relative"
                  style={{
                    background: r.color,
                    boxShadow: `0 0 9px ${r.color}, 0 0 0 2px ${style.ring}`,
                  }}
                />

                {/* Hover tooltip */}
                {isHovered && !isSelected && (
                  <div
                    className={`absolute ${tooltipBelow ? "top-5" : "bottom-5"} ${tooltipLeft} pointer-events-none`}
                    style={{ zIndex: 999, whiteSpace: "nowrap" }}
                  >
                    <div
                      className="font-mono-tech text-[10px] bg-[#0B0F14]/98 border border-[#243041] rounded-md px-2.5 py-2 shadow-2xl min-w-[190px]"
                      style={{ backdropFilter: "blur(8px)" }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-white font-semibold">{r.id}</span>
                        {r.callsign && (
                          <span className="text-[#64748B] text-[9px]">· {r.callsign}</span>
                        )}
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest ml-auto"
                          style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}
                        >
                          {richLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-0.5 gap-x-3 text-[#94A3B8]">
                        <span>task</span>
                        <span className="text-white text-right truncate max-w-[90px]">{r.task ? r.task.type : "—"}</span>
                        <span>zone</span>
                        <span className="text-white text-right">{r.task ? r.task.zone : "—"}</span>
                        {r.status === "charging" ? (
                          <>
                            <span>charging</span>
                            <span className="text-right" style={{ color: "#00E59B" }}>
                              {Math.round(r.battery)}% {r.est_charge_ticks != null ? `· ${r.est_charge_ticks}t` : ""}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>eta</span>
                            <span className="text-white text-right">{r.eta_s != null ? `${r.eta_s}s` : "—"}</span>
                          </>
                        )}
                        <span>battery</span>
                        <span className="text-right" style={{ color: r.battery < 10 ? "#FF3B30" : r.battery < 30 ? "#FFB020" : "#00E59B" }}>
                          {Math.round(r.battery)}%
                        </span>
                        {r.health_score != null && (
                          <>
                            <span>health</span>
                            <span className="text-right" style={{ color: r.reliability_tier === "critical" ? "#FF3B30" : r.reliability_tier === "degraded" ? "#FFB020" : "#00E59B" }}>
                              {r.health_score}%
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-[#243041] text-[9px] text-[#475569] uppercase tracking-widest">
                        click to inspect
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-t border-[#243041] bg-[#0B0F14]/90 backdrop-blur z-20 rounded-b-lg font-mono-tech text-[10px] uppercase tracking-widest text-[#64748B]">
        <span>{robots.length} units</span>
        <span>
          {robots.filter(r => r.status === "charging").length > 0 && (
            <span className="text-emerald mr-3">
              {robots.filter(r => r.status === "charging").length} charging
            </span>
          )}
          {trails.length > 0 && <span className="text-amber mr-3">{trails.length} active reroutes</span>}
          {selectedRobotId && routePts.length > 0 && (
            <span className="text-cyan mr-3">{routePts.length} route checkpoints</span>
          )}
          {replayRobotId
            ? <span className="text-amber">replaying {replayRobotId} · esc to close</span>
            : selectedRobotId
            ? <span className="text-cyan">inspecting {selectedRobotId} · esc to close</span>
            : "live"
          }
        </span>
      </div>
    </div>
  );
}