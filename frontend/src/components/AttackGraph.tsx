import React, { useRef, useEffect, useState, useCallback } from "react";
import type { AttackNode, NetworkEdge, PacketTelemetry } from "../types";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface AttackGraphProps {
  nodes: AttackNode[];
  edges: NetworkEdge[];
  packets: PacketTelemetry[];
  selectedNodeId: string | null;
  onSelectNode: (node: AttackNode | null) => void;
}

interface Particle {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  protocol: string;
  isMalicious: boolean;
}

// Well-spaced hierarchical coordinates preventing label overlap
const OPTIMIZED_LAYOUT: Record<string, { x: number; y: number }> = {
  // Scenario 1: Operation Red Eclipse
  c2_external: { x: 140, y: 320 },
  corp_firewall: { x: 380, y: 320 },
  dev_workstation: { x: 620, y: 170 },
  internal_git: { x: 620, y: 470 },
  build_runner: { x: 880, y: 170 },
  domain_controller: { x: 880, y: 470 },
  aws_vault: { x: 1120, y: 320 },

  // Scenario 2: BlackBasta
  threat_phish: { x: 140, y: 320 },
  finance_wkstn: { x: 420, y: 320 },
  domain_ctrl: { x: 740, y: 180 },
  db_finance: { x: 740, y: 460 },
  san_storage: { x: 1040, y: 320 },

  // Scenario 3: PhantomBeacon
  authoritative_dns: { x: 160, y: 320 },
  corp_dns_resolver: { x: 560, y: 320 },
  rnd_workstation: { x: 960, y: 320 },
};

