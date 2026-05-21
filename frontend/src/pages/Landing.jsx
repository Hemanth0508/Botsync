import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TopBar from "../components/TopBar";
import {
  ArrowRight, Brain, ShieldCheck, AlertTriangle,
  RefreshCw, Workflow, Sparkles, Network, Zap, Gauge,
} from "lucide-react";

const HERO_BG    = "https://static.prod-images.emergentagent.com/jobs/69170d74-b135-4cf9-aa32-626688a600cd/images/b700027d41666c3529d28443421f573100cf439e935a8dd7cf100d44fa49166f.png";
const GRID_BG    = "https://static.prod-images.emergentagent.com/jobs/69170d74-b135-4cf9-aa32-626688a600cd/images/ec839dbd6e6465d58a06113af1b801fcdf9ab78a81e1495acdc16db0482d92fb.png";
const VENDORS_IMG = "https://static.prod-images.emergentagent.com/jobs/69170d74-b135-4cf9-aa32-626688a600cd/images/0f11bcc600553df62888d32223c1ec63e32e1535b9bdd90376dc5b3c3c0f232e.png";

const FEATURES = [
  { Icon: Workflow,      title: "Execution Orchestration",  body: "Continuous task choreography across heterogeneous robot fleets — accepting, executing, retrying, completing." },
  { Icon: AlertTriangle, title: "Anomaly Detection",        body: "Surface congestion, ack drift, docking failures, vendor latency, and stalled execution before they cascade." },
  { Icon: ShieldCheck,   title: "Deterministic Recovery",   body: "Reroute traffic, retry workflows, redistribute load, and reassign idle units — without human in the loop." },
  { Icon: Brain,         title: "AI Operational Layer",     body: "Claude Haiku 4.5 synthesizes recent logs into sharp observations on bottlenecks, reliability risk, and throughput patterns." },
  { Icon: Network,       title: "Multi-Vendor Coordination",body: "Treat Vendor A, B and C as one fleet. Profile-aware scheduling smooths heterogenous reliability characteristics." },
  { Icon: Gauge,         title: "Reliability Telemetry",    body: "Throughput, recovery rate, congestion heat, active incidents — streamed live across the operations center." },
];

const VENDORS = [
  { id: "A", color: "#00D1FF", name: "Vendor A", traits: ["High speed","Lower reliability","Higher failure rate"], desc: "Optimized for throughput under stable conditions. Contributes disproportionately to retries when congestion peaks." },
  { id: "B", color: "#00E59B", name: "Vendor B", traits: ["Slower","Highly stable","Rare failures"],              desc: "Reliability anchor of the fleet. Used to absorb retries and stabilize critical corridors." },
  { id: "C", color: "#FFB020", name: "Vendor C", traits: ["Balanced","Moderate latency","Moderate reliability"],  desc: "General-purpose execution units. Default routing target when no profile constraint applies." },
];

const RECOVERY = [
  { Icon: Network,   title: "Congestion Recovery",      lines: ["Detect peak zone density > 70%", "Reroute affected robots", "Throttle new task assignment"] },
  { Icon: RefreshCw, title: "Missing Acknowledgement",  lines: ["Detect ack drop window", "Retry task on same unit", "Failover to backup robot if persistent"] },
  { Icon: Workflow,  title: "Blocked Path",             lines: ["Detect stall against target", "Compute alternate route", "Redirect nearby units to clear corridor"] },
  { Icon: Zap,       title: "Idle Timeout",             lines: ["Detect robot inactivity > N ticks", "Reassign queued workflow", "Return unit to charging if battery low"] },
];

