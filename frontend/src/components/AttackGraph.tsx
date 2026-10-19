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

export const AttackGraph: React.FC<AttackGraphProps> = ({
  nodes,
  edges,
  packets,
  selectedNodeId,
  onSelectNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan and Zoom transform state
  const [transform, setTransform] = useState({ x: 40, y: 30, scale: 0.95 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node dragging
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Local positions cache so user can drag nodes
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Active traveling particles along edges
  const particlesRef = useRef<Particle[]>([]);

  // Initialize node positions from props if not yet cached
  useEffect(() => {
    setNodePositions((prev) => {
      const next = { ...prev };
      nodes.forEach((node, idx) => {
        if (!next[node.id]) {
          // Default layout if pos_x/pos_y are unset or 0
          const defaultX = node.pos_x || 150 + (idx % 3) * 260;
          const defaultY = node.pos_y || 120 + Math.floor(idx / 3) * 180;
          next[node.id] = { x: defaultX, y: defaultY };
        }
      });
      return next;
    });
  }, [nodes]);

  // Spawn dynamic particles when new packets arrive
  useEffect(() => {
    if (packets.length === 0) return;
    const latest = packets.slice(-5);
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
          speed: 0.012 + Math.random() * 0.008,
          protocol: pkt.protocol,
          isMalicious: pkt.is_malicious,
        });
      }
    });
    // Cap particles at 35 to preserve 60fps
    if (particlesRef.current.length > 35) {
      particlesRef.current = particlesRef.current.slice(-35);
    }
  }, [packets, nodePositions]);

  // Main 60fps Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let pulseAngle = 0;

    const render = () => {
      pulseAngle += 0.04;

      // Handle canvas resolution
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

      // 1. Draw subtle background coordinate grid
      ctx.strokeStyle = "rgba(45, 59, 94, 0.25)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      const startX = -transform.x / transform.scale - 200;
      const startY = -transform.y / transform.scale - 200;
      const endX = startX + width / transform.scale + 400;
      const endY = startY + height / transform.scale + 400;

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

      // 2. Draw Edges
      edges.forEach((edge) => {
        const src = nodePositions[edge.source];
        const tgt = nodePositions[edge.target];
        if (!src || !tgt) return;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (edge.is_blocked) {
          // Severed / blocked edge
          ctx.strokeStyle = "rgba(255, 42, 95, 0.25)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw containment X marker in middle
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          ctx.strokeStyle = "#ff2a5f";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(midX - 6, midY - 6);
          ctx.lineTo(midX + 6, midY + 6);
          ctx.moveTo(midX + 6, midY - 6);
          ctx.lineTo(midX - 6, midY + 6);
          ctx.stroke();
        } else if (edge.is_compromised_path) {
          // Compromised active attack route
          ctx.strokeStyle = "rgba(255, 42, 95, 0.85)";
          ctx.lineWidth = 3;
          ctx.shadowColor = "#ff2a5f";
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          // Normal clean edge
          ctx.strokeStyle = "rgba(45, 59, 94, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Draw Protocol Badge in edge midpoint
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;
        ctx.fillStyle = "#0d111a";
        ctx.fillRect(midX - 22, midY - 9, 44, 18);
        ctx.strokeStyle = edge.is_blocked ? "#ff2a5f" : "rgba(45, 59, 94, 0.8)";
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 22, midY - 9, 44, 18);

        ctx.fillStyle = edge.is_compromised_path && !edge.is_blocked ? "#ff2a5f" : "#94a3b8";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(edge.protocol, midX, midY);
      });

      // 3. Draw Traveling Packet Particles
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.progress += p.speed;
        if (p.progress <= 1) {
          activeParticles.push(p);
          const curX = p.sourceX + (p.targetX - p.sourceX) * p.progress;
          const curY = p.sourceY + (p.targetY - p.sourceY) * p.progress;

          ctx.beginPath();
          ctx.arc(curX, curY, p.isMalicious ? 4 : 3, 0, Math.PI * 2);
          ctx.fillStyle = p.isMalicious ? "#ff2a5f" : "#00f3ff";
          ctx.shadowColor = p.isMalicious ? "#ff2a5f" : "#00f3ff";
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      particlesRef.current = activeParticles;

      // 4. Draw Nodes
      nodes.forEach((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return;

        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;
        const isCompromised = node.status === "compromised" || node.status === "exfiltrating";
        const isIsolated = node.status === "isolated";
        const isC2 = node.node_type === "c2_server";

        // Outer pulsing shockwave for compromised nodes
        if (isCompromised) {
          const pulseRadius = 32 + Math.sin(pulseAngle) * 8;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 42, 95, 0.35)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Selected halo
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 36, 0, Math.PI * 2);
          ctx.strokeStyle = "#00f3ff";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Node base circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2);

        if (isIsolated) {
          ctx.fillStyle = "#1e1e24";
          ctx.strokeStyle = "#00ff9d";
        } else if (isCompromised) {
          ctx.fillStyle = "#2d0b15";
          ctx.strokeStyle = "#ff2a5f";
        } else if (isC2) {
          ctx.fillStyle = "#1c0d28";
          ctx.strokeStyle = "#a855f7";
        } else {
          ctx.fillStyle = "#0d1322";
          ctx.strokeStyle = isHovered ? "#00f3ff" : "#2d3b5e";
        }

        ctx.lineWidth = 2.5;
        ctx.shadowColor = ctx.strokeStyle as string;
        ctx.shadowBlur = isCompromised || isSelected || isIsolated ? 14 : 0;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Node icon representation
        ctx.fillStyle = isCompromised ? "#ff2a5f" : isIsolated ? "#00ff9d" : "#00f3ff";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let iconLabel = "DEV";
        if (node.node_type === "domain_controller") iconLabel = "DC";
        else if (node.node_type === "cloud_bucket") iconLabel = "S3";
        else if (node.node_type === "firewall") iconLabel = "FW";
        else if (node.node_type === "database") iconLabel = "DB";
        else if (node.node_type === "c2_server") iconLabel = "C2";
        else if (node.node_type === "build_runner") iconLabel = "RUN";
        else if (node.node_type === "server") iconLabel = "SRV";

        ctx.fillText(iconLabel, pos.x, pos.y);

        // Node Label (Below Node)
        ctx.font = "11px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "#f1f5f9";
        ctx.fillText(node.label, pos.x, pos.y + 38);

        // Subnet & IP tag
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = isCompromised ? "#ff2a5f" : "#94a3b8";
        ctx.fillText(node.ip, pos.x, pos.y + 52);

        // Status pill
        if (isIsolated) {
          ctx.fillStyle = "rgba(0, 255, 157, 0.2)";
          ctx.fillRect(pos.x - 30, pos.y - 42, 60, 16);
          ctx.strokeStyle = "#00ff9d";
          ctx.strokeRect(pos.x - 30, pos.y - 42, 60, 16);
          ctx.fillStyle = "#00ff9d";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.fillText("QUARANTINED", pos.x, pos.y - 32);
        } else if (isCompromised) {
          ctx.fillStyle = "rgba(255, 42, 95, 0.25)";
          ctx.fillRect(pos.x - 30, pos.y - 42, 60, 16);
          ctx.strokeStyle = "#ff2a5f";
          ctx.strokeRect(pos.x - 30, pos.y - 42, 60, 16);
          ctx.fillStyle = "#ff2a5f";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.fillText(node.status.toUpperCase(), pos.x, pos.y - 32);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, edges, nodePositions, transform, selectedNodeId, hoveredNodeId]);

  // Mouse interaction: Panning & Dragging Nodes
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (mouseX - transform.x) / transform.scale;
    const worldY = (mouseY - transform.y) / transform.scale;

    // Check if clicked on a node
    const hitNode = nodes.find((node) => {
      const pos = nodePositions[node.id];
      if (!pos) return false;
      const dist = Math.hypot(pos.x - worldX, pos.y - worldY);
      return dist <= 28;
    });

    if (hitNode) {
      setDraggedNodeId(hitNode.id);
      onSelectNode(hitNode);
      audioEngine.playClick(1400);
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - transform.x) / transform.scale;
    const worldY = (mouseY - transform.y) / transform.scale;

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
      // Hover detection
      const hitNode = nodes.find((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return false;
        return Math.hypot(pos.x - worldX, pos.y - worldY) <= 28;
      });
      setHoveredNodeId(hitNode ? hitNode.id : null);
    }
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  // Zoom helpers
  const handleZoom = useCallback((delta: number) => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.5, prev.scale + delta)),
    }));
    audioEngine.playClick(900);
  }, []);

  const handleResetView = useCallback(() => {
    setTransform({ x: 40, y: 30, scale: 0.95 });
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
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg backdrop-blur-md z-10">
        <button
          onClick={() => handleZoom(0.15)}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleResetView}
          title="Reset Topology View"
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Topology Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-lg backdrop-blur-md text-xs font-mono flex items-center gap-4 text-slate-400 z-10">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Clean Host
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span> Compromised
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Quarantined
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Threat C2
        </span>
      </div>
    </div>
  );
};
