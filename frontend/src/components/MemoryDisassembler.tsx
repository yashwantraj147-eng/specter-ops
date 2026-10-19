import React, { useState } from "react";
import { Cpu, Search, Layers, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface DisasmLine {
  address: string;
  bytes: string;
  instruction: string;
  mnemonic: "CALL" | "MOV" | "XOR" | "PUSH" | "POP" | "JMP" | "SUB" | "LEA" | "RET" | "INT3";
  isSuspicious: boolean;
  comment?: string;
}

const SAMPLE_SHELLCODE_LINES: DisasmLine[] = [
  { address: "0x00401000", bytes: "48 83 EC 28", instruction: "SUB RSP, 0x28", mnemonic: "SUB", isSuspicious: false },
  { address: "0x00401004", bytes: "48 31 C0", instruction: "XOR RAX, RAX", mnemonic: "XOR", isSuspicious: false, comment: "Zero out return register" },
  { address: "0x00401007", bytes: "48 89 5C 24 20", instruction: "MOV QWORD PTR [RSP+0x20], RBX", mnemonic: "MOV", isSuspicious: false },
  { address: "0x0040100C", bytes: "48 8D 0D 40 21", instruction: "LEA RCX, [RIP+0x2140]", mnemonic: "LEA", isSuspicious: false, comment: "\"kernel32.dll\"" },
  { address: "0x00401011", bytes: "FF 15 28 30 00", instruction: "CALL QWORD PTR [GetModuleHandleA]", mnemonic: "CALL", isSuspicious: true, comment: "Resolve base address" },
  { address: "0x00401017", bytes: "48 89 C3", instruction: "MOV RBX, RAX", mnemonic: "MOV", isSuspicious: false },
  { address: "0x0040101A", bytes: "48 8D 15 60 21", instruction: "LEA RDX, [RIP+0x2160]", mnemonic: "LEA", isSuspicious: true, comment: "\"VirtualAllocEx\"" },
  { address: "0x00401021", bytes: "48 89 D9", instruction: "MOV RCX, RBX", mnemonic: "MOV", isSuspicious: false },
  { address: "0x00401024", bytes: "FF 15 30 30 00", instruction: "CALL QWORD PTR [GetProcAddress]", mnemonic: "CALL", isSuspicious: true, comment: "Dynamic API Resolution" },
  { address: "0x0040102A", bytes: "49 BA 00 10 00 00", instruction: "MOV R10, 0x1000", mnemonic: "MOV", isSuspicious: false, comment: "MEM_COMMIT" },
  { address: "0x00401031", bytes: "41 B8 40 00 00 00", instruction: "MOV R8D, 0x40", mnemonic: "MOV", isSuspicious: true, comment: "PAGE_EXECUTE_READWRITE" },
  { address: "0x00401037", bytes: "FF D0", instruction: "CALL RAX", mnemonic: "CALL", isSuspicious: true, comment: "Execute VirtualAlloc allocation" },
  { address: "0x00401039", bytes: "48 8D 35 90 21", instruction: "LEA RSI, [RIP+0x2190]", mnemonic: "LEA", isSuspicious: true, comment: "SUNBURST Shellcode Blob" },
  { address: "0x00401040", bytes: "48 89 C7", instruction: "MOV RDI, RAX", mnemonic: "MOV", isSuspicious: false },
  { address: "0x00401043", bytes: "B9 00 04 00 00", instruction: "MOV ECX, 0x400", mnemonic: "MOV", isSuspicious: false, comment: "1024 bytes" },
  { address: "0x00401048", bytes: "F3 A4", instruction: "REP MOVSB", mnemonic: "MOV", isSuspicious: true, comment: "In-Memory Shellcode Staging" },
  { address: "0x0040104A", bytes: "FF E0", instruction: "JMP RAX", mnemonic: "JMP", isSuspicious: true, comment: "[CRITICAL] Jump into RWX Shellcode" },
  { address: "0x0040104C", bytes: "CC", instruction: "INT3", mnemonic: "INT3", isSuspicious: false },
];

export const MemoryDisassembler: React.FC = () => {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeAddress, setActiveAddress] = useState<string>("0x00401011");
  const [isSimulating, setIsSimulating] = useState(false);

  const filteredLines = SAMPLE_SHELLCODE_LINES.filter(
    (l) =>
      l.instruction.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.address.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (l.comment && l.comment.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const selectedLine = SAMPLE_SHELLCODE_LINES.find((l) => l.address === activeAddress);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 p-4 font-mono select-none overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
            <Cpu size={16} /> Native Memory Disassembler & x86 Opcodes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Static & dynamic instruction disassembly for memory hook analysis and shellcode extraction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <span className="text-slate-500">HOOK TECHNIQUE:</span>
            <span className="text-rose-400 font-bold">Process Hollowing (VirtualAllocEx)</span>
          </div>

          <button
            onClick={() => {
              setIsSimulating(true);
              audioEngine.playThreatAlarm();
              setTimeout(() => setIsSimulating(false), 2000);
            }}
            className="btn-primary text-xs px-3 py-1 flex items-center gap-1.5"
          >
            {isSimulating ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            Emulate Memory Execution
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Disassembly Table + Right Register CPU State */}
      <div className="flex-1 flex gap-4 mt-4 min-h-0 overflow-hidden">
        {/* Left: Disassembly Viewer */}
        <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden backdrop-blur">
          {/* Filter Bar */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <Layers size={13} /> PE SECTION: .text [0x00401000 - 0x00401050]
            </span>
            <div className="relative w-64">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search mnemonic or comment..."
                className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2.5 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs select-text">
            {filteredLines.map((line) => {
              const isSelected = activeAddress === line.address;

              return (
                <div
                  key={line.address}
                  onClick={() => {
                    setActiveAddress(line.address);
                    audioEngine.playClick(line.isSuspicious ? 1600 : 1100);
                  }}
                  className={`p-2 rounded border cursor-pointer transition flex items-center gap-4 ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-400 text-white shadow-md shadow-cyan-950/50"
                      : line.isSuspicious
                      ? "bg-rose-950/20 border-rose-900/40 text-rose-200 hover:border-rose-600"
                      : "bg-slate-950/40 border-slate-800/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="text-slate-500 font-semibold w-24">{line.address}</span>
                  <span className="text-slate-400 w-36 text-[11px] truncate">{line.bytes}</span>
                  <span
                    className={`font-bold w-48 ${
                      line.isSuspicious ? "text-rose-400" : "text-cyan-300"
                    }`}
                  >
                    {line.instruction}
                  </span>
                  {line.comment && (
                    <span className="text-[11px] text-slate-400 italic flex-1 truncate">
                      ; {line.comment}
                    </span>
                  )}
                  {line.isSuspicious && (
                    <span className="badge badge-critical text-[9px] py-0 px-1.5 whitespace-nowrap">
                      HOOK SUSPECT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: CPU Register State & Exploit Intel */}
        <div className="w-80 flex flex-col gap-4">
          {/* Register Card */}
          <div className="hud-panel p-3.5 flex flex-col">
            <span className="text-xs text-cyan-400 font-bold block mb-2">
              x86_64 REGISTERS DUMP
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RAX</span>
                <span className="text-cyan-300 font-bold">0x00007FFE00142000</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RBX</span>
                <span className="text-slate-300 font-bold">0x00007FFE00100000</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RCX</span>
                <span className="text-slate-300 font-bold">0x0000000000000400</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RDX</span>
                <span className="text-slate-300 font-bold">0x0000000000000040</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RSP</span>
                <span className="text-amber-400 font-bold">0x0000002E8F19FC40</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RIP</span>
                <span className="text-rose-400 font-bold">{activeAddress}</span>
              </div>
            </div>
          </div>

          {/* Active Exploit Intel Card */}
          <div className="hud-panel p-3.5 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-xs text-rose-400 font-bold block mb-1.5 flex items-center gap-1.5">
                <ShieldAlert size={14} /> EXPLOIT HEURISTIC ANALYSIS
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                The observed opcode sequence invokes <code className="text-cyan-400">VirtualAllocEx</code> with <code className="text-amber-400">PAGE_EXECUTE_READWRITE (0x40)</code> permissions, followed by a memory copy (<code className="text-cyan-400">REP MOVSB</code>) and a direct jump register (<code className="text-rose-400">JMP RAX</code>).
              </p>
              <div className="mt-3 p-2 bg-rose-950/30 border border-rose-900/50 rounded text-rose-300 text-[11px] leading-relaxed">
                Confirmed in-memory process hollowing characteristic of APT29 SUNBURST compiler injection.
              </div>
            </div>

            {selectedLine && (
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                <span>Selected: </span>
                <span className="text-white font-bold">{selectedLine.instruction}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
