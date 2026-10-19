import React, { useRef, useEffect, useState } from "react";
import { Globe, ShieldAlert, Terminal, Radio } from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface WarHub {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  type: "threat_actor" | "defense_target" | "cloud_vault" | "relay";
  threatActor?: string;
}

interface AttackArc {
  id: string;
  sourceHub: WarHub;
  targetHub: WarHub;
  progress: number;
  speed: number;
  color: string;
  payloadType: string;
}

const GLOBAL_HUBS: WarHub[] = [
  { id: "moscow", name: "Moscow Command Node", country: "RU", lat: 55.75, lng: 37.61, type: "threat_actor", threatActor: "APT29 (Midnight Blizzard)" },
  { id: "bucharest", name: "Bucharest Syndicate", country: "RO", lat: 44.42, lng: 26.10, type: "threat_actor", threatActor: "BlackBasta / FIN7" },
  { id: "pyongyang", name: "Pyongyang Covert Unit", country: "KP", lat: 39.03, lng: 125.76, type: "threat_actor", threatActor: "Lazarus Group (HIDDEN COBRA)" },
  { id: "virginia", name: "AWS us-east-1 Vault (Ashburn)", country: "US", lat: 39.04, lng: -77.48, type: "cloud_vault" },
  { id: "dc", name: "Enterprise HQ (Washington DC)", country: "US", lat: 38.90, lng: -77.03, type: "defense_target" },
  { id: "frankfurt", name: "Frankfurt Financial Core", country: "DE", lat: 50.11, lng: 8.68, type: "defense_target" },
  { id: "tokyo", name: "Tokyo Telecom Hub", country: "JP", lat: 35.67, lng: 139.65, type: "relay" },
  { id: "sf", name: "Lead DevOps Lab (San Francisco)", country: "US", lat: 37.77, lng: -122.41, type: "defense_target" },
  { id: "singapore", name: "Singapore Gateway", country: "SG", lat: 1.35, lng: 103.81, type: "relay" },
];

