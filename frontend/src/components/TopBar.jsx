import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, Radio } from "lucide-react";
export default function TopBar({ tick }) {
  const loc = useLocation();
  const onCC = loc.pathname.startsWith("/command-center");
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-[#243041] bg-[#0B0F14]/90 backdrop-blur-md z-30 relative" data-testid="topbar">
      <Link to="/" className="flex items-center gap-3" data-testid="topbar-logo">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-md border border-[#00D1FF]/40 glow-cyan" />
          <Radio size={16} className="text-cyan relative" strokeWidth={2.2} />
        </div>
        <div>
          <div className="font-display text-sm font-semibold tracking-tight text-white leading-none">
            FRIL <span className="text-[#64748B] font-normal">// fleet reliability layer</span>
          </div>
          <div className="font-mono-tech text-[10px] text-[#64748B] uppercase tracking-widest mt-1">
            warehouse orchestration · live
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-6">
        {tick !== undefined && (
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono-tech text-[#94A3B8]" data-testid="topbar-tick">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E59B] blink-dot" />
            <span className="uppercase tracking-widest">TICK</span>
            <span className="text-white">{tick}</span>
          </div>
        )}
        <Link to="/" className={`text-sm transition-colors ${!onCC ? "text-white" : "text-[#94A3B8] hover:text-white"}`} data-testid="nav-overview">Overview</Link>
        <Link to="/command-center" className={`text-sm transition-colors flex items-center gap-2 ${onCC ? "text-cyan" : "text-[#94A3B8] hover:text-white"}`} data-testid="nav-command-center">
          <Activity size={14} /> Command Center
        </Link>
      </div>
    </div>
  );
}