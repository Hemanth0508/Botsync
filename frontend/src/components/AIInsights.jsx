import React, { useState } from "react";
import { motion } from "framer-motion";
import { Brain, RefreshCw, Sparkles } from "lucide-react";
import { requestInsights } from "../lib/api";

export default function AIInsights({ initial }) {
  const [data, setData] = useState(initial || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true); setError(null);
    try { setData(await requestInsights(25)); }
    catch (e) { setError(e?.response?.data?.detail || e.message || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="panel flex flex-col overflow-hidden" data-testid="ai-insights">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#243041]">
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-emerald" />
          <h3 className="font-display text-sm text-white">AI Insights</h3>
          <span className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] ml-1">haiku 4.5</span>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-mono-tech uppercase tracking-widest text-cyan border border-[#00D1FF]/30 rounded px-2 py-1 hover:bg-[#00D1FF]/10 transition-colors disabled:opacity-50"
          data-testid="generate-insights-btn">
          {loading ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {loading ? "thinking" : "summarize"}
        </button>
      </div>
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        {error && <div className="text-[#FF3B30] font-mono-tech text-xs mb-2">{error}</div>}
        {!data && !loading && (
          <div className="text-[#64748B] text-xs leading-relaxed">
            <span className="font-mono-tech uppercase tracking-widest text-[10px]">// waiting</span>
            <p className="mt-2">Tap <span className="text-cyan">summarize</span> to read the system's take on recent fleet behavior — bottlenecks, repeat failures, and reliability risk.</p>
          </div>
        )}
        {data && (
          <div>
            <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B] mb-2">
              generated · {data.generated_at} · tick {data.tick}
              {data.fallback && <span className="ml-2 text-amber">(fallback)</span>}
            </div>
            <ol className="space-y-2 list-none">
              {(data.insights || []).map((ins, idx) => (
                <motion.li key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                  className="flex gap-2 text-[12.5px] leading-relaxed text-[#CBD5E1]" data-testid={`insight-${idx}`}>
                  <span className="font-mono-tech text-cyan text-[11px] mt-0.5 shrink-0">[{String(idx+1).padStart(2,'0')}]</span>
                  <span>{ins}</span>
                </motion.li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}