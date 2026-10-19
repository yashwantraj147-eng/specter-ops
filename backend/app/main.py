"""
SPECTER//OPS FastAPI Main Server
Provides WebSocket streaming and REST APIs for threat simulation, forensic analysis, and autonomous SOC response.
"""
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from pydantic import BaseModel

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.simulation import SimulationEngine
from app.entropy import decode_payload
from app.scenarios import ALL_SCENARIO_LOADERS


# Global simulation engine instance
sim_engine = SimulationEngine(scenario_id="red_eclipse")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch background tick loop
    sim_engine.worker_task = asyncio.create_task(sim_engine.tick_loop())
    yield
    # Shutdown: clean up background task
    if sim_engine.worker_task:
        sim_engine.worker_task.cancel()
        try:
            await sim_engine.worker_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="SPECTER//OPS Cyber Forensics & Threat Intelligence Engine",
    description="High-fidelity cyber warfare simulation workbench, attack graph visualizer, and autonomous SOC incident commander.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request DTOs
class ScenarioSelectRequest(BaseModel):
    scenario_id: str


class SeekRequest(BaseModel):
    tick: int


class SpeedRequest(BaseModel):
    speed: float


class PayloadAnalyzeRequest(BaseModel):
    payload: str


class ContainNodeRequest(BaseModel):
    node_id: str


# -------------------------------------------------------------
# REST ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "system": "SPECTER//OPS Threat Intelligence Engine",
        "active_scenario": sim_engine.scenario_id,
        "current_tick": sim_engine.current_tick
    }


@app.get("/api/scenarios")
async def get_scenarios():
    scenarios_list = []
    for sc_id, loader in ALL_SCENARIO_LOADERS.items():
        meta, _, _, _, _ = loader()
        scenarios_list.append(meta.model_dump())
    return {"scenarios": scenarios_list}


@app.post("/api/scenarios/select")
async def select_scenario(req: ScenarioSelectRequest):
    if req.scenario_id not in ALL_SCENARIO_LOADERS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario ID: {req.scenario_id}")
    sim_engine.reset_to_scenario(req.scenario_id)
    state = sim_engine.get_full_state()
    await sim_engine.broadcast({"type": "SCENARIO_RESET", "data": state})
    return state


@app.get("/api/state")
async def get_current_state():
    return sim_engine.get_full_state()


@app.post("/api/simulation/play")
async def play_simulation():
    sim_engine.play()
    await sim_engine.broadcast({"type": "PLAYBACK_STATE", "is_playing": True})
    return {"status": "playing", "current_tick": sim_engine.current_tick}


@app.post("/api/simulation/pause")
async def pause_simulation():
    sim_engine.pause()
    await sim_engine.broadcast({"type": "PLAYBACK_STATE", "is_playing": False})
    return {"status": "paused", "current_tick": sim_engine.current_tick}


@app.post("/api/simulation/seek")
async def seek_simulation(req: SeekRequest):
    state = sim_engine.seek_tick(req.tick)
    await sim_engine.broadcast({"type": "STATE_UPDATE", "data": state})
    return state


@app.post("/api/simulation/step-forward")
async def step_forward():
    state = sim_engine.step_forward()
    await sim_engine.broadcast({"type": "STATE_UPDATE", "data": state})
    return state


@app.post("/api/simulation/step-backward")
async def step_backward():
    state = sim_engine.step_backward()
    await sim_engine.broadcast({"type": "STATE_UPDATE", "data": state})
    return state


@app.post("/api/simulation/speed")
async def set_playback_speed(req: SpeedRequest):
    sim_engine.playback_speed = max(0.25, min(5.0, req.speed))
    return {"playback_speed": sim_engine.playback_speed}


@app.post("/api/simulation/reset")
async def reset_simulation():
    sim_engine.reset_to_scenario(sim_engine.scenario_id)
    state = sim_engine.get_full_state()
    await sim_engine.broadcast({"type": "STATE_UPDATE", "data": state})
    return state


@app.post("/api/entropy/analyze")
async def analyze_payload_entropy(req: PayloadAnalyzeRequest):
    """
    Shannon Entropy & Cryptanalysis endpoint:
    Deconstructs payload, measures entropy, sliding-window anomalies, and decodes representations.
    """
    if not req.payload:
        raise HTTPException(status_code=400, detail="Empty payload")
    result = decode_payload(req.payload)
    return result


@app.post("/api/containment/isolate")
async def isolate_node_endpoint(req: ContainNodeRequest):
    res = sim_engine.isolate_node(req.node_id)
    state = sim_engine.get_full_state()
    await sim_engine.broadcast({
        "type": "NODE_CONTAINED",
        "node_id": req.node_id,
        "data": state
    })
    return {"result": res, "state": state}


@app.post("/api/containment/auto-contain")
async def auto_contain_all_endpoint():
    res = sim_engine.auto_contain_all()
    state = sim_engine.get_full_state()
    await sim_engine.broadcast({
        "type": "AUTO_CONTAINMENT_TRIGGERED",
        "result": res,
        "data": state
    })
    return {"result": res, "state": state}


@app.get("/api/dossier")
async def get_incident_dossier():
    dossier = sim_engine.generate_dossier()
    return dossier.model_dump()


# -------------------------------------------------------------
# WEBSOCKET STREAM
# -------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await sim_engine.register_websocket(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client commands if sent over ws
            if data == "PING":
                await websocket.send_text("PONG")
    except WebSocketDisconnect:
        sim_engine.unregister_websocket(websocket)
    except Exception:
        sim_engine.unregister_websocket(websocket)
