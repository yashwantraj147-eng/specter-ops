import { useState } from "react";
import type { AttackNode, PacketTelemetry } from "../types";
import {
  ShieldAlert,
  Radio,
  Search,
  ExternalLink,
  Lock,
} from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface PacketConsoleSidebarProps {
  selectedNode: AttackNode | null;
  packets: PacketTelemetry[];
  onIsolateNode: (nodeId: string) => void;
  onInspectPayload: (payload: string) => void;
}

export const PacketConsoleSidebar: React.FC<PacketConsoleSidebarProps> = ({
  selectedNode,
  packets,
  onIsolateNode,
  onInspectPayload,
}) => {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredPackets = packets.filter((pkt) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      pkt.protocol.toLowerCase().includes(q) ||
      pkt.source_ip.toLowerCase().includes(q) ||
      pkt.target_ip.toLowerCase().includes(q) ||
      pkt.payload_preview.toLowerCase().includes(q) ||
      (pkt.threat_signature && pkt.threat_signature.toLowerCase().includes(q))
    );
  });

  return (
    <aside className="w-96 h-full flex flex-col bg-slate-950/95 border-l border-slate-800 font-mono select-none overflow-hidden">
      {/* Top Half: Node Inspector & Triage Controls */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Radio size={13} /> HOST TRIAGE INSPECTOR
          </span>
          {selectedNode && (
            <span
              className={`badge text-[9px] ${
                selectedNode.status === "compromised" || selectedNode.status === "exfiltrating"
                  ? "badge-critical"
                  : selectedNode.status === "isolated"
                  ? "badge-secure"
                  : "badge-medium"
              }`}
            >
              {selectedNode.status}
            </span>
          )}
        </div>

        {selectedNode ? (
          <div className="space-y-2.5">
            <div>
              <h4 className="text-sm font-sans font-bold text-white truncate">
                {selectedNode.label}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="text-cyan-400 font-semibold">{selectedNode.ip}</span>
                <span>•</span>
                <span>{selectedNode.subnet}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">OS / PLATFORM</span>
                <span className="text-slate-200 truncate block">{selectedNode.os}</span>
              </div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ACTIVE PROCESS</span>
                <span className="text-rose-400 truncate block">
                  {selectedNode.active_process || "System Core"}
                </span>
              </div>
            </div>

            {/* Services */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">LISTENING SERVICES:</span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.services.map((svc, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            </div>

            {/* Tactical Containment Action */}
            <div className="pt-2 border-t border-slate-800/80">
              {selectedNode.status === "isolated" ? (
                <div className="p-2 bg-emerald-950/30 border border-emerald-800/50 rounded text-emerald-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock size={13} /> HOST QUARANTINED
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">ACL ACTIVE</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onIsolateNode(selectedNode.id);
                    audioEngine.playContainmentLock();
                  }}
                  className="w-full btn-danger justify-center text-xs py-2 shadow-lg"
                >
                  <ShieldAlert size={14} /> QUARANTINE HOST IMMEDIATELY
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            Click any network node on the topology to inspect services, processes, and execute defensive quarantine.
          </div>
        )}
      </div>

      {/* Bottom Half: Live Packet Stream */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-2.5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
            PCAP FLOW STREAM ({filteredPackets.length})
          </span>
          <div className="relative flex-1 max-w-[170px]">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter protocol / IP..."
              className="w-full bg-slate-900 border border-slate-800 rounded pl-6 pr-2 py-1 text-[10px] text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredPackets.slice().reverse().map((pkt) => (
            <div
              key={pkt.id}
              className={`p-2 rounded border text-xs transition ${
                pkt.is_malicious
                  ? "bg-rose-950/20 border-rose-900/50 hover:border-rose-700"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    pkt.is_malicious
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  }`}
                >
                  {pkt.protocol}:{pkt.port}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">
                    H: {pkt.entropy.toFixed(2)}
                  </span>
                  {pkt.is_malicious && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate mb-1">
                <span className="text-slate-300">{pkt.source_ip}</span>
                <span>→</span>
                <span className="text-slate-300">{pkt.target_ip}</span>
              </div>

              <div className="text-[10px] text-slate-300 bg-black/50 p-1.5 rounded border border-slate-900 line-clamp-2 select-all font-mono">
                {pkt.payload_preview}
              </div>

              {pkt.payload_raw && (
                <div className="mt-1.5 flex justify-end">
                  <button
                    onClick={() => {
                      onInspectPayload(pkt.payload_raw!);
                      audioEngine.playClick(1400);
                    }}
                    className="text-[9px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 border border-cyan-900 hover:border-cyan-500 px-1.5 py-0.5 rounded transition"
                  >
                    <ExternalLink size={10} /> Cryptanalysis
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