export const AttackGraph: React.FC<AttackGraphProps> = ({
  nodes,
  edges,
  packets,
  selectedNodeId,
  onSelectNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 30, y: 20, scale: 0.88 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node Dragging
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  const particlesRef = useRef<Particle[]>([]);

  // Initialize node layout from optimized positions
  useEffect(() => {
    setNodePositions((prev) => {
      const next: Record<string, { x: number; y: number }> = { ...prev };
      nodes.forEach((node, idx) => {
        if (!next[node.id]) {
          const opt = OPTIMIZED_LAYOUT[node.id];
          next[node.id] = opt ? { ...opt } : { x: 200 + (idx % 3) * 320, y: 180 + Math.floor(idx / 3) * 240 };
        }
      });
      return next;
    });
  }, [nodes]);

  // Spawn traveling packet pulses
  useEffect(() => {
    if (packets.length === 0) return;
    const latest = packets.slice(-6);
    latest.forEach((pkt) => {
      const srcPos = nodePositions[pkt.source_id];
      const tgtPos = nodePositions[pkt.target_id];
      if (srcPos && tgtPos) {
        particlesRef.current.push({
          id: `${pkt.id}_${Math.random()}`,
          sourceX: srcPos.x,
          sourceY: srcPos.y,
          targetX: tgtPos.x,
          targetY: tgtPos.y,
          progress: 0,
          speed: 0.015 + Math.random() * 0.008,
          protocol: pkt.protocol,
          isMalicious: pkt.is_malicious,
        });
      }
    });

    if (particlesRef.current.length > 40) {
      particlesRef.current = particlesRef.current.slice(-40);
    }
  }, [packets, nodePositions]);

  // 60FPS High-Tech Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let radarAngle = 0;
    let pulseAngle = 0;

    const render = () => {
      radarAngle += 0.02;
      pulseAngle += 0.05;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // 1. Draw High-Tech Coordinate Grid & Center Origin
      ctx.strokeStyle = "rgba(0, 243, 255, 0.06)";
      ctx.lineWidth = 1;
      const gridSize = 48;
      const startX = -transform.x / transform.scale - 300;
      const startY = -transform.y / transform.scale - 300;
      const endX = startX + width / transform.scale + 600;
      const endY = startY + height / transform.scale + 600;

      ctx.beginPath();
      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // 2. Draw Rotating Cyber Radar Sweep Background
      const centerWorldX = 640;
      const centerWorldY = 320;
      const radarRadius = 540;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerWorldX, centerWorldY, radarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Concentric range rings
      [180, 360, 540].forEach((r) => {
        ctx.beginPath();
        ctx.arc(centerWorldX, centerWorldY, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 243, 255, 0.08)";
        ctx.stroke();
      });

      // Rotating radar beam
      ctx.beginPath();
      ctx.moveTo(centerWorldX, centerWorldY);
      ctx.arc(
        centerWorldX,
        centerWorldY,
        radarRadius,
        radarAngle,
        radarAngle + 0.35
      );
      ctx.closePath();
      const radarGrad = ctx.createRadialGradient(
        centerWorldX,
        centerWorldY,
        0,
        centerWorldX,
        centerWorldY,
        radarRadius
      );
      radarGrad.addColorStop(0, "rgba(0, 243, 255, 0.12)");
      radarGrad.addColorStop(1, "rgba(0, 243, 255, 0.0)");
      ctx.fillStyle = radarGrad;
      ctx.fill();
      ctx.restore();

      // 3. Draw Tactical Subnet Zones / Cluster Boundaries
      const drawZone = (x: number, y: number, w: number, h: number, label: string, color: string) => {
        ctx.save();
        ctx.fillStyle = `${color}08`;
        ctx.strokeStyle = `${color}40`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 6]);

        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 14);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone header pill
        ctx.fillStyle = "#090d16";
        ctx.fillRect(x + 14, y - 10, ctx.measureText(label).width + 24, 20);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 14, y - 10, ctx.measureText(label).width + 24, 20);

        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + 24, y);
        ctx.restore();
      };

      // Draw 5 Strategic Security Enclaves
      drawZone(40, 180, 200, 280, "ZONE 01 // EXTERNAL C2 INFRASTRUCTURE", "#ff2a5f");
      drawZone(280, 180, 200, 280, "ZONE 02 // PERIMETER DMZ INGRESS", "#ffaa00");
      drawZone(520, 80, 440, 220, "ZONE 03 // DEV & BUILD WORKSTATIONS", "#00f3ff");
      drawZone(520, 360, 440, 220, "ZONE 04 // ENTERPRISE ACTIVE DIRECTORY & REPO", "#a855f7");
      drawZone(1020, 180, 220, 280, "ZONE 05 // AWS CLOUD STORAGE VAULT", "#00ff9d");

      // 4. Draw Edges with Glowing Sockets
      edges.forEach((edge) => {
        const src = nodePositions[edge.source];
        const tgt = nodePositions[edge.target];
        if (!src || !tgt) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (edge.is_blocked) {
          // Blocked / Severed Edge by Defensive ACL
          ctx.strokeStyle = "rgba(255, 42, 95, 0.4)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw containment barrier cross
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          ctx.strokeStyle = "#ff2a5f";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(midX - 7, midY - 7);
          ctx.lineTo(midX + 7, midY + 7);
          ctx.moveTo(midX + 7, midY - 7);
          ctx.lineTo(midX - 7, midY + 7);
          ctx.stroke();
        } else if (edge.is_compromised_path) {
          // Compromised Lateral Movement Path with Intense Neon Glow
          ctx.strokeStyle = "#ff2a5f";
          ctx.lineWidth = 3;
          ctx.shadowColor = "#ff2a5f";
          ctx.shadowBlur = 14;
          ctx.stroke();
        } else {
          // Clean Operational Edge
          ctx.strokeStyle = "rgba(45, 59, 94, 0.8)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Midpoint Protocol Badge
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;
        ctx.fillStyle = "#0a0f1d";
        ctx.fillRect(midX - 22, midY - 9, 44, 18);
        ctx.strokeStyle = edge.is_blocked ? "#ff2a5f" : edge.is_compromised_path ? "#ff2a5f" : "#2d3b5e";
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 22, midY - 9, 44, 18);

        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = edge.is_compromised_path ? "#ff2a5f" : "#94a3b8";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(edge.protocol, midX, midY);
        ctx.restore();
      });

      // 5. Draw Traveling Packet Particles with Luminous Trails
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.progress += p.speed;
        if (p.progress <= 1) {
          activeParticles.push(p);
          const curX = p.sourceX + (p.targetX - p.sourceX) * p.progress;
          const curY = p.sourceY + (p.targetY - p.sourceY) * p.progress;

          ctx.save();
          ctx.beginPath();
          ctx.arc(curX, curY, p.isMalicious ? 4.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = p.isMalicious ? "#ff2a5f" : "#00f3ff";
          ctx.shadowColor = p.isMalicious ? "#ff2a5f" : "#00f3ff";
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.restore();
        }
      });
      particlesRef.current = activeParticles;

      // 6. Draw High-Tech Node Avatars
      nodes.forEach((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return;

        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;
        const isCompromised = node.status === "compromised" || node.status === "exfiltrating";
        const isIsolated = node.status === "isolated";
        const isC2 = node.node_type === "c2_server";

        ctx.save();

        // Shockwave animation for compromised hosts
        if (isCompromised) {
          const pulseR = 34 + Math.sin(pulseAngle * 1.5) * 8;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 42, 95, 0.4)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Honeycomb Quarantine Barrier Shield for Isolated Nodes
        if (isIsolated) {
          ctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const angle = (a * Math.PI) / 3;
            const hx = pos.x + 36 * Math.cos(angle);
            const hy = pos.y + 36 * Math.sin(angle);
            if (a === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(0, 255, 157, 0.12)";
          ctx.fill();
          ctx.strokeStyle = "#00ff9d";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#00ff9d";
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Selection Target Ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 38, 0, Math.PI * 2);
          ctx.strokeStyle = "#00f3ff";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Node Main Body Orb
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 26, 0, Math.PI * 2);

        const nodeGrad = ctx.createRadialGradient(pos.x - 6, pos.y - 6, 2, pos.x, pos.y, 26);
        if (isIsolated) {
          nodeGrad.addColorStop(0, "#052e16");
          nodeGrad.addColorStop(1, "#021208");
          ctx.strokeStyle = "#00ff9d";
        } else if (isCompromised) {
          nodeGrad.addColorStop(0, "#4c0519");
          nodeGrad.addColorStop(1, "#1f0208");
          ctx.strokeStyle = "#ff2a5f";
        } else if (isC2) {
          nodeGrad.addColorStop(0, "#3b0764");
          nodeGrad.addColorStop(1, "#180229");
          ctx.strokeStyle = "#c084fc";
        } else {
          nodeGrad.addColorStop(0, "#0f172a");
          nodeGrad.addColorStop(1, "#030712");
          ctx.strokeStyle = isHovered ? "#00f3ff" : "#38bdf8";
        }

        ctx.fillStyle = nodeGrad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = ctx.strokeStyle as string;
        ctx.shadowBlur = isCompromised || isIsolated || isSelected ? 16 : 6;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Tactical 3-Letter Code
        let typeCode = "DEV";
        if (node.node_type === "domain_controller") typeCode = "DC";
        else if (node.node_type === "cloud_bucket") typeCode = "S3";
        else if (node.node_type === "firewall") typeCode = "FW";
        else if (node.node_type === "database") typeCode = "DB";
        else if (node.node_type === "c2_server") typeCode = "C2";
        else if (node.node_type === "build_runner") typeCode = "RUN";
        else if (node.node_type === "server") typeCode = "SRV";

        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.fillStyle = isIsolated ? "#00ff9d" : isCompromised ? "#ff2a5f" : isC2 ? "#c084fc" : "#38bdf8";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typeCode, pos.x, pos.y);

        // Status pill indicator above node
        if (isIsolated) {
          ctx.fillStyle = "#022c22";
          ctx.fillRect(pos.x - 34, pos.y - 46, 68, 16);
          ctx.strokeStyle = "#00ff9d";
          ctx.strokeRect(pos.x - 34, pos.y - 46, 68, 16);
          ctx.fillStyle = "#00ff9d";
          ctx.font = "bold 8px 'JetBrains Mono', monospace";
          ctx.fillText("QUARANTINED", pos.x, pos.y - 37);
        } else if (isCompromised) {
          ctx.fillStyle = "#4c0519";
          ctx.fillRect(pos.x - 34, pos.y - 46, 68, 16);
          ctx.strokeStyle = "#ff2a5f";
          ctx.strokeRect(pos.x - 34, pos.y - 46, 68, 16);
          ctx.fillStyle = "#ff2a5f";
          ctx.font = "bold 8px 'JetBrains Mono', monospace";
          ctx.fillText("COMPROMISED", pos.x, pos.y - 37);
        }

        // High-Contrast Label Pill Below Node (No Text Overlap!)
        const labelText = node.label;
        ctx.font = "bold 11px 'Space Grotesk', sans-serif";
        const labelWidth = ctx.measureText(labelText).width;

        ctx.fillStyle = "rgba(10, 15, 29, 0.92)";
        ctx.fillRect(pos.x - labelWidth / 2 - 8, pos.y + 34, labelWidth + 16, 20);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(pos.x - labelWidth / 2 - 8, pos.y + 34, labelWidth + 16, 20);

        ctx.fillStyle = "#f8fafc";
        ctx.fillText(labelText, pos.x, pos.y + 45);

        // IP Address Below Label
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = isCompromised ? "#fda4af" : "#94a3b8";
        ctx.fillText(node.ip, pos.x, pos.y + 64);

        ctx.restore();
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, nodePositions, transform, selectedNodeId, hoveredNodeId]);

  // Mouse interaction
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - transform.x) / transform.scale;
    const worldY = (e.clientY - rect.top - transform.y) / transform.scale;

    const hit = nodes.find((n) => {
      const pos = nodePositions[n.id];
      if (!pos) return false;
      return Math.hypot(pos.x - worldX, pos.y - worldY) <= 30;
    });

    if (hit) {
      setDraggedNodeId(hit.id);
      onSelectNode(hit);
      audioEngine.playClick(1500);
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - transform.x) / transform.scale;
    const worldY = (e.clientY - rect.top - transform.y) / transform.scale;

    if (draggedNodeId) {
      setNodePositions((prev) => ({
        ...prev,
        [draggedNodeId]: { x: Math.round(worldX), y: Math.round(worldY) },
      }));
    } else if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    } else {
      const hit = nodes.find((n) => {
        const pos = nodePositions[n.id];
        if (!pos) return false;
        return Math.hypot(pos.x - worldX, pos.y - worldY) <= 30;
      });
      setHoveredNodeId(hit ? hit.id : null);
    }
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const handleZoom = useCallback((delta: number) => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.2, prev.scale + delta)),
    }));
    audioEngine.playClick(900);
  }, []);

  const handleResetView = useCallback(() => {
    setTransform({ x: 30, y: 20, scale: 0.88 });
    audioEngine.playClick(1000);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-crosshair"
      />

      {/* Floating HUD Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg backdrop-blur-md z-10 shadow-xl">
        <button
          onClick={() => handleZoom(0.15)}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={handleResetView}
          title="Reset Topology View"
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Topology Legend with Glowing Indicators */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-lg backdrop-blur-md text-[11px] font-mono flex items-center gap-4 text-slate-300 z-10 shadow-xl">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50"></span> Clean Endpoint
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50 animate-pulse"></span> Compromised Host
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50"></span> Honeycomb Quarantine
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-md shadow-purple-400/50"></span> Threat C2
        </span>
      </div>
    </div>
  );
};
