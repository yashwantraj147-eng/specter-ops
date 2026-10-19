import type { ScenarioMetadata, ThreatEvent, AttackNode } from "../types";
import { Crosshair, ChevronRight, Activity } from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface ThreatFeedSidebarProps {
  scenario: ScenarioMetadata | null;
  events: ThreatEvent[];
  nodes: AttackNode[];
  currentTick: number;
  onSeek: (tick: number) => void;
}

export const ThreatFeedSidebar: React.FC<ThreatFeedSidebarProps> = ({
  scenario,
  events,
  nodes,
  currentTick,
  onSeek,
}) => {
  const compromisedCount = nodes.filter(
    (n) => n.status === "compromised" || n.status === "exfiltrating"
  ).length;
  const isolatedCount = nodes.filter((n) => n.status === "isolated").length;
  const blastRadiusPercent = nodes.length > 0 ? Math.round((compromisedCount / nodes.length) * 100) : 0;

  return (
    <aside className="w-80 h-full flex flex-col bg-slate-950/95 border-r border-slate-800 font-mono select-none overflow-hidden">
      {/* Scenario Profile Card */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Crosshair size={12} /> THREAT INTEL PROFILE
          </span>
          <span className="badge badge-critical text-[9px] py-0.5">
            {scenario?.difficulty || "APT"}
          </span>
        </div>

        <h3 className="text-sm font-sans font-bold text-white leading-tight">
          {scenario?.title || "Operation Red Eclipse"}
        </h3>

        <div className="mt-2 text-xs text-slate-400 font-sans leading-relaxed">
          <span className="text-slate-500 font-mono text-[10px] block">ADVERSARY:</span>
          <span className="text-rose-300 font-semibold">{scenario?.threat_actor}</span>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400 font-sans line-clamp-2">
          {scenario?.objective}
        </p>
      </div>

      {/* Threat Posture & Blast Radius Metrics */}
      <div className="p-3 border-b border-slate-800 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 block">BLAST RADIUS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-lg font-bold ${
                blastRadiusPercent > 40
                  ? "text-rose-400"
                  : blastRadiusPercent > 0
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {blastRadiusPercent}%
            </span>
            <span className="text-[10px] text-slate-500">
              ({compromisedCount}/{nodes.length})
            </span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full ${
                blastRadiusPercent > 40 ? "bg-rose-500" : "bg-amber-400"
              }`}
              style={{ width: `${blastRadiusPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 block">CONTAINMENT</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-lg font-bold ${
                isolatedCount > 0 ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {isolatedCount}
            </span>
            <span className="text-[10px] text-slate-500">Quarantined</span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${(isolatedCount / (compromisedCount || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Threat Events Chronology Feed */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-bold">
            <Activity size={13} className="text-cyan-400" /> KILL-CHAIN TIMELINE
          </span>
          <span className="text-[10px] text-slate-500">{events.length} Milestones</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {events.map((ev) => {
            const isTriggered = ev.tick <= currentTick;
            const isCurrent = ev.tick === currentTick;

            return (
              <button
                key={ev.id}
                onClick={() => {
                  onSeek(ev.tick);
                  audioEngine.playClick(1200);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition text-xs relative ${
                  isCurrent
                    ? "bg-slate-900 border-cyan-400 text-white shadow-md shadow-cyan-950/40"
                    : isTriggered
                    ? "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    : "bg-slate-950 border-slate-900/60 text-slate-600 hover:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isCurrent
                          ? "bg-cyan-500 text-black"
                          : isTriggered
                          ? "bg-slate-800 text-cyan-400"
                          : "bg-slate-900 text-slate-600"
                      }`}
                    >
                      TICK {ev.tick}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {ev.mitre_technique_id}
                    </span>
                  </div>

                  <span
                    className={`badge text-[9px] py-0 px-1.5 ${
                      ev.severity === "critical"
                        ? "badge-critical"
                        : ev.severity === "high"
                        ? "badge-high"
                        : "badge-medium"
                    }`}
                  >
                    {ev.severity}
                  </span>
                </div>

                <div className="font-sans font-semibold text-xs leading-snug line-clamp-1">
                  {ev.title}
                </div>

                <p className="font-sans text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal">
                  {ev.description}
                </p>

                {isCurrent && (
                  <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                    <span>ACTIVE ATTACK VECTOR</span>
                    <ChevronRight size={12} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
