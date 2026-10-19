import { useState, useEffect } from "react";
import type { IncidentDossier } from "../types";
import { fetchDossier } from "../services/api";
import { ShieldAlert, Download, Copy, Check, Terminal, FileText } from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface ForensicDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForensicDossierModal: React.FC<ForensicDossierModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dossier, setDossier] = useState<IncidentDossier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDossier();
    }
  }, [isOpen]);

  const loadDossier = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDossier();
      setDossier(data);
    } catch (e) {
      console.error("Failed to load incident dossier:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    audioEngine.playClick(1700);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadJSON = () => {
    if (!dossier) return;
    const blob = new Blob([JSON.stringify(dossier, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dossier.incident_id}_forensic_dossier.json`;
    a.click();
    URL.revokeObjectURL(url);
    audioEngine.playClick(1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="hud-panel w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl shadow-cyan-950/20">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
                FORENSIC INCIDENT DOSSIER // {dossier?.incident_id || "LOADING..."}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Generated: {dossier?.generated_at ? new Date(dossier.generated_at).toUTCString() : "Pending"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadJSON}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Download size={14} /> Export JSON
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white text-sm font-mono"
            >
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans">
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 font-mono">
              Compiling forensic audit telemetry and synthesizing Sigma/YARA signatures...
            </div>
          ) : dossier ? (
            <>
              {/* Executive Summary & Containment Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 hud-panel-elevated p-4">
                  <span className="text-xs font-mono text-cyan-400 font-bold block mb-1">
                    EXECUTIVE SUMMARY
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {dossier.executive_summary}
                  </p>
                </div>

                <div className="hud-panel-elevated p-4 flex flex-col justify-between">
                  <span className="text-xs font-mono text-slate-400 font-bold block">
                    STATUS OF CONTAINMENT
                  </span>
                  <div className="my-2">
                    <span
                      className={`badge text-sm py-1 px-3 ${
                        dossier.containment_status === "CONTAINED"
                          ? "badge-secure"
                          : "badge-critical"
                      }`}
                    >
                      {dossier.containment_status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {dossier.isolated_nodes} / {dossier.total_compromised_nodes} Compromised Hosts Isolated
                  </div>
                </div>
              </div>

              {/* Key Indicators of Compromise (IOCs) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-mono font-bold text-cyan-400 flex items-center gap-2">
                    <Terminal size={16} /> KEY INDICATORS OF COMPROMISE (IOCs)
                  </h3>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        dossier.key_iocs.map((i) => i.indicator).join("\n"),
                        "all_iocs"
                      )
                    }
                    className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedKey === "all_iocs" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    Copy All IOCs
                  </button>
                </div>

                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Indicator</th>
                        <th className="p-2.5">Artifact Type</th>
                        <th className="p-2.5">MITRE Technique</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {dossier.key_iocs.map((ioc, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5 text-rose-300 select-all font-semibold">
                            {ioc.indicator}
                          </td>
                          <td className="p-2.5 text-cyan-400">{ioc.type}</td>
                          <td className="p-2.5 text-slate-400">{ioc.technique}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Auto-Synthesized Detection Signatures (Sigma & YARA) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sigma Rules */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-mono font-bold text-amber-400 flex items-center gap-2">
                      <FileText size={16} /> SYNTHESIZED SIGMA SIEM RULE
                    </h3>
                    <button
                      onClick={() => copyToClipboard(dossier.sigma_rules[0] || "", "sigma")}
                      className="text-xs font-mono text-slate-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedKey === "sigma" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      Copy Rule
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed select-all">
                    {dossier.sigma_rules[0] || "# No Sigma rule generated"}
                  </pre>
                </div>

                {/* YARA Rules */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-mono font-bold text-purple-400 flex items-center gap-2">
                      <FileText size={16} /> SYNTHESIZED YARA MALWARE SIGNATURE
                    </h3>
                    <button
                      onClick={() => copyToClipboard(dossier.yara_rules[0] || "", "yara")}
                      className="text-xs font-mono text-slate-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      {copiedKey === "yara" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      Copy Rule
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed select-all">
                    {dossier.yara_rules[0] || "// No YARA rule generated"}
                  </pre>
                </div>
              </div>

              {/* Chronological Incident Timeline */}
              <div>
                <h3 className="text-sm font-mono font-bold text-cyan-400 mb-2">
                  CHRONOLOGICAL BREACH TIMELINE
                </h3>
                <div className="space-y-2">
                  {dossier.timeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-start gap-4 text-xs font-mono"
                    >
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold whitespace-nowrap">
                        TICK {item.tick}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold font-sans">{item.title}</span>
                          <span className="text-[10px] text-slate-400">({item.mitre})</span>
                        </div>
                        <p className="text-slate-300 font-sans">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
