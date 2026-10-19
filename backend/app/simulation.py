"""
SPECTER//OPS Active Attack Simulation Engine & State Machine
Manages simulation ticks, real-time node mutations, packet broadcasting, and scrubbing.
"""
import asyncio
import copy
from typing import List, Dict, Any, Set
from fastapi import WebSocket

from app.models import (
    AttackNode, NetworkEdge, ThreatEvent, PacketTelemetry,
    ScenarioMetadata, NodeStatus
)
from app.scenarios import load_scenario
from app.soc_agent import execute_containment_action, build_incident_dossier


class SimulationEngine:
    def __init__(self, scenario_id: str = "red_eclipse"):
        self.scenario_id = scenario_id
        self.meta: ScenarioMetadata = None
        self.base_nodes: List[AttackNode] = []
        self.base_edges: List[NetworkEdge] = []
        self.all_events: List[ThreatEvent] = []
        self.all_packets: List[PacketTelemetry] = []

        self.current_tick: int = 0
        self.is_playing: bool = False
        self.playback_speed: float = 1.0  # multiplier (1.0 = 2 seconds per tick)

        # Active mutable state
        self.active_nodes: List[AttackNode] = []
        self.active_edges: List[NetworkEdge] = []
        self.contained_node_ids: Set[str] = set()

        # WebSockets
        self.connected_websockets: Set[WebSocket] = set()
        self.worker_task: asyncio.Task = None

        self.reset_to_scenario(scenario_id)

    def reset_to_scenario(self, scenario_id: str):
        self.scenario_id = scenario_id
        self.meta, self.base_nodes, self.base_edges, self.all_events, self.all_packets = load_scenario(scenario_id)
        self.current_tick = 0
        self.is_playing = False
        self.contained_node_ids = set()
        self._apply_tick_state(0)

    def _apply_tick_state(self, target_tick: int):
        """
        Recompute the state of all nodes and edges up to target_tick.
        """
        self.current_tick = max(0, min(target_tick, self.meta.total_ticks))

        # Reset active nodes from base
        self.active_nodes = copy.deepcopy(self.base_nodes)
        self.active_edges = copy.deepcopy(self.base_edges)

        # Apply event state changes up to current_tick
        for ev in self.all_events:
            if ev.tick <= self.current_tick:
                for nid in ev.affected_node_ids:
                    for node in self.active_nodes:
                        if node.id == nid and node.id not in self.contained_node_ids:
                            if ev.action_type == "exfiltration":
                                node.status = NodeStatus.EXFILTRATING
                            elif node.node_type.value != "c2_server":
                                node.status = NodeStatus.COMPROMISED

                # Mark edge as compromised if both source & target or source is affected
                for edge in self.active_edges:
                    if edge.source in ev.affected_node_ids or edge.target in ev.affected_node_ids:
                        edge.is_compromised_path = True

        # Re-apply manual/autonomous containments
        for cid in self.contained_node_ids:
            execute_containment_action("isolate_node", cid, self.active_nodes, self.active_edges)

    def seek_tick(self, tick: int) -> Dict[str, Any]:
        self._apply_tick_state(tick)
        return self.get_full_state()

    def step_forward(self) -> Dict[str, Any]:
        if self.current_tick < self.meta.total_ticks:
            self._apply_tick_state(self.current_tick + 1)
        return self.get_full_state()

    def step_backward(self) -> Dict[str, Any]:
        if self.current_tick > 0:
            self._apply_tick_state(self.current_tick - 1)
        return self.get_full_state()

    def play(self):
        self.is_playing = True

    def pause(self):
        self.is_playing = False

    def isolate_node(self, node_id: str) -> Dict[str, Any]:
        self.contained_node_ids.add(node_id)
        result = execute_containment_action("isolate_node", node_id, self.active_nodes, self.active_edges)
        return result

    def auto_contain_all(self) -> Dict[str, Any]:
        """
        Autonomous triage: automatically isolate all compromised or exfiltrating nodes.
        """
        isolated = []
        for node in self.active_nodes:
            if node.status in (NodeStatus.COMPROMISED, NodeStatus.EXFILTRATING) and node.node_type.value != "c2_server":
                self.contained_node_ids.add(node.id)
                execute_containment_action("isolate_node", node.id, self.active_nodes, self.active_edges)
                isolated.append(node.id)

        return {
            "success": True,
            "isolated_nodes": isolated,
            "message": f"Autonomous containment activated: {len(isolated)} nodes isolated from network topology."
        }

    def get_full_state(self) -> Dict[str, Any]:
        # Filter packets up to current tick
        visible_packets = [p for p in self.all_packets if p.timestamp_tick <= self.current_tick]
        active_events = [ev for ev in self.all_events if ev.tick <= self.current_tick]
        current_event = next((ev for ev in self.all_events if ev.tick == self.current_tick), None)

        return {
            "scenario": self.meta.model_dump(),
            "current_tick": self.current_tick,
            "total_ticks": self.meta.total_ticks,
            "is_playing": self.is_playing,
            "playback_speed": self.playback_speed,
            "nodes": [n.model_dump() for n in self.active_nodes],
            "edges": [e.model_dump() for e in self.active_edges],
            "current_event": current_event.model_dump() if current_event else None,
            "past_events": [ev.model_dump() for ev in active_events],
            "packets": [p.model_dump() for p in visible_packets[-20:]],  # latest 20
            "contained_nodes": list(self.contained_node_ids)
        }

    def generate_dossier(self):
        return build_incident_dossier(
            self.meta.title,
            self.active_nodes,
            self.active_edges,
            [ev for ev in self.all_events if ev.tick <= self.current_tick] or self.all_events[:1],
            self.all_packets
        )

    async def register_websocket(self, ws: WebSocket):
        await ws.accept()
        self.connected_websockets.add(ws)
        # Send initial state
        await ws.send_json({"type": "STATE_UPDATE", "data": self.get_full_state()})

    def unregister_websocket(self, ws: WebSocket):
        self.connected_websockets.discard(ws)

    async def broadcast(self, message: Dict[str, Any]):
        dead_sockets = set()
        for ws in self.connected_websockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead_sockets.add(ws)
        for dead in dead_sockets:
            self.connected_websockets.discard(dead)

    async def tick_loop(self):
        """
        Background loop advancing ticks when is_playing is True.
        """
        while True:
            try:
                if self.is_playing:
                    if self.current_tick < self.meta.total_ticks:
                        self.step_forward()
                        await self.broadcast({
                            "type": "TICK_ADVANCED",
                            "data": self.get_full_state()
                        })
                    else:
                        self.is_playing = False
                        await self.broadcast({
                            "type": "SIMULATION_COMPLETED",
                            "data": self.get_full_state()
                        })
                delay = 2.0 / max(0.2, self.playback_speed)
                await asyncio.sleep(delay)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in tick loop: {e}")
                await asyncio.sleep(1.0)
