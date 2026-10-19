import type {
  SimulationState,
  ScenarioMetadata,
  EntropyAnalysisResult,
  IncidentDossier
} from "../types";

const API_BASE = "http://localhost:8000/api";

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function fetchScenarios(): Promise<{ scenarios: ScenarioMetadata[] }> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error("Failed to load scenarios");
  return res.json();
}

export async function selectScenario(scenarioId: string): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/scenarios/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId })
  });
  if (!res.ok) throw new Error("Failed to select scenario");
  return res.json();
}

export async function fetchState(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/state`);
  if (!res.ok) throw new Error("Failed to fetch state");
  return res.json();
}

export async function playSimulation(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/simulation/play`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to play simulation");
  return res.json();
}

export async function pauseSimulation(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to pause simulation");
  return res.json();
}

export async function seekSimulation(tick: number): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/seek`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tick })
  });
  if (!res.ok) throw new Error("Failed to seek simulation");
  return res.json();
}

export async function stepForwardSimulation(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/step-forward`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to step forward");
  return res.json();
}

export async function stepBackwardSimulation(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/step-backward`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to step backward");
  return res.json();
}

export async function setSimulationSpeed(speed: number): Promise<{ playback_speed: number }> {
  const res = await fetch(`${API_BASE}/simulation/speed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speed })
  });
  if (!res.ok) throw new Error("Failed to set speed");
  return res.json();
}

export async function resetSimulation(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset simulation");
  return res.json();
}

export async function analyzePayload(payload: string): Promise<EntropyAnalysisResult> {
  const res = await fetch(`${API_BASE}/entropy/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload })
  });
  if (!res.ok) throw new Error("Failed to analyze payload");
  return res.json();
}

export async function isolateNode(nodeId: string): Promise<{ result: unknown; state: SimulationState }> {
  const res = await fetch(`${API_BASE}/containment/isolate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node_id: nodeId })
  });
  if (!res.ok) throw new Error("Failed to isolate node");
  return res.json();
}

export async function triggerAutoContainment(): Promise<{ result: unknown; state: SimulationState }> {
  const res = await fetch(`${API_BASE}/containment/auto-contain`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to trigger autonomous containment");
  return res.json();
}

export async function fetchDossier(): Promise<IncidentDossier> {
  const res = await fetch(`${API_BASE}/dossier`);
  if (!res.ok) throw new Error("Failed to fetch dossier");
  return res.json();
}
