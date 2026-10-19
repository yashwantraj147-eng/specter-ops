"""
SPECTER//OPS Backend Unit & Integration Tests
Validates Shannon entropy calculations, scenario loaders, simulation state machine,
Sigma/YARA rule generation, and containment actions.
"""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.entropy import (
    calculate_shannon_entropy,
    calculate_sliding_window_entropy,
    get_byte_distribution,
    xor_bruteforce,
    decode_payload
)
from app.scenarios import load_scenario, ALL_SCENARIO_LOADERS
from app.simulation import SimulationEngine
from app.soc_agent import generate_sigma_rule, generate_yara_rule, execute_containment_action
from app.models import NodeStatus, ThreatEvent, SeverityLevel


def test_shannon_entropy_bounds():
    # 1. Uniform identical bytes must have 0.0 entropy
    zero_entropy = calculate_shannon_entropy(b"AAAAAAAAAAAAAAAA")
    assert zero_entropy == 0.0

    # 2. English text typically ranges between 3.5 and 5.0
    text_entropy = calculate_shannon_entropy(b"The quick brown fox jumps over the lazy dog.")
    assert 3.5 <= text_entropy <= 5.0

    # 3. Dense random bytes should approach 8.0
    pseudo_random = bytes([i % 256 for i in range(1024)])
    high_entropy = calculate_shannon_entropy(pseudo_random)
    assert high_entropy >= 7.9


def test_sliding_window_entropy():
    # Construct buffer with low entropy start and high entropy tail
    low_part = b"A" * 64
    high_part = bytes([((i * 37) + 11) % 256 for i in range(64)])
    data = low_part + high_part

    curve = calculate_sliding_window_entropy(data, window_size=32, step_size=8)
    assert len(curve) > 0
    # First window should be 0 entropy
    assert curve[0]["entropy"] == 0.0
    # Last window should have elevated entropy
    assert curve[-1]["entropy"] > 4.0


def test_payload_decoder_hex_and_base64():
    # Hex decoding
    hex_payload = "48656c6c6f2053504543544552"  # "Hello SPECTER"
    result_hex = decode_payload(hex_payload)
    assert result_hex["detected_format"] == "hex"
    assert "Hello SPECTER" in result_hex["extracted_strings"]

    # Base64 decoding
    b64_payload = "U1BFQ1RFUl9PUFNfU0VDVVJJVFlfVEVTVF9TVUlURQ=="  # "SPECTER_OPS_SECURITY_TEST_SUITE"
    result_b64 = decode_payload(b64_payload)
    assert result_b64["detected_format"] == "base64"
    assert any("SPECTER_OPS" in s for s in result_b64["extracted_strings"])


def test_xor_bruteforce():
    plaintext = b"SECRET_C2_COMMAND_EXECUTE"
    key = 0x5A
    encrypted = bytes([b ^ key for b in plaintext])

    hits = xor_bruteforce(encrypted)
    assert len(hits) > 0
    # Top candidate should find key 0x5A
    best_candidate = hits[0]
    assert best_candidate["key_int"] == 0x5A
    assert "SECRET_C2" in best_candidate["preview"]


def test_all_scenarios_loadable():
    for sc_id in ALL_SCENARIO_LOADERS:
        meta, nodes, edges, events, packets = load_scenario(sc_id)
        assert meta.id == sc_id
        assert len(nodes) >= 3
        assert len(edges) >= 2
        assert len(events) >= 3
        assert meta.total_ticks >= len(events)


def test_simulation_state_machine():
    engine = SimulationEngine(scenario_id="red_eclipse")
    assert engine.current_tick == 0
    assert engine.meta.id == "red_eclipse"

    # Step forward
    state_tick1 = engine.step_forward()
    assert engine.current_tick == 1
    assert state_tick1["current_tick"] == 1
    assert state_tick1["current_event"] is not None

    # Seek to tick 4
    state_tick4 = engine.seek_tick(4)
    assert engine.current_tick == 4
    assert len(state_tick4["past_events"]) >= 4

    # Containment action
    engine.isolate_node("dev_workstation")
    contained_node = next(n for n in engine.active_nodes if n.id == "dev_workstation")
    assert contained_node.status == NodeStatus.ISOLATED

    # Verify connected edges are blocked
    blocked_edges = [e for e in engine.active_edges if e.source == "dev_workstation" or e.target == "dev_workstation"]
    assert all(e.is_blocked for e in blocked_edges)


def test_rule_generation():
    event = ThreatEvent(
        id="ev_test",
        tick=1,
        timestamp_offset_sec=10,
        title="Test Shell Injection",
        description="Malicious cmd spawned",
        severity=SeverityLevel.HIGH,
        mitre_technique_id="T1059.003",
        affected_node_ids=["node1"],
        ioc_indicators=["powershell.exe -enc AAAA", "1.2.3.4"],
        payload_sample="4d5a9000"
    )

    sigma = generate_sigma_rule(event, "Test Scenario")
    assert "title: Test Shell Injection" in sigma
    assert "t1059_003" in sigma.lower()
    assert "powershell.exe" in sigma

    yara = generate_yara_rule(event)
    assert "rule APT_EV_TEST_T1059_003" in yara
    assert "uint16(0) == 0x5A4D" in yara
