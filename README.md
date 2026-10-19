# SPECTER // OPS
> **Autonomous Cyber Threat Intelligence & Forensic Flight Recorder**  
> *A high-fidelity cyber warfare simulation workbench, attack graph visualizer, and autonomous SOC incident commander.*

[![Backend Tests](https://img.shields.io/badge/pytest-7%20passed-00ff9d?style=flat-square&logo=pytest)](file:///c:/Users/yashw/Downloads/random%20proj/backend/tests)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135.3-00f3ff?style=flat-square&logo=fastapi)](file:///c:/Users/yashw/Downloads/random%20proj/backend/app)
[![React 19](https://img.shields.io/badge/React-19.3.1-61dafb?style=flat-square&logo=react)](file:///c:/Users/yashw/Downloads/random%20proj/frontend)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178c6?style=flat-square&logo=typescript)](file:///c:/Users/yashw/Downloads/random%20proj/frontend)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-bd34fe?style=flat-square&logo=vite)](file:///c:/Users/yashw/Downloads/random%20proj/frontend)
[![License](https://img.shields.io/badge/License-MIT-ffaa00?style=flat-square)](file:///c:/Users/yashw/Downloads/random%20proj/package.json)

---

## ⚡ What is SPECTER//OPS?

Modern Security Operations Centers (SOCs) drown in disconnected alert logs, static tables, and fragmented tooling. When an advanced adversary strikes, incident responders struggle to rapidly correlate how the initial beacon entered, which internal nodes were pivoted, what payload was dropped, and the true blast radius of the breach.

**SPECTER//OPS** transforms cyber forensic investigation into an intuitive, tactile, real-time command cockpit. It unifies live network packet telemetry, a physics-based attack blast-radius graph, time-travel event replay, deep Shannon entropy payload inspection, MITRE ATT&CK matrix correlation, and an autonomous containment agent into a single high-performance interface.

---

## 🛰️ Key Features

### 1. Interactive 60FPS Attack Blast-Radius Graph
- **Force-Directed Topology**: Dynamic HTML5 Canvas rendering internal subnets (Perimeter DMZ, Corp Workstations, Core Infrastructure, Cloud VPCs) and external C2 nodes.
- **Particle Packet Flow**: Real-time packet pulses traveling across edges, color-coded by malicious severity and protocol.
- **Visual Containment Firewalls**: Quarantined hosts and severed edges trigger dynamic laser barrier cross-outs and defense shields.
- **Interactive Controls**: Drag-and-drop nodes, smooth pan, zoom controls, and instant node inspection.

### 2. Time-Travel Flight Recorder
- **Chronological Attack Replay**: Scrub backward and forward through the attack lifecycle millisecond by millisecond.
- **Variable Playback Speeds**: 0.5x, 1x, 2x, and 5x real-time simulation rates.
- **Milestone Navigation**: Interactive timeline track with clickable severity milestone anchors.
- **Event Synchronization**: Automatically updates node compromise states, edge paths, and telemetry logs as ticks progress.

### 3. Shannon Entropy & Cryptanalysis Lab
- **Mathematical Entropy Engine**: Calculates Shannon entropy:
  $$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
- **Sliding Window Visualizer**: Dynamic SVG curve plotting entropy across byte offsets to pinpoint where encrypted shellcode or packed stubs begin.
- **1-Byte XOR Brute-Forcer**: Scans keys `0x01` through `0xFF`, evaluates character frequency density, and extracts hidden C2 command strings.
- **Multi-Format Decoders**: Supports Base64, Hex disassembly, ROT13, URL decoding, and ASCII/UTF-16 string extraction.

### 4. MITRE ATT&CK® Matrix Navigator
- **12 Enterprise Tactics**: Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Command & Control, Exfiltration, Impact.
- **Real-Time Detection Correlation**: Highlights techniques as the adversary advances across ticks.
- **Technique Intelligence Drawer**: Click any technique (e.g. `T1195.002`, `T1059.001`, `T1558.003`) to view detailed telemetry evidence and containment recommendations.

### 5. Autonomous SOC Incident Commander
- **1-Click Master Containment**: Automatically discovers all compromised hosts, severs active C2 sockets, and isolates endpoints.
- **Signature Auto-Synthesis**: Dynamically generates production-ready **Sigma SIEM rules** and **YARA malware signatures** based on extracted IOCs.
- **Forensic Dossier Export**: Complete audit report with executive summary, timeline of compromise, IOC tables, and JSON export.

### 6. Tactile Cybernetic Acoustic Engine
- Handcrafted Web Audio API synthesizer generating sonar radar sweeps, telemetry clicks, alarm klaxons, and defensive containment lock sounds without requiring external audio assets.

---

## 📂 System Architecture & Directory Layout

```
random proj/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point, WebSocket stream, REST endpoints
│   │   ├── models.py          # Pydantic v2 data models (Nodes, Edges, Packets, Dossier)
│   │   ├── simulation.py      # State machine engine, tick loop, and broadcast bus
│   │   ├── scenarios.py       # APT campaigns (Red Eclipse, BlackBasta, PhantomBeacon)
│   │   ├── entropy.py         # Shannon entropy calculations, sliding window, XOR decoder
│   │   └── soc_agent.py       # Autonomous containment playbooks & Sigma/YARA synthesis
│   └── tests/
│       └── test_backend.py    # Pytest test suite (7 unit & integration tests)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AttackGraph.tsx          # 60FPS Canvas network topology visualizer
│   │   │   ├── FlightRecorder.tsx       # Time-travel scrubber dock & controls
│   │   │   ├── MitreMatrix.tsx          # 12-tactic dynamic MITRE ATT&CK navigator
│   │   │   ├── PayloadInspector.tsx     # Shannon entropy visualizer & XOR decoder
│   │   │   ├── ThreatFeedSidebar.tsx    # Threat intel profile & kill-chain timeline
│   │   │   ├── PacketConsoleSidebar.tsx # Host triage inspector & PCAP feed
│   │   │   └── ForensicDossierModal.tsx # Incident report, Sigma & YARA export modal
│   │   ├── services/
│   │   │   ├── api.ts                   # REST API client
│   │   │   └── audioEngine.ts           # Web Audio API tactical sound synthesizer
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript data contracts
│   │   ├── index.css                    # Custom cyberpunk glassmorphism design system
│   │   └── App.tsx                      # Master command cockpit layout
│   └── index.html                       # Fonts, favicon, and viewport configuration
├── package.json                         # Root project scripts
└── README.md                            # Complete engineering documentation
```

---

## 🚀 Quickstart & Launch Instructions

### Prerequisites
- Python 3.10+ (Python 3.13 tested)
- Node.js 18+ (Node v24 tested) & npm

### 1. Launch Backend API Server
```powershell
# From project root:
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
Backend will be live at: `http://127.0.0.1:8000` (Swagger docs at `/docs`)

### 2. Launch Frontend Dev Server
```powershell
# In a new terminal:
cd frontend
npm run dev
```
Frontend cockpit will open at: `http://127.0.0.1:5173/`

### 3. Run Backend Verification Tests
```powershell
python -m pytest backend/tests -v
```
All 7 unit and integration tests run in under 2 seconds.

---

## 📡 Included Threat Scenarios

1. **Operation Red Eclipse (SolarWinds-style Build-Pipeline Breach)**
   - *Threat Actor*: APT-29 (Cozy Bear / Midnight Blizzard)
   - *TTPs*: OAuth Token Replay → PowerShell Reverse Shell → CI/CD Runner Poisoning → Memory DLL Injection → Kerberoasting → AWS STS SAML Role Hijack → Cloud S3 Exfiltration.
2. **BlackBasta v3 (Double-Extortion Ransomware)**
   - *Threat Actor*: FIN7 / BlackBasta Syndicate
   - *TTPs*: QakBot OneNote Dropper → LSASS Memory Password Dump → PsExec Lateral SMB Movement → GPO Antivirus Disablement → VSS Shadow Copy Deletion → ChaCha20 Multi-TB Storage Encryption.
3. **PhantomBeacon (Covert DNS Tunneling)**
   - *Threat Actor*: Lazarus Group (HIDDEN COBRA)
   - *TTPs*: Recursive DNS Beaconing → SQLite Vault Extraction → Base32 Subdomain Label Chunking → Bulk Exfiltration over Port 53.

---

## 🔒 Security & Privacy Notice
All attack simulations, telemetry packets, and IP addresses within this application are strictly synthetic, simulated environments executing locally within memory. No external systems are contacted or harmed.