export const CyberWarMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedHub, setSelectedHub] = useState<WarHub | null>(GLOBAL_HUBS[0]);
  const [tickerLogs, setTickerLogs] = useState<string[]>([]);
  const arcsRef = useRef<AttackArc[]>([]);

  // Convert lat/lng to Canvas 2D projection
  const projectCoordinates = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng + 180) / 360) * width;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = height / 2 - (width * mercN) / (2 * Math.PI);
    return { x: Math.max(20, Math.min(width - 20, x)), y: Math.max(20, Math.min(height - 20, y)) };
  };

  // Continual attack arc spawner
  useEffect(() => {
    const interval = setInterval(() => {
      const threatSources = GLOBAL_HUBS.filter((h) => h.type === "threat_actor");
      const targets = GLOBAL_HUBS.filter((h) => h.type !== "threat_actor");

      const source = threatSources[Math.floor(Math.random() * threatSources.length)];
      const target = targets[Math.floor(Math.random() * targets.length)];

      const payloads = [
        "OAUTH_TOKEN_REPLAY",
        "SUNBURST_DLL_INJECT",
        "DNS_TUNNEL_EXFIL",
        "PASS_THE_HASH_SMB",
        "CHACHA20_RANSOM_BURST",
        "AWS_STS_SAML_EXFIL",
      ];
      const payloadType = payloads[Math.floor(Math.random() * payloads.length)];
      const color = payloadType.includes("RANSOM") || payloadType.includes("SUNBURST") ? "#ff2a5f" : "#00f3ff";

      arcsRef.current.push({
        id: Math.random().toString(),
        sourceHub: source,
        targetHub: target,
        progress: 0,
        speed: 0.006 + Math.random() * 0.006,
        color,
        payloadType,
      });

      // Ticker Log
      const timeStr = new Date().toLocaleTimeString();
      setTickerLogs((prev) => [
        `[${timeStr}] [${payloadType}] ${source.name} ➔ ${target.name} (${(Math.random() * 80 + 10).toFixed(1)} MB/s)`,
        ...prev.slice(0, 14),
      ]);
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  // 60FPS Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let pulse = 0;

    const render = () => {
      pulse += 0.05;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Holographic Latitude / Longitude Matrix Grid
      ctx.strokeStyle = "rgba(0, 243, 255, 0.07)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw World Continents Outline Silhouette (Vector Stylized Polygon Approximation)
      ctx.fillStyle = "rgba(13, 22, 38, 0.5)";
      ctx.strokeStyle = "rgba(0, 243, 255, 0.18)";
      ctx.lineWidth = 1.2;

      // North America
      const na = [
        projectCoordinates(70, -165, width, height),
        projectCoordinates(60, -70, width, height),
        projectCoordinates(45, -55, width, height),
        projectCoordinates(25, -80, width, height),
        projectCoordinates(15, -90, width, height),
        projectCoordinates(30, -115, width, height),
        projectCoordinates(55, -135, width, height),
      ];
      ctx.beginPath();
      na.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // South America
      const sa = [
        projectCoordinates(12, -75, width, height),
        projectCoordinates(-5, -35, width, height),
        projectCoordinates(-35, -55, width, height),
        projectCoordinates(-55, -70, width, height),
        projectCoordinates(-20, -70, width, height),
      ];
      ctx.beginPath();
      sa.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eurasia
      const eu = [
        projectCoordinates(70, 20, width, height),
        projectCoordinates(70, 170, width, height),
        projectCoordinates(40, 140, width, height),
        projectCoordinates(20, 110, width, height),
        projectCoordinates(10, 80, width, height),
        projectCoordinates(30, 50, width, height),
        projectCoordinates(35, -10, width, height),
        projectCoordinates(60, -5, width, height),
      ];
      ctx.beginPath();
      eu.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Africa
      const af = [
        projectCoordinates(35, -5, width, height),
        projectCoordinates(30, 35, width, height),
        projectCoordinates(12, 50, width, height),
        projectCoordinates(-35, 20, width, height),
        projectCoordinates(-35, 15, width, height),
        projectCoordinates(5, 5, width, height),
      ];
      ctx.beginPath();
      af.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Australia
      const au = [
        projectCoordinates(-12, 130, width, height),
        projectCoordinates(-15, 150, width, height),
        projectCoordinates(-35, 150, width, height),
        projectCoordinates(-35, 115, width, height),
        projectCoordinates(-20, 115, width, height),
      ];
      ctx.beginPath();
      au.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Render Ballistic Attack Arcs
      const activeArcs: AttackArc[] = [];
      arcsRef.current.forEach((arc) => {
        arc.progress += arc.speed;
        if (arc.progress <= 1) {
          activeArcs.push(arc);

          const srcPt = projectCoordinates(arc.sourceHub.lat, arc.sourceHub.lng, width, height);
          const tgtPt = projectCoordinates(arc.targetHub.lat, arc.targetHub.lng, width, height);

          // Quadratic Bézier control point arching above
          const midX = (srcPt.x + tgtPt.x) / 2;
          const midY = (srcPt.y + tgtPt.y) / 2 - Math.min(120, Math.hypot(tgtPt.x - srcPt.x, tgtPt.y - srcPt.y) * 0.35);

          // Draw dotted arc path
          ctx.beginPath();
          ctx.moveTo(srcPt.x, srcPt.y);
          ctx.quadraticCurveTo(midX, midY, tgtPt.x, tgtPt.y);
          ctx.strokeStyle = `${arc.color}33`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Compute moving head position along quadratic curve
          const t = arc.progress;
          const headX = (1 - t) * (1 - t) * srcPt.x + 2 * (1 - t) * t * midX + t * t * tgtPt.x;
          const headY = (1 - t) * (1 - t) * srcPt.y + 2 * (1 - t) * t * midY + t * t * tgtPt.y;

          // Draw Glowing Missile Pulse Head
          ctx.beginPath();
          ctx.arc(headX, headY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = arc.color;
          ctx.shadowColor = arc.color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      arcsRef.current = activeArcs;

      // 4. Render Global City / Hub Nodes
      GLOBAL_HUBS.forEach((hub) => {
        const pt = projectCoordinates(hub.lat, hub.lng, width, height);
        const isThreat = hub.type === "threat_actor";
        const isCloud = hub.type === "cloud_vault";
        const isSelected = selectedHub?.id === hub.id;

        // Pulsing shockwave ring
        const ringRad = 10 + Math.sin(pulse + hub.lat) * 4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, ringRad, 0, Math.PI * 2);
        ctx.strokeStyle = isThreat ? "rgba(255, 42, 95, 0.4)" : "rgba(0, 243, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Base node circle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isThreat ? "#ff2a5f" : isCloud ? "#a855f7" : "#00ff9d";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = isThreat ? "#ff8ba7" : "#cbd5e1";
        ctx.fillText(hub.name, pt.x + 8, pt.y + 3);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedHub]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const hit = GLOBAL_HUBS.find((h) => {
      const pt = projectCoordinates(h.lat, h.lng, canvas.width, canvas.height);
      return Math.hypot(pt.x - clickX, pt.y - clickY) <= 22;
    });

    if (hit) {
      setSelectedHub(hit);
      audioEngine.playClick(1500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden font-mono select-none relative">
      {/* Top Telemetry Stats Bar */}
      <div className="h-10 bg-slate-900/80 border-b border-slate-800 px-4 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-cyan-400 font-bold flex items-center gap-1.5 uppercase">
            <Globe size={14} className="animate-spin text-cyan-400" /> GLOBAL CYBER WAR COMMAND
          </span>
          <span className="text-slate-500">|</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Radio size={12} className="text-rose-400" /> ACTIVE ATTACK VECTORS:{" "}
            <span className="text-rose-400 font-bold">1,482,910 THREATS</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">GLOBAL EXFIL RATE:</span>
            <span className="text-cyan-300 font-bold">4.82 Gbps</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-[10px] font-bold">
            <ShieldAlert size={11} /> APT ATTACK ALERT ACTIVE
          </div>
        </div>
      </div>

      {/* Main Body: Canvas + Side Intercept Feed */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* World Map Canvas */}
        <div className="flex-1 h-full relative">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair"
          />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 bg-slate-900/85 border border-slate-800 p-2.5 rounded-lg text-[10px] flex items-center gap-4 backdrop-blur-md">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50"></span> Threat Actor Origin
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-500/50"></span> Enterprise Asset Target
            </span>
            <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-md shadow-purple-500/50"></span> Cloud S3 / Key Vault
            </span>
          </div>
        </div>

        {/* Right Side: Real-Time Intercept Stream */}
        <div className="w-80 h-full bg-slate-900/70 border-l border-slate-800 flex flex-col backdrop-blur-md">
          <div className="p-2.5 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-900/90">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Terminal size={13} /> GLOBAL INTERCEPT TICKER
            </span>
            <span className="text-[10px] text-slate-500">LIVE FEED</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-[10px]">
            {tickerLogs.map((log, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded bg-black/60 border border-slate-800/80 text-slate-300 font-mono hover:border-cyan-500/50 transition truncate"
              >
                {log}
              </div>
            ))}
          </div>

          {/* Active Target Intel Box */}
          {selectedHub && (
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 text-xs">
              <span className="text-[10px] text-slate-500 block mb-1">SELECTED HUB:</span>
              <div className="text-white font-bold">{selectedHub.name}</div>
              <div className="text-[11px] text-cyan-400 mt-0.5">
                {selectedHub.threatActor ? `Adversary: ${selectedHub.threatActor}` : `Infrastructure Role: ${selectedHub.type.toUpperCase()}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
