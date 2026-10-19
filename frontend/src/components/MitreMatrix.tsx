import { useState } from "react";
import type { ThreatEvent } from "../types";
import { Shield, AlertTriangle, Crosshair, CheckCircle2 } from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface MitreMatrixProps {
  events: ThreatEvent[];
  currentTick: number;
}

interface TacticColumn {
  id: string;
  name: string;
  description: string;
  techniques: Array<{
    id: string;
    name: string;
    action_type: string;
  }>;
}

const TACTICS_DATA: TacticColumn[] = [
  {
    id: "initial_access",
    name: "Initial Access",
    description: "Techniques used to gain an initial foothold.",
    techniques: [
      { id: "T1078.004", name: "Valid Accounts: Cloud / OAuth", action_type: "initial_access" },
      { id: "T1566.001", name: "Spearphishing Attachment", action_type: "initial_access" },
      { id: "T1190", name: "Exploit Public-Facing App", action_type: "initial_access" },
    ],
  },
  {
    id: "execution",
    name: "Execution",
    description: "Techniques that result in adversary-controlled code running.",
    techniques: [
      { id: "T1059.001", name: "PowerShell Interactive Beacon", action_type: "execution" },
      { id: "T1059.003", name: "Windows Command Shell", action_type: "execution" },
      { id: "T1204.002", name: "Malicious File Execution", action_type: "execution" },
    ],
  },
  {
    id: "persistence",
    name: "Persistence",
    description: "Techniques to maintain access across restarts and credentials.",
    techniques: [
      { id: "T1195.002", name: "Software Supply Chain Injection", action_type: "persistence" },
      { id: "T1543", name: "Create or Modify System Process", action_type: "persistence" },
      { id: "T1053", name: "Scheduled Task / Cron Job", action_type: "persistence" },
    ],
  },
  {
    id: "privilege_escalation",
    name: "Privilege Escalation",
    description: "Techniques to gain higher-level permissions.",
    techniques: [
      { id: "T1558.003", name: "Kerberoasting & Ticket Forgery", action_type: "privilege_escalation" },
      { id: "T1068", name: "Exploitation for Privilege Escalation", action_type: "privilege_escalation" },
      { id: "T1548", name: "Abuse Elevation Control (UAC)", action_type: "privilege_escalation" },
    ],
  },
  {
    id: "defense_evasion",
    name: "Defense Evasion",
    description: "Techniques to avoid detection by security defenses.",
    techniques: [
      { id: "T1055.001", name: "DLL / Memory Injection", action_type: "defense_evasion" },
      { id: "T1070.001", name: "Security Event Log Clear", action_type: "defense_evasion" },
      { id: "T1562.001", name: "Disable Security Tools / Defender", action_type: "defense_evasion" },
      { id: "T1027", name: "Obfuscated / Packed Payload", action_type: "defense_evasion" },
    ],
  },
  {
    id: "credential_access",
    name: "Credential Access",
    description: "Techniques for stealing credentials like passwords and tokens.",
    techniques: [
      { id: "T1552.001", name: "Credentials in Local Repositories", action_type: "credential_access" },
      { id: "T1003.001", name: "LSASS Memory Password Dump", action_type: "credential_access" },
      { id: "T1555.003", name: "Credentials from Web Browsers / Vaults", action_type: "credential_access" },
    ],
  },
  {
    id: "lateral_movement",
    name: "Lateral Movement",
    description: "Techniques to extend access to other systems on the network.",
    techniques: [
      { id: "T1550.002", name: "Pass the Hash / Kerberos Ticket", action_type: "lateral_movement" },
      { id: "T1021.002", name: "SMB / Windows Admin Shares (PsExec)", action_type: "lateral_movement" },
      { id: "T1078.004", name: "Cloud IAM Role Assumption (SAML)", action_type: "lateral_movement" },
    ],
  },
  {
    id: "collection",
    name: "Collection",
    description: "Techniques to gather data of interest prior to exfiltration.",
    techniques: [
      { id: "T1560.001", name: "Archive Collected Data (AES / 7z)", action_type: "collection" },
      { id: "T1530", name: "Data from Cloud Storage (S3 / Blob)", action_type: "collection" },
      { id: "T1005", name: "Data from Local System", action_type: "collection" },
    ],
  },
  {
    id: "command_and_control",
    name: "Command & Control",
    description: "Techniques to communicate with systems under adversary control.",
    techniques: [
      { id: "T1071.001", name: "Web Protocols (HTTPS C2 Beacon)", action_type: "command_and_control" },
      { id: "T1071.004", name: "DNS Tunneling Protocol", action_type: "command_and_control" },
      { id: "T1573", name: "Encrypted Symmetric Channel", action_type: "command_and_control" },
    ],
  },
  {
    id: "exfiltration",
    name: "Exfiltration",
    description: "Techniques used to steal data from your network.",
    techniques: [
      { id: "T1048.003", name: "Exfiltration Over Unencrypted/TLS Protocol", action_type: "exfiltration" },
      { id: "T1041", name: "Exfiltration Over C2 Channel", action_type: "exfiltration" },
    ],
  },
  {
    id: "impact",
    name: "Impact",
    description: "Techniques to disrupt, destroy, or manipulate systems and data.",
    techniques: [
      { id: "T1486", name: "Data Encrypted for Impact (Ransomware)", action_type: "impact" },
      { id: "T1490", name: "Inhibit System Recovery (Delete Shadows)", action_type: "impact" },
      { id: "T1651", name: "Cloud Administration Impairment", action_type: "impact" },
    ],
  },
];

