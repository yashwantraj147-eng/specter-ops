import React, { useState, useRef, useEffect } from "react";
import { Terminal, Send, X } from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface SpecterTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoContain: () => void;
  onOpenDossier: () => void;
  onInspectPayload: (payload: string) => void;
}

interface CommandLog {
  type: "input" | "output" | "error" | "system";
  text: string;
}

export const SpecterTerminal: React.FC<SpecterTerminalProps> = ({
  isOpen,
  onClose,
  onAutoContain,
  onOpenDossier,
  onInspectPayload,
}) => {
  const [inputVal, setInputVal] = useState("");
  const [logs, setLogs] = useState<CommandLog[]>([
    { type: "system", text: "SPECTER//OPS Cyber Defense Shell v3.4 [x86_64-hardened]" },
    { type: "system", text: "Type 'help' to inspect tactical commands or 'scan' to evaluate network posture." },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const handleCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    setLogs((prev) => [...prev, { type: "input", text: `root@specter-ops:~# ${trimmed}` }]);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);
    setInputVal("");
    audioEngine.playClick(1400);

    const parts = trimmed.split(" ");
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    switch (cmd) {
      case "help":
        setLogs((prev) => [
          ...prev,
          {
            type: "output",
            text: `AVAILABLE COMMANDS:
  help                    - Display available tactical shell commands
  scan                    - Run active vulnerability & IOC signature scan
  auto-contain            - Trigger master autonomous containment on infected hosts
  dossier                 - Open forensic incident dossier and export Sigma/YARA
  decrypt <payload>       - Forward payload buffer into Cryptanalysis Lab
  status                  - Print active cluster DEFCON posture and socket stats
  matrix                  - Toggle cybernetic green phosphor mode
  clear                   - Purge terminal display buffer`,
          },
        ]);
        break;

      case "scan":
        audioEngine.playThreatAlarm();
        setLogs((prev) => [
          ...prev,
          {
            type: "system",
            text: `[!] INITIATING CLUSTER-WIDE EDR FORENSIC SCAN...
[+] Scanning WKSTN-704... [VULNERABILITY DETECTED: OAuth Token Replay]
[+] Scanning CI/CD RUNNER-01... [MALICIOUS HOOK: .gitlab-ci.yml poisoned]
[+] Scanning DC-CORP-01... [ALERT: SPN Kerberoast TGS Ticket Request]
[+] Scanning S3-VAULT... [DATA EXFIL: 1.42 GB streaming to avsvmcloud.com]
[✓] SCAN COMPLETE: 4 Compromised Assets Detected. High Blast Radius.`,
          },
        ]);
        break;

      case "auto-contain":
        onAutoContain();
        setLogs((prev) => [
          ...prev,
          {
            type: "system",
            text: `[✓] EXECUTING MASTER AUTONOMOUS CONTAINMENT PLAYBOOK:
[+] Isolate node: WKSTN-704 -> QUARANTINED (Egress Blocked)
[+] Isolate node: RUNNER-01 -> QUARANTINED (Egress Blocked)
[+] Sever C2 edge: 185.220.101.45:443 -> DEFENSIVE ACL DROP
[✓] Containment successfully enforced across network topology.`,
          },
        ]);
        break;

      case "dossier":
        onOpenDossier();
        setLogs((prev) => [
          ...prev,
          { type: "output", text: "[+] Opening Forensic Incident Dossier Modal..." },
        ]);
        break;

      case "decrypt":
        if (!arg) {
          setLogs((prev) => [
            ...prev,
            { type: "error", text: "Usage: decrypt <raw_string|hex|base64>" },
          ]);
        } else {
          onInspectPayload(arg);
          setLogs((prev) => [
            ...prev,
            { type: "output", text: `[+] Transferred payload buffer to Cryptanalysis Lab.` },
          ]);
        }
        break;

      case "status":
        setLogs((prev) => [
          ...prev,
          {
            type: "output",
            text: `SYSTEM POSTURE:
  Cluster Status: ACTIVE INTRUSION DETECTED
  DEFCON Level: LEVEL 1 (CRITICAL)
  Telemetry Bus: WebSocket ws://127.0.0.1:8000/ws [ONLINE]
  Acoustic Synthesizer: Web Audio Engine [ACTIVE]`,
          },
        ]);
        break;

      case "clear":
        setLogs([]);
        break;

      default:
        setLogs((prev) => [
          ...prev,
          { type: "error", text: `Unknown command: '${cmd}'. Type 'help' for tactical reference.` },
        ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(inputVal);
    } else if (e.key === "ArrowUp") {
      if (history.length > 0) {
        const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < history.length) {
          setHistoryIdx(nextIdx);
          setInputVal(history[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setInputVal("");
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="hud-panel w-full h-64 bg-black/95 border-t border-cyan-500/40 flex flex-col font-mono select-none z-30 shadow-2xl backdrop-blur-xl">
      {/* Shell Titlebar */}
      <div className="h-8 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <Terminal size={14} />
          <span>SPECTER//SHELL // ROOT PRIVILEGED EXECUTION</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-slate-800"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Log Output */}
      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-1 text-xs select-text">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`leading-relaxed whitespace-pre-wrap ${
              log.type === "input"
                ? "text-cyan-300 font-bold"
                : log.type === "system"
                ? "text-amber-400"
                : log.type === "error"
                ? "text-rose-400"
                : "text-slate-300"
            }`}
          >
            {log.text}
          </div>
        ))}
      </div>

      {/* Input Prompt */}
      <div className="h-10 bg-slate-900/90 border-t border-slate-800 px-3 flex items-center gap-2">
        <span className="text-cyan-400 font-bold text-xs">root@specter-ops:~#</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type 'help', 'scan', 'auto-contain'..."
          className="flex-1 bg-transparent text-xs text-white focus:outline-none font-mono selection:bg-cyan-500/40"
        />
        <button
          onClick={() => handleCommand(inputVal)}
          className="text-cyan-400 hover:text-cyan-200 p-1"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
};
