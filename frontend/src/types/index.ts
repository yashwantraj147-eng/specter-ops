export type SeverityLevel = "low" | "medium" | "high" | "critical";

export type NodeStatus = "normal" | "vulnerable" | "compromised" | "isolated" | "exfiltrating";

export type NodeType =
  | "workstation"
  | "server"
  | "domain_controller"
  | "database"
  | "firewall"
  | "cloud_bucket"
  | "c2_server"
  | "build_runner";

export interface AttackNode {
  id: string;
  label: string;
  ip: string;
  subnet: string;
  node_type: NodeType;
  status: NodeStatus;
  os: string;
  services: string[];
  active_process?: string | null;
  vulnerabilities: string[];
  tags: string[];
  pos_x: number;
  pos_y: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  protocol: string;
  port: number;
  is_compromised_path: boolean;
  is_blocked: boolean;
  bandwidth_mbps: number;
}

export interface PacketTelemetry {
  id: string;
  timestamp_tick: number;
  source_id: string;
  source_ip: string;
  target_id: string;
  target_ip: string;
  protocol: string;
  port: number;
  payload_preview: string;
  payload_raw?: string | null;
  is_malicious: boolean;
  threat_signature?: string | null;
  entropy: number;
  bytes_transferred: number;
}

export interface ThreatEvent {
  id: string;
  tick: number;
  timestamp_offset_sec: number;
  title: string;
  description: string;
  severity: SeverityLevel;
  mitre_technique_id: string;
  affected_node_ids: string[];
  ioc_indicators: string[];
  payload_sample?: string | null;
  action_type: string;
}

export interface ScenarioMetadata {
  id: string;
  title: string;
  threat_actor: string;
  objective: string;
  total_ticks: number;
  difficulty: string;
  description: string;
}

export interface SimulationState {
  scenario: ScenarioMetadata;
  current_tick: number;
  total_ticks: number;
  is_playing: boolean;
  playback_speed: number;
  nodes: AttackNode[];
  edges: NetworkEdge[];
  current_event: ThreatEvent | null;
  past_events: ThreatEvent[];
  packets: PacketTelemetry[];
  contained_nodes: string[];
}

export interface EntropyAnalysisResult {
  detected_format: string;
  byte_length: number;
  shannon_entropy: number;
  classification: string;
  byte_stats: {
    ascii_ratio: number;
    null_ratio: number;
    control_ratio: number;
    high_byte_ratio: number;
    total_bytes: number;
  };
  sliding_curve: Array<{
    offset: number;
    entropy: number;
    hex_slice: string;
  }>;
  extracted_strings: string[];
  xor_candidates: Array<{
    key: string;
    key_int: number;
    score: number;
    preview: string;
  }>;
  rot13: string;
  url_decoded: string | null;
  hex_dump: string;
}

export interface IncidentDossier {
  incident_id: string;
  scenario_title: string;
  generated_at: string;
  executive_summary: string;
  total_compromised_nodes: number;
  isolated_nodes: number;
  mitre_coverage: Array<{
    technique_id: string;
    name: string;
    tactic: string;
    hits: number;
    highest_severity: string;
  }>;
  key_iocs: Array<{
    indicator: string;
    type: string;
    technique: string;
  }>;
  timeline: Array<{
    tick: number;
    title: string;
    description: string;
    severity: string;
    mitre: string;
    nodes: string[];
  }>;
  sigma_rules: string[];
  yara_rules: string[];
  containment_status: string;
}
