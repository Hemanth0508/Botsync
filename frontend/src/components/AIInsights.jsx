import React, { useState } from "react";
import { motion } from "framer-motion";
import { Brain, RefreshCw, Sparkles, AlertTriangle, ShieldAlert, Wrench } from "lucide-react";
import { requestInsights } from "../lib/api";

const SECTIONS = [
  {
    key: "root_cause",
    label: "Root Cause Hypothesis",
    Icon: AlertTriangle,
    color: "#FFB020",
    border: "rgba(255,176,32,0.2)",
    bg: "rgba(255,176,32,0.05)",
  },
  {
    key: "operational_risk",
    label: "Operational Risk",
    Icon: ShieldAlert,
    color: "#FF3B30",
    border: "rgba(255,59,48,0.2)",
    bg: "rgba(255,59,48,0.05)",
  },
  {
    key: "recovery_action",
    label: "Suggested Recovery Action",
    Icon: Wrench,
    color: "#00E59B",
    border: "rgba(0,229,155,0.2)",
    bg: "rgba(0,229,155,0.05)",
  },
];

function hasStructuredAnalysis(data) {
  return Boolean(data?.root_cause || data?.operational_risk || data?.recovery_action);
}

function extraBullets(data) {
  if (!hasStructuredAnalysis(data)) return data?.insights || [];
  const sectionText = new Set(
    [data.root_cause, data.operational_risk, data.recovery_action].filter(Boolean),
  );
  return (data.insights || []).filter((line) => {
    const norm = line.toLowerCase();
    return !sectionText.has(line) &&
      !norm.startsWith("root cause hypothesis:") &&
      !norm.startsWith("operational risk:") &&
      !norm.startsWith("suggested recovery:");
  });
}

export default function AIInsights({ initial }) {
  const [data, setData] = useState(initial || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await requestInsights(25));
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const structured = data && hasStructuredAnalysis(data);
  const bullets = data ? extraBullets(data) : [];

  return (
    <div className="panel flex flex-col overflow-hidden" data-testid="ai-insights">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#243041]">
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-emerald" />
          <h3 className="font-display text-sm text-white">AI Insights</h3>
          <span className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] ml-1">haiku 4.5</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-mono-tech uppercase tracking-widest text-cyan border border-[#00D1FF]/30 rounded px-2 py-1 hover:bg-[#00D1FF]/10 transition-colors disabled:opacity-50"
          data-testid="generate-insights-btn"
        >
          {loading ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {loading ? "analyzing" : "analyze"}
        </button>
      </div>
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        {error && <div className="text-[#FF3B30] font-mono-tech text-xs mb-2">{error}</div>}
        {!data && !loading && (
          <div className="text-[#64748B] text-xs leading-relaxed">
            <span className="font-mono-tech uppercase tracking-widest text-[10px]">// waiting</span>
            <p className="mt-2">
              Tap <span className="text-cyan">analyze</span> for operational root-cause reasoning across congestion,
              vendor reliability, battery stress, and reroute behavior.
            </p>
          </div>
        )}
        {data && (
          <div>
            <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] mb-2">
              generated · {data.generated_at} · tick {data.tick}
              {(data.deterministic_fallback || data.reasoning_mode === "deterministic") && (
                <span className="ml-2 text-amber">(deterministic reasoning)</span>
              )}
            </div>

            {structured ? (
              <div className="space-y-2.5">
                {SECTIONS.map((sec, idx) => {
                  const text = data[sec.key];
                  if (!text) return null;
                  const { Icon } = sec;
                  return (
                    <motion.div
                      key={sec.key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.07, duration: 0.2 }}
                      className="rounded-md px-3 py-2.5 border"
                      style={{ background: sec.bg, borderColor: sec.border }}
                      data-testid={`insight-section-${sec.key}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon size={10} style={{ color: sec.color }} />
                        <span
                          className="font-mono-tech text-[9px] uppercase tracking-widest"
                          style={{ color: sec.color }}
                        >
                          {sec.label}
                        </span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-[#CBD5E1]">{text}</p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <ol className="space-y-2 list-none">
                {(data.insights || []).map((ins, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex gap-2 text-[12.5px] leading-relaxed text-[#CBD5E1]"
                    data-testid={`insight-${idx}`}
                  >
                    <span className="font-mono-tech text-cyan text-[11px] mt-0.5 shrink-0">
                      [{String(idx + 1).padStart(2, "0")}]
                    </span>
                    <span>{ins}</span>
                  </motion.li>
                ))}
              </ol>
            )}

            {structured && bullets.length > 0 && (
              <div className="mt-3 pt-2 border-t border-[#243041]">
                <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#475569] mb-1.5">
                  supporting signals
                </div>
                <ol className="space-y-1.5 list-none">
                  {bullets.map((ins, idx) => (
                    <li
                      key={idx}
                      className="flex gap-2 text-[11px] leading-relaxed text-[#94A3B8]"
                      data-testid={`insight-bullet-${idx}`}
                    >
                      <span className="font-mono-tech text-cyan text-[10px] shrink-0">
                        [{String(idx + 1).padStart(2, "0")}]
                      </span>
                      <span>{ins}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
