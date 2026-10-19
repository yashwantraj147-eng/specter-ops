"""
SPECTER//OPS Backend Data Models
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NodeStatus(str, Enum):
    NORMAL = "normal"
    VULNERABLE = "vulnerable"
    COMPROMISED = "compromised"
    ISOLATED = "isolated"
    EXFILTRATING = "exfiltrating"


class NodeType(str, Enum):
    WORKSTATION = "workstation"
    SERVER = "server"
    DOMAIN_CONTROLLER = "domain_controller"
    DATABASE = "database"
    FIREWALL = "firewall"
    CLOUD_BUCKET = "cloud_bucket"
    C2_SERVER = "c2_server"
    BUILD_RUNNER = "build_runner"


class AttackNode(BaseModel):
    id: str
    label: str
    ip: str
    subnet: str
    node_type: NodeType
    status: NodeStatus = NodeStatus.NORMAL
    os: str = "Linux"
    services: List[str] = Field(default_factory=list)
    compromised_at_tick: Optional[int] = None
    isolated_at_tick: Optional[int] = None
    vulnerabilities: List[str] = Field(default_factory=list)
    active_process: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    pos_x: float = 0.0
    pos_y: float = 0.0


class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    protocol: str = "TCP"
    port: int = 443
    is_compromised_path: bool = False
    is_blocked: bool = False
    bandwidth_mbps: float = 100.0


class PacketTelemetry(BaseModel):
    id: str
    timestamp_tick: int
    source_id: str
    source_ip: str
    target_id: str
    target_ip: str
    protocol: str
    port: int
    payload_preview: str
    payload_raw: Optional[str] = None
    is_malicious: bool = False
    threat_signature: Optional[str] = None
    entropy: float = 0.0
    bytes_transferred: int = 256


class MitreTechnique(BaseModel):
    id: str
    tactic: str
    name: str
    description: str
    severity: SeverityLevel
    detected_at_tick: Optional[int] = None
    evidence_count: int = 0
    confidence_score: float = 0.0


class ThreatEvent(BaseModel):
    id: str
    tick: int
    timestamp_offset_sec: int
    title: str
    description: str
    severity: SeverityLevel
    mitre_technique_id: str
    affected_node_ids: List[str]
    ioc_indicators: List[str]
    payload_sample: Optional[str] = None
    action_type: str = "recon"
    is_contained: bool = False


class ScenarioMetadata(BaseModel):
    id: str
    title: str
    threat_actor: str
    objective: str
    total_ticks: int
    difficulty: str
    description: str


class IncidentDossier(BaseModel):
    incident_id: str
    scenario_title: str
    generated_at: str
    executive_summary: str
    total_compromised_nodes: int
    isolated_nodes: int
    mitre_coverage: List[Dict[str, Any]]
    key_iocs: List[Dict[str, str]]
    timeline: List[Dict[str, Any]]
    sigma_rules: List[str]
    yara_rules: List[str]
    containment_status: str


class ContainmentAction(BaseModel):
    action_type: str  # "isolate_node", "block_edge", "kill_process", "sever_c2"
    target_id: str
    notes: Optional[str] = None