export default function Landing() {
  return (
    <div className="bg-base text-white min-h-screen relative">
      <TopBar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32" data-testid="hero">
        <div className="absolute inset-0 opacity-[0.18] pointer-events-none" style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 radial-glow pointer-events-none" />
        <div className="absolute inset-0 scanlines opacity-50 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 border border-[#00D1FF]/30 bg-[#00D1FF]/[0.06] rounded-full px-3 py-1 font-mono-tech text-[10px] uppercase tracking-widest text-cyan"
            data-testid="hero-eyebrow"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan blink-dot" />
            reliability simulator · v0.1 · operational intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mt-5 max-w-4xl"
            data-testid="hero-title"
          >
            A reliability intelligence layer for <span className="text-cyan">multi-vendor</span> autonomous warehouses.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-5 text-[#94A3B8] text-base sm:text-lg max-w-2xl leading-relaxed"
          >
            FRIL monitors execution health across heterogeneous robot fleets, surfaces operational anomalies in real time,
            and applies deterministic recovery to keep throughput stable — augmented by an AI layer that turns raw incident
            streams into operational observations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link to="/command-center" data-testid="hero-cta-primary"
              className="group inline-flex items-center gap-2 bg-cyan text-[#0B0F14] font-medium rounded-md px-5 py-2.5 hover:bg-white transition-colors">
              Open Command Center <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 border border-[#243041] hover:border-white/40 text-white rounded-md px-5 py-2.5 transition-colors">
              How it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl"
          >
            {[
              { k: "fleet vendors", v: "3",        c: "#00D1FF" },
              { k: "tracked zones", v: "6",        c: "#00E59B" },
              { k: "recovery flows",v: "4",        c: "#FFB020" },
              { k: "ai model",      v: "Haiku 4.5",c: "#94A3B8" },
            ].map((s) => (
              <div key={s.k} className="panel px-3 py-3" data-testid={`hero-stat-${s.k}`}>
                <div className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B]">{s.k}</div>
                <div className="font-display text-xl mt-1" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WHY */}
      <section className="relative py-20 border-y border-[#243041]" data-testid="why">
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: `url(${GRID_BG})`, backgroundSize: "cover" }} />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="font-mono-tech text-[10px] uppercase tracking-widest text-cyan mb-3">// the problem</div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl">
            As warehouse automation scales, instability emerges between fleets — not inside them.
          </h2>
          <p className="text-[#94A3B8] mt-5 max-w-3xl leading-relaxed">
            Robots from multiple vendors must coordinate across complex workflows. Blocked paths, congestion, delayed
            acknowledgements, docking failures, vendor latency, idle timeouts and execution drift compound silently
            until throughput collapses. FRIL acts as an orchestration intelligence layer that continuously monitors
            fleet movement, restores workflows, and surfaces operational risk before it cascades.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section id="how" className="py-24" data-testid="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="font-mono-tech text-[10px] uppercase tracking-widest text-cyan mb-3">// capabilities</div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl">Operational intelligence, end to end.</h2>
            </div>
            <div className="hidden md:block font-mono-tech text-[10px] uppercase tracking-widest text-[#64748B]">06 modules</div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="panel p-5 hover:border-[#00D1FF]/40 transition-colors group"
                data-testid={`feature-${i}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <f.Icon size={18} className="text-cyan group-hover:scale-110 transition-transform" />
                  <span className="font-mono-tech text-[9px] uppercase tracking-widest text-[#64748B]">0{i+1}</span>
                </div>
                <h3 className="font-display text-lg text-white">{f.title}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed mt-1.5">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VENDORS */}
      <section className="py-24 border-t border-[#243041] relative" data-testid="vendors">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div>
            <div className="font-mono-tech text-[10px] uppercase tracking-widest text-cyan mb-3">// fleet composition</div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Three vendors. One reliability surface.</h2>
            <p className="text-[#94A3B8] mt-5 leading-relaxed">
              Each vendor brings a distinct reliability profile. FRIL treats heterogeneity as a feature — using
              profile-aware scheduling to absorb retries, smooth latency, and stabilize critical corridors.
            </p>
            <div className="mt-6 aspect-[16/10] rounded-lg border border-[#243041] bg-[#0F131A] bg-cover bg-center"
              style={{ backgroundImage: `url(${VENDORS_IMG})` }} data-testid="vendor-render" />
          </div>
          <div className="space-y-3">
            {VENDORS.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="panel p-5 flex gap-4 items-start"
                data-testid={`vendor-${v.id}`}
              >
                <div className="w-3.5 h-3.5 rounded-full shrink-0 mt-1" style={{ background: v.color, boxShadow: `0 0 14px ${v.color}` }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg">{v.name}</h3>
                    <span className="font-mono-tech text-[10px] uppercase tracking-widest text-[#64748B]">id · {v.id}</span>
                  </div>
                  <p className="text-[#94A3B8] text-sm mt-1.5 leading-relaxed">{v.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {v.traits.map(t => (
                      <span key={t} className="font-mono-tech text-[10px] uppercase tracking-widest border border-[#243041] rounded px-2 py-0.5 text-[#94A3B8]">{t}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RECOVERY */}
      <section className="py-24 border-t border-[#243041]" data-testid="recovery">
        <div className="max-w-6xl mx-auto px-6">
          <div className="font-mono-tech text-[10px] uppercase tracking-widest text-cyan mb-3">// recovery logic</div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl">
            Deterministic orchestration. Not LLM hand-waving.
          </h2>
          <p className="text-[#94A3B8] mt-5 max-w-3xl leading-relaxed">
            Every anomaly triggers a deterministic response — rerouting, retrying, redistributing, reassigning.
            The AI layer observes; the recovery layer acts.
          </p>
          <div className="mt-10 grid md:grid-cols-2 gap-4">
            {RECOVERY.map((r, i) => (
              <div key={r.title} className="panel p-5" data-testid={`recovery-${i}`}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center border border-[#243041] bg-[#00E59B]/5">
                    <r.Icon size={15} className="text-emerald" />
                  </div>
                  <h3 className="font-display text-base text-white">{r.title}</h3>
                </div>
                <ul className="space-y-1.5">
                  {r.lines.map((l, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[#CBD5E1]">
                      <span className="font-mono-tech text-emerald text-[10px] mt-1 shrink-0">▸</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section className="py-24 border-t border-[#243041] relative" data-testid="ai-section">
        <div className="absolute inset-0 radial-glow opacity-50 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="font-mono-tech text-[10px] uppercase tracking-widest text-emerald mb-3">// ai operational layer</div>
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">The system writes its own postmortem.</h2>
              <p className="text-[#94A3B8] mt-5 leading-relaxed">
                Every operational window, FRIL feeds the recent log stream to Claude Haiku 4.5 and gets back sharp,
                analytical observations — bottlenecks, recurring failures, throughput drops, congestion patterns, reliability risks.
              </p>
              <Link to="/command-center" data-testid="ai-cta"
                className="mt-6 inline-flex items-center gap-2 bg-cyan text-[#0B0F14] font-medium rounded-md px-5 py-2.5 hover:bg-white transition-colors">
                Try Live AI Insights <Sparkles size={15} />
              </Link>
            </div>
            <div className="panel p-5 font-mono-tech text-[12.5px] leading-relaxed">
              <div className="text-[10px] uppercase tracking-widest text-[#64748B] mb-3">sample · operational summary</div>
              {[
                "Repeated congestion near the assembly corridor increased average task latency by 14% during peak intervals.",
                "Vendor A robots are contributing disproportionately to docking retries under high-throughput conditions.",
                "Recovery logic successfully stabilized 92% of failed workflows during the last operational cycle.",
                "Outbound throughput drop correlates with Vendor B acknowledgment latency spikes — fallback rerouting recommended.",
              ].map((line, i) => (
                <div key={i} className="flex gap-2 mb-2 last:mb-0">
                  <span className="text-cyan shrink-0">[{String(i+1).padStart(2,'0')}]</span>
                  <span className="text-[#CBD5E1]">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-[#243041]" data-testid="cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="font-mono-tech text-[10px] uppercase tracking-widest text-cyan mb-4">// step inside</div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
            Watch a multi-vendor fleet stabilize itself in real time.
          </h2>
          <p className="text-[#94A3B8] mt-5 leading-relaxed max-w-2xl mx-auto">
            Open the command center to see live orchestration, the incident stream, operational metrics and the AI
            intelligence layer — all running on a simulated multi-vendor warehouse.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/command-center" data-testid="footer-cta"
              className="group inline-flex items-center gap-2 bg-cyan text-[#0B0F14] font-medium rounded-md px-6 py-3 hover:bg-white transition-colors">
              Launch Command Center <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#243041] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 font-mono-tech text-[10px] uppercase tracking-widest text-[#64748B]">
          <div>FRIL · fleet reliability intelligence layer</div>
          <div>built as a startup-grade operational intelligence simulator</div>
        </div>
      </footer>
    </div>
  );
}