export const MitreMatrix: React.FC<MitreMatrixProps> = ({ events }) => {
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);

  // Map active detections
  const detectedTechniques = new Map<string, ThreatEvent>();
  events.forEach((ev) => {
    detectedTechniques.set(ev.mitre_technique_id, ev);
  });

  const selectedEvent = selectedTechniqueId ? detectedTechniques.get(selectedTechniqueId) : null;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 p-4 overflow-hidden select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
            <Shield size={16} /> MITRE ATT&CK® Enterprise Matrix Navigator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time correlation of observed adversary tactics, techniques, and procedures (TTPs).
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
            <span className="text-slate-400">Techniques Triggered:</span>
            <span className="text-rose-400 font-bold">{detectedTechniques.size} Active</span>
          </div>
        </div>
      </div>

      {/* Main Horizontal Scrolling Matrix */}
      <div className="flex-1 overflow-x-auto overflow-y-auto pb-4">
        <div className="inline-flex gap-3 min-w-max">
          {TACTICS_DATA.map((tactic) => {
            const hasDetections = tactic.techniques.some((t) => detectedTechniques.has(t.id));

            return (
              <div
                key={tactic.id}
                className="w-56 flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-lg overflow-hidden backdrop-blur"
              >
                {/* Tactic Column Header */}
                <div
                  className={`p-2.5 border-b text-xs font-mono font-bold ${
                    hasDetections
                      ? "bg-rose-950/40 border-rose-900/60 text-rose-300"
                      : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{tactic.name}</span>
                    {hasDetections && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    )}
                  </div>
                </div>

                {/* Technique Cards */}
                <div className="p-2 flex flex-col gap-2 flex-1">
                  {tactic.techniques.map((tech) => {
                    const detected = detectedTechniques.get(tech.id);
                    const isSelected = selectedTechniqueId === tech.id;

                    return (
                      <button
                        key={tech.id}
                        onClick={() => {
                          setSelectedTechniqueId(tech.id);
                          audioEngine.playClick(detected ? 1600 : 900);
                        }}
                        className={`text-left p-2 rounded text-xs transition border relative ${
                          detected
                            ? isSelected
                              ? "bg-rose-900/40 border-rose-400 text-white shadow-lg shadow-rose-950/50"
                              : "bg-rose-950/30 border-rose-800/60 text-rose-200 hover:border-rose-500"
                            : isSelected
                            ? "bg-slate-800 border-cyan-400 text-white"
                            : "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">
                            {tech.id}
                          </span>
                          {detected && (
                            <span className="text-[9px] uppercase px-1 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              {detected.severity}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] leading-tight font-medium font-sans">
                          {tech.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Technique Inspector Drawer */}
      {selectedTechniqueId && (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-cyan-400 font-bold flex items-center gap-2">
              <Crosshair size={14} /> Technique Intelligence: {selectedTechniqueId}
            </span>
            <button
              onClick={() => setSelectedTechniqueId(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {selectedEvent ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-400 block mb-1">Detected Phase:</span>
                <span className="text-white font-sans font-semibold text-sm">
                  {selectedEvent.title}
                </span>
                <p className="text-slate-300 text-xs font-sans mt-1">
                  {selectedEvent.description}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Observed IOC Artifacts:</span>
                <ul className="space-y-1">
                  {selectedEvent.ioc_indicators.map((ioc, i) => (
                    <li
                      key={i}
                      className="bg-black/60 px-2 py-1 rounded text-rose-300 border border-rose-950 font-mono text-[10px] truncate"
                    >
                      {ioc}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Containment Strategy:</span>
                <div className="p-2 bg-emerald-950/20 border border-emerald-800/40 rounded text-emerald-300 text-[11px] leading-relaxed">
                  <CheckCircle2 size={12} className="inline mr-1 text-emerald-400" />
                  Isolate affected nodes ({selectedEvent.affected_node_ids.join(", ")}) and deploy
                  synthesized Sigma rule to EDR agent cluster.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 py-1 flex items-center gap-2">
              <AlertTriangle size={14} /> No active detections recorded for this technique in current
              simulation tick.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
