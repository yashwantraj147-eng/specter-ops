"""
SPECTER//OPS Mathematical Entropy & Payload Cryptanalysis Engine
Calculates Shannon Entropy, sliding window entropy curves, and payload decoders.
"""
import math
import base64
import urllib.parse
from typing import Dict, List, Any, Tuple


def calculate_shannon_entropy(data: bytes) -> float:
    """
    Calculate Shannon entropy of byte data:
    H(X) = - sum(P(x) * log2(P(x)))
    Values range from 0.0 (uniform bytes, e.g. all 0x00) to 8.0 (completely random / AES encrypted / compressed).
    Shellcode / packed PE files typically spike above 6.8 - 7.5.
    """
    if not data:
        return 0.0

    length = len(data)
    frequencies: Dict[int, int] = {}
    for byte in data:
        frequencies[byte] = frequencies.get(byte, 0) + 1

    entropy = 0.0
    for count in frequencies.values():
        p_x = count / length
        if p_x > 0:
            entropy -= p_x * math.log2(p_x)

    return round(entropy, 4)


def calculate_sliding_window_entropy(data: bytes, window_size: int = 32, step_size: int = 8) -> List[Dict[str, Any]]:
    """
    Compute sliding window entropy to detect encrypted shellcode blocks or packed sections.
    """
    if not data:
        return []

    points: List[Dict[str, Any]] = []
    data_len = len(data)

    if data_len <= window_size:
        return [{"offset": 0, "entropy": calculate_shannon_entropy(data)}]

    for i in range(0, data_len - window_size + 1, step_size):
        chunk = data[i : i + window_size]
        h = calculate_shannon_entropy(chunk)
        points.append({
            "offset": i,
            "entropy": h,
            "hex_slice": chunk[:8].hex()
        })

    return points


def get_byte_distribution(data: bytes) -> Dict[str, Any]:
    """
    Calculate byte category breakdown: Printable ASCII, Nulls, High Entropy (>127), Control chars.
    """
    if not data:
        return {"ascii": 0, "null": 0, "control": 0, "high_byte": 0, "total": 0}

    total = len(data)
    ascii_count = 0
    null_count = 0
    control_count = 0
    high_count = 0

    for b in data:
        if b == 0:
            null_count += 1
        elif 32 <= b <= 126:
            ascii_count += 1
        elif b < 32:
            control_count += 1
        else:
            high_count += 1

    return {
        "ascii_ratio": round(ascii_count / total, 3),
        "null_ratio": round(null_count / total, 3),
        "control_ratio": round(control_count / total, 3),
        "high_byte_ratio": round(high_count / total, 3),
        "total_bytes": total
    }


def extract_printable_strings(data: bytes, min_length: int = 4) -> List[str]:
    """
    Extract readable ASCII strings of at least min_length.
    """
    result = []
    current = []
    for b in data:
        if 32 <= b <= 126:
            current.append(chr(b))
        else:
            if len(current) >= min_length:
                result.append("".join(current))
            current = []
    if len(current) >= min_length:
        result.append("".join(current))
    return result[:30]


COMMON_CHARS = set(b"etaoinshrdlucmfwypvbgkjqxzETAOINSHRDLUCMFWYPVBGKJQXZ 0123456789_-\n\r\t.,/:")


def xor_bruteforce(data: bytes) -> List[Dict[str, Any]]:
    """
    Brute-force 1-byte XOR keys (0x01 through 0xFF) and score the output based on
    printable ASCII and standard text character frequency.
    Returns the top candidates.
    """
    if not data:
        return []

    candidates = []
    total_len = len(data)

    for key in range(1, 256):
        decrypted = bytes([b ^ key for b in data])
        printable = sum(1 for b in decrypted if 32 <= b <= 126 or b in (10, 13, 9))
        common = sum(1 for b in decrypted if b in COMMON_CHARS)
        
        # Weighted score: 30% general printable, 70% common text characters
        score = (printable * 0.3 + common * 0.7) / total_len
        if score > 0.45:
            preview = ""
            try:
                preview = decrypted.decode("utf-8", errors="replace")[:60]
            except Exception:
                preview = "".join(chr(b) if 32 <= b <= 126 else "." for b in decrypted[:60])
            candidates.append({
                "key": f"0x{key:02X}",
                "key_int": key,
                "score": round(score, 3),
                "preview": preview
            })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:5]


def decode_payload(payload_str: str) -> Dict[str, Any]:
    """
    Analyze, decode and unpack a raw payload string (supports Hex, Base64, Raw, and XOR detection).
    """
    raw_bytes = b""
    detection_format = "plaintext"

    clean_str = payload_str.strip()

    # Try Hex
    is_hex = False
    try:
        hex_candidate = clean_str.replace(" ", "").replace("0x", "")
        if len(hex_candidate) >= 2 and len(hex_candidate) % 2 == 0:
            raw_bytes = bytes.fromhex(hex_candidate)
            is_hex = True
            detection_format = "hex"
    except Exception:
        pass

    # Try Base64 if not hex
    if not is_hex:
        try:
            b64_candidate = clean_str
            # Add padding if needed
            missing_padding = len(b64_candidate) % 4
            if missing_padding:
                b64_candidate += "=" * (4 - missing_padding)
            decoded_b64 = base64.b64decode(b64_candidate, validate=True)
            if len(decoded_b64) > 3:
                raw_bytes = decoded_b64
                detection_format = "base64"
        except Exception:
            pass

    # Fallback to UTF-8 encoded bytes
    if not raw_bytes:
        raw_bytes = clean_str.encode("utf-8", errors="replace")
        detection_format = "raw_ascii"

    shannon_h = calculate_shannon_entropy(raw_bytes)
    sliding_curve = calculate_sliding_window_entropy(raw_bytes)
    byte_stats = get_byte_distribution(raw_bytes)
    strings = extract_printable_strings(raw_bytes)
    xor_hits = xor_bruteforce(raw_bytes) if len(raw_bytes) >= 8 else []

    # Try standard ROT13
    rot13_candidate = ""
    try:
        rot13_candidate = clean_str.translate(
            str.maketrans(
                "ABCDEFGHIJKLMabcdefghijklmNOPQRSTUVWXYZnopqrstuvwxyz",
                "NOPQRSTUVWXYZnopqrstuvwxyzABCDEFGHIJKLMabcdefghijklm"
            )
        )
    except Exception:
        pass

    # Try URL decode
    url_decoded = urllib.parse.unquote(clean_str)

    classification = "Normal Data / Low Entropy"
    if shannon_h > 7.2:
        classification = "High Entropy - Probable AES/Symmetric Encryption or Compressed Shellcode"
    elif shannon_h > 6.0:
        classification = "Elevated Entropy - Potential Obfuscated / Packed Binary Payload"
    elif shannon_h < 3.0:
        classification = "Repetitive Byte Sequence / Padding Pattern"

    return {
        "detected_format": detection_format,
        "byte_length": len(raw_bytes),
        "shannon_entropy": shannon_h,
        "classification": classification,
        "byte_stats": byte_stats,
        "sliding_curve": sliding_curve,
        "extracted_strings": strings,
        "xor_candidates": xor_hits,
        "rot13": rot13_candidate,
        "url_decoded": url_decoded if url_decoded != clean_str else None,
        "hex_dump": raw_bytes[:128].hex()
    }
