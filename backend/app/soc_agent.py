"""
SPECTER//OPS Autonomous SOC Incident Commander & Rule Synthesizer
Generates real Sigma & YARA rules, executes containment playbooks, and builds incident dossiers.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.models import AttackNode, NetworkEdge, ThreatEvent, PacketTelemetry, IncidentDossier, NodeStatus


def generate_sigma_rule(event: ThreatEvent, scenario_title: str) -> str:
    """
    Synthesize an authentic Sigma SIEM detection rule for the threat event.
    """
    title_clean = event.title.replace("\"", "")
    sanitized_id = event.id.lower().replace("-", "_")
    iocs_formatted = "\n".join([f"            - '{ioc}'" for ioc in event.ioc_indicators]) or "            - '*'"

    return f"""title: {title_clean} (SPECTER Detection)
id: 4a2f{sanitized_id}-910b-4f90-bc10-{sanitized_id[:4]}
status: experimental
description: Detects indicators associated with {scenario_title} - {event.description}
references:
    - https://attack.mitre.org/techniques/{event.mitre_technique_id.split('.')[0]}/
author: SPECTER//OPS Autonomous Incident Commander
date: {datetime.now(timezone.utc).strftime('%Y/%m/%d')}
tags:
    - attack.{event.mitre_technique_id.lower().replace('.', '_')}
    - attack.{event.action_type}
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains:
{iocs_formatted}
    condition: selection
falsepositives:
    - Legitimate administrative maintenance
level: {event.severity.value}
"""


def generate_yara_rule(event: ThreatEvent) -> str:
    """
    Synthesize an authentic YARA malware signature rule based on extracted threat artifacts.
    """
    rule_name = f"APT_{event.id.upper()}_{event.mitre_technique_id.replace('.', '_')}"
    strings_def = []

    if event.payload_sample:
        # Take first 32 chars of payload as hex or ascii string
        sample_hex = event.payload_sample[:24].encode("utf-8").hex()
        strings_def.append(f'        $s1 = {{ { " ".join([sample_hex[i:i+2] for i in range(0, len(sample_hex), 2)]) } }}')

    for i, ioc in enumerate(event.ioc_indicators[:3], start=2):
        clean_ioc = ioc.replace("\\", "\\\\").replace('"', '\\"')
        strings_def.append(f'        $s{i} = "{clean_ioc}" ascii wide nocase')

    strings_block = "\n".join(strings_def) if strings_def else '        $s1 = "malicious_pattern" ascii'

    return f"""rule {rule_name} {{
    meta:
        description = "Identifies indicators associated with {event.title}"
        author = "SPECTER//OPS Rule Synthesis Engine"
        date = "{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
        severity = "{event.severity.value}"
        mitre_technique = "{event.mitre_technique_id}"
    strings:
{strings_block}
    condition:
        uint16(0) == 0x5A4D or any of them
}}"""


def execute_containment_action(
    action_type: str,
    target_id: str,
    nodes: List[AttackNode],
    edges: List[NetworkEdge]
) -> Dict[str, Any]:
    """
    Execute defensive containment actions:
    - isolate_node: Quarantines node from network
    - sever_c2: Blocks communication across C2 edge
    - kill_process: Terminates malicious process on node
    """
    result = {"success": False, "message": "", "modified_nodes": [], "modified_edges": []}

    if action_type == "isolate_node":
        for node in nodes:
            if node.id == target_id:
                node.status = NodeStatus.ISOLATED
                node.active_process = None
                result["modified_nodes"].append(node.id)
                # Sever all edges connected to this node
                for edge in edges:
                    if edge.source == target_id or edge.target == target_id:
                        edge.is_blocked = True
                        result["modified_edges"].append(edge.id)
                result["success"] = True
                result["message"] = f"Host {node.label} ({node.ip}) successfully isolated. All ingress/egress edges blocked."
                return result

    elif action_type == "sever_c2" or action_type == "block_edge":
        for edge in edges:
            if edge.id == target_id or edge.source == target_id or edge.target == target_id:
                edge.is_blocked = True
                result["modified_edges"].append(edge.id)
                result["success"] = True
                result["message"] = f"Edge {edge.id} ({edge.source} -> {edge.target}) severed by defensive ACL."
                return result

    elif action_type == "kill_process":
        for node in nodes:
            if node.id == target_id:
                killed = node.active_process or "malicious_process"
                node.active_process = None
                result["modified_nodes"].append(node.id)
                result["success"] = True
                result["message"] = f"Malicious process '{killed}' terminated on {node.label}."
                return result

    result["message"] = f"Target {target_id} not found for action {action_type}."
    return result


def build_incident_dossier(
    scenario_title: str,
    nodes: List[AttackNode],
    edges: List[NetworkEdge],
    events: List[ThreatEvent],
    packets: List[PacketTelemetry]
) -> IncidentDossier:
    """
    Synthesize complete forensic dossier report.
    """
    compromised_count = sum(1 for n in nodes if n.status in (NodeStatus.COMPROMISED, NodeStatus.EXFILTRATING))
    isolated_count = sum(1 for n in nodes if n.status == NodeStatus.ISOLATED)

    # MITRE coverage calculation
    mitre_map: Dict[str, Dict[str, Any]] = {}
    for ev in events:
        tech = ev.mitre_technique_id
        if tech not in mitre_map:
            mitre_map[tech] = {
                "technique_id": tech,
                "name": ev.title,
                "tactic": ev.action_type,
                "hits": 0,
                "highest_severity": ev.severity.value
            }
        mitre_map[tech]["hits"] += 1

    # Extract all IOCs
    iocs = []
    seen_iocs = set()
    for ev in events:
        for ioc in ev.ioc_indicators:
            if ioc not in seen_iocs:
                seen_iocs.add(ioc)
                ioc_type = "IP_ADDRESS" if "." in ioc and ioc.replace(".", "").isdigit() else "HASH/COMMAND"
                iocs.append({"indicator": ioc, "type": ioc_type, "technique": ev.mitre_technique_id})

    # Generate Sigma and YARA for highest severity events
    sigma_rules = [generate_sigma_rule(ev, scenario_title) for ev in events[:4]]
    yara_rules = [generate_yara_rule(ev) for ev in events[:3]]

    # Executive Summary
    summary = (
        f"Forensic investigation into {scenario_title} completed. Adversary exhibited multi-stage intrusion "
        f"across {len(nodes)} monitored network nodes with {compromised_count} compromised assets. "
        f"Containment state: {isolated_count} hosts quarantined. Identified {len(iocs)} indicators of compromise "
        f"spanning {len(mitre_map)} unique MITRE ATT&CK techniques. "
        f"Immediate autonomous containment countermeasures recommended."
    )

    timeline_items = [
        {
            "tick": ev.tick,
            "title": ev.title,
            "description": ev.description,
            "severity": ev.severity.value,
            "mitre": ev.mitre_technique_id,
            "nodes": ev.affected_node_ids
        }
        for ev in events
    ]

    return IncidentDossier(
        incident_id=f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-094",
        scenario_title=scenario_title,
        generated_at=datetime.now(timezone.utc).isoformat(),
        executive_summary=summary,
        total_compromised_nodes=compromised_count,
        isolated_nodes=isolated_count,
        mitre_coverage=list(mitre_map.values()),
        key_iocs=iocs,
        timeline=timeline_items,
        sigma_rules=sigma_rules,
        yara_rules=yara_rules,
        containment_status="CONTAINED" if isolated_count >= compromised_count and compromised_count > 0 else "ACTIVE_THREAT"
    )
