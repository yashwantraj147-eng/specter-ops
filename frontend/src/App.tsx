import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  SimulationState,
  ScenarioMetadata,
  AttackNode,
} from "./types";
import {
  fetchState,
  fetchScenarios,
  selectScenario,
  playSimulation,
  pauseSimulation,
  seekSimulation,
  stepForwardSimulation,
  stepBackwardSimulation,
  setSimulationSpeed,
  resetSimulation,
  isolateNode,
  triggerAutoContainment,
} from "./services/api";
import { AttackGraph } from "./components/AttackGraph";
import { MitreMatrix } from "./components/MitreMatrix";
import { PayloadInspector } from "./components/PayloadInspector";
import { FlightRecorder } from "./components/FlightRecorder";
import { ThreatFeedSidebar } from "./components/ThreatFeedSidebar";
import { PacketConsoleSidebar } from "./components/PacketConsoleSidebar";
import { ForensicDossierModal } from "./components/ForensicDossierModal";
import { audioEngine } from "./services/audioEngine";
import {
  Shield,
  ShieldAlert,
  Volume2,
  VolumeX,
  FileText,
  Activity,
  Layers,
  Binary,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";

export const App: React.FC = () => {
  const [state, setState] = useState<SimulationState | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMetadata[]>([]);
  const [selectedNode, setSelectedNode] = useState<AttackNode | null>(null);
  const [activeTab, setActiveTab] = useState<"topology" | "mitre" | "entropy">("topology");
  const [inspectorPayload, setInspectorPayload] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [containmentAlert, setContainmentAlert] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize data
  useEffect(() => {
    loadInitialData();
    setupWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [scenariosData, stateData] = await Promise.all([
        fetchScenarios(),
        fetchState(),
      ]);
      setScenarios(scenariosData.scenarios);
      setState(stateData);
      if (stateData.nodes.length > 0) {
        setSelectedNode(stateData.nodes[0]);
      }
    } catch (e) {
      console.warn("Backend not yet reachable on initial load, retrying in 2s:", e);
      setTimeout(loadInitialData, 2000);
    }
  };

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket("ws://localhost:8000/ws");
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "STATE_UPDATE" || msg.type === "TICK_ADVANCED" || msg.type === "SCENARIO_RESET") {
            setState(msg.data);
            if (msg.type === "TICK_ADVANCED") {
              audioEngine.playRadarPing();
            }
          } else if (msg.type === "AUTO_CONTAINMENT_TRIGGERED") {
            setState(msg.data);
            audioEngine.playContainmentLock();
          }
        } catch {
          // Non-JSON ping
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Attempt reconnection after 3 seconds
        setTimeout(setupWebSocket, 3000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }
  };

  // Toggle Sound FX
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioEngine.enabled = next;
    if (next) audioEngine.playClick(1500);
  };

  // Switch Scenario
  const handleSelectScenario = async (scId: string) => {
    audioEngine.playClick(1100);
    try {
      const newState = await selectScenario(scId);
      setState(newState);
      if (newState.nodes.length > 0) {
        setSelectedNode(newState.nodes[0]);
      }
    } catch (e) {
      console.error("Failed to switch scenario:", e);
    }
  };

  // Transport handlers
  const handlePlay = async () => {
    try {
      await playSimulation();
      setState((prev) => (prev ? { ...prev, is_playing: true } : null));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePause = async () => {
    try {
      await pauseSimulation();
      setState((prev) => (prev ? { ...prev, is_playing: false } : null));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeek = async (tick: number) => {
    try {
      const newState = await seekSimulation(tick);
      setState(newState);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStepForward = async () => {
    try {
      const newState = await stepForwardSimulation();
      setState(newState);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStepBackward = async () => {
    try {
      const newState = await stepBackwardSimulation();
      setState(newState);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetSpeed = async (speed: number) => {
    try {
      await setSimulationSpeed(speed);
      setState((prev) => (prev ? { ...prev, playback_speed: speed } : null));
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      const newState = await resetSimulation();
      setState(newState);
    } catch (e) {
      console.error(e);
    }
  };

  // Tactical Containment
  const handleIsolateNode = async (nodeId: string) => {
    try {
      const res = await isolateNode(nodeId);
      setState(res.state);
      audioEngine.playContainmentLock();
      setContainmentAlert(`Host quarantined. Connected ingress/egress edges blocked.`);
      setTimeout(() => setContainmentAlert(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoContainment = async () => {
    audioEngine.playThreatAlarm();
    try {
      const res = await triggerAutoContainment();
      setState(res.state);
      audioEngine.playContainmentLock();
      setContainmentAlert(
        `AUTONOMOUS CONTAINMENT ENGAGED: Malicious hosts quarantined & defense ACLs locked.`
      );
      setTimeout(() => setContainmentAlert(null), 5000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInspectPayload = useCallback((payload: string) => {
    setInspectorPayload(payload);
    setActiveTab("entropy");
    audioEngine.playClick(1600);
  }, []);

  // Compute Defcon Level
  const compromisedCount = state?.nodes.filter(
    (n) => n.status === "compromised" || n.status === "exfiltrating"
  ).length || 0;
  const defconLevel = compromisedCount >= 3 ? 1 : compromisedCount >= 2 ? 2 : compromisedCount >= 1 ? 3 : 5;

  return (
    <div className="w-screen h-screen flex flex-col bg-black text-slate-100 overflow-hidden select-none">
      {/* 1. TOP COMMAND HUD BAR */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between z-20">
        {/* Brand & Live Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/20">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-sm font-mono font-bold tracking-widest text-white uppercase flex items-center gap-2">
                SPECTER<span className="text-cyan-400">//</span>OPS
              </h1>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>CYBER THREAT FLIGHT RECORDER</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Scenario Selector Dropdown */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500">SCENARIO:</span>
            <select
              value={state?.scenario.id || "red_eclipse"}
              onChange={(e) => handleSelectScenario(e.target.value)}
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center / Right HUD Actions */}
        <div className="flex items-center gap-3">
          {/* Defcon Gauge */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-xs font-mono">
            <span className="text-slate-500">DEFCON:</span>
            <span
              className={`font-bold ${
                defconLevel === 1
                  ? "text-rose-500 animate-pulse"
                  : defconLevel === 2
                  ? "text-amber-400"
                  : "text-cyan-400"
              }`}
            >
              LEVEL {defconLevel}
            </span>
          </div>

          {/* WebSocket Status */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono ${
              wsConnected
                ? "bg-emerald-950/20 border-emerald-800 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title={wsConnected ? "WebSocket Live Stream Active" : "WebSocket Disconnected (Polling)"}
          >
            {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{wsConnected ? "STREAM" : "OFFLINE"}</span>
          </div>

          {/* Audio FX Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute Cyber Audio FX" : "Unmute Cyber Audio FX"}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded transition"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Export Incident Dossier */}
          <button
            onClick={() => {
              setIsDossierOpen(true);
              audioEngine.playClick(1300);
            }}
            className="btn-secondary text-xs"
          >
            <FileText size={14} /> Dossier
          </button>

          {/* Master Autonomous Containment Button */}
          <button
            onClick={handleAutoContainment}
            className="btn-danger text-xs font-bold"
          >
            <ShieldAlert size={14} /> AUTONOMOUS CONTAINMENT
          </button>
        </div>
      </header>

      {/* Containment Flash Notification Banner */}
      {containmentAlert && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-b border-rose-600 px-4 py-1.5 text-xs font-mono text-rose-300 flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-2">
            <Radio size={14} className="text-rose-400" /> {containmentAlert}
          </span>
          <button
            onClick={() => setContainmentAlert(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Threat Feed & Kill-Chain Chronology */}
        <ThreatFeedSidebar
          scenario={state?.scenario || null}
          events={state?.past_events || []}
          nodes={state?.nodes || []}
          currentTick={state?.current_tick || 0}
          onSeek={handleSeek}
        />

        {/* Center Primary Viewport */}
        <main className="flex-1 flex flex-col min-w-0 bg-black">
          {/* Viewport Sub-header with Tab Selectors */}
          <div className="h-10 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab("topology");
                  audioEngine.playClick(1200);
                }}
                className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition ${
                  activeTab === "topology"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers size={13} /> ATTACK TOPOLOGY
              </button>

              <button
                onClick={() => {
                  setActiveTab("mitre");
                  audioEngine.playClick(1300);
                }}
                className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition ${
                  activeTab === "mitre"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity size={13} /> MITRE ATT&CK MATRIX
              </button>

              <button
                onClick={() => {
                  setActiveTab("entropy");
                  audioEngine.playClick(1400);
                }}
                className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition ${
                  activeTab === "entropy"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Binary size={13} /> ENTROPY & CRYPTANALYSIS
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
              {state?.nodes.length || 0} Monitored Hosts // {state?.edges.length || 0} Network Sockets
            </div>
          </div>

          {/* Primary Tab Viewport Body */}
          <div className="flex-1 relative overflow-hidden">
            {activeTab === "topology" && (
              <AttackGraph
                nodes={state?.nodes || []}
                edges={state?.edges || []}
                packets={state?.packets || []}
                selectedNodeId={selectedNode?.id || null}
                onSelectNode={(node) => setSelectedNode(node)}
              />
            )}

            {activeTab === "mitre" && (
              <MitreMatrix
                events={state?.past_events || []}
                currentTick={state?.current_tick || 0}
              />
            )}

            {activeTab === "entropy" && (
              <PayloadInspector initialPayload={inspectorPayload} />
            )}
          </div>

          {/* Flight Recorder Bottom Control Bar */}
          <FlightRecorder
            currentTick={state?.current_tick || 0}
            totalTicks={state?.total_ticks || 10}
            isPlaying={state?.is_playing || false}
            playbackSpeed={state?.playback_speed || 1.0}
            currentEvent={state?.current_event || null}
            allEvents={state?.past_events || []}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onSetSpeed={handleSetSpeed}
            onReset={handleReset}
            onOpenPayloadLab={handleInspectPayload}
          />
        </main>

        {/* Right Panel: Host Triage & Live PCAP Feed */}
        <PacketConsoleSidebar
          selectedNode={selectedNode}
          packets={state?.packets || []}
          onIsolateNode={handleIsolateNode}
          onInspectPayload={handleInspectPayload}
        />
      </div>

      {/* Forensic Dossier Modal */}
      <ForensicDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />
    </div>
  );
};

export default App;
