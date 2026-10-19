import React from "react";
import type { ThreatEvent } from "../types";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Zap,
} from "lucide-react";
import { audioEngine } from "../services/audioEngine";

interface FlightRecorderProps {
  currentTick: number;
  totalTicks: number;
  isPlaying: boolean;
  playbackSpeed: number;
  currentEvent: ThreatEvent | null;
  allEvents: ThreatEvent[];
  onPlay: () => void;
  onPause: () => void;
  onSeek: (tick: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSetSpeed: (speed: number) => void;
  onReset: () => void;
  onOpenPayloadLab?: (payload: string) => void;
}

export const FlightRecorder: React.FC<FlightRecorderProps> = ({
  currentTick,
  totalTicks,
  isPlaying,
  playbackSpeed,
  currentEvent,
  allEvents,
  onPlay,
  onPause,
  onSeek,
  onStepForward,
  onStepBackward,
  onSetSpeed,
  onReset,
  onOpenPayloadLab,
}) => {
  const eventMap = new Map<number, ThreatEvent>();
  allEvents.forEach((ev) => eventMap.set(ev.tick, ev));

  const formatTime = (tick: number) => {
    const sec = tick * 45;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `+${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-800 p-3 flex flex-col gap-2 font-mono select-none backdrop-blur-lg">
      {/* Top Banner: Active Threat Event Milestone */}
      <div className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800/80 text-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold whitespace-nowrap">
            <span className="radar-pulse text-cyan-400"></span> FLIGHT RECORDER:
          </span>

          {currentEvent ? (
            <div className="flex items-center gap-2 truncate">
              <span
                className={`badge text-[10px] ${
                  currentEvent.severity === "critical"
                    ? "badge-critical"
                    : currentEvent.severity === "high"
                    ? "badge-high"
                    : "badge-medium"
                }`}
              >
                {currentEvent.severity}
              </span>
              <span className="text-white font-sans font-semibold truncate">
                {currentEvent.title}
              </span>
              <span className="text-slate-400 text-[10px]">
                ({currentEvent.mitre_technique_id})
              </span>
            </div>
          ) : (
            <span className="text-slate-500 italic">
              Baseline telemetry: Network operating in pre-compromise state.
            </span>
          )}
        </div>

        {currentEvent?.payload_sample && onOpenPayloadLab && (
          <button
            onClick={() => onOpenPayloadLab(currentEvent.payload_sample!)}
            className="text-[10px] text-cyan-400 hover:text-cyan-200 border border-cyan-800 hover:border-cyan-500 px-2 py-0.5 rounded flex items-center gap-1 transition whitespace-nowrap"
          >
            <Zap size={11} /> Inspect Event Payload
          </button>
        )}
      </div>

      {/* Center: Controls + Timeline Scrubber */}
      <div className="flex items-center gap-4">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              onReset();
              audioEngine.playClick(800);
            }}
            title="Reset to Tick 0"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => {
              onStepBackward();
              audioEngine.playClick(1000);
            }}
            title="Step Backward (1 Tick)"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <SkipBack size={14} />
          </button>

          {isPlaying ? (
            <button
              onClick={() => {
                onPause();
                audioEngine.playClick(1100);
              }}
              title="Pause Simulation"
              className="p-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded hover:bg-cyan-500/30 transition"
            >
              <Pause size={15} />
            </button>
          ) : (
            <button
              onClick={() => {
                onPlay();
                audioEngine.playClick(1400);
              }}
              title="Play Simulation"
              className="p-1.5 bg-cyan-500 text-black font-bold rounded hover:bg-cyan-400 transition"
            >
              <Play size={15} />
            </button>
          )}

          <button
            onClick={() => {
              onStepForward();
              audioEngine.playClick(1300);
            }}
            title="Step Forward (1 Tick)"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Tick & Time Counter */}
        <div className="text-xs whitespace-nowrap text-slate-300 font-bold bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-800">
          TICK <span className="text-cyan-400">{currentTick.toString().padStart(2, "0")}</span> /{" "}
          {totalTicks.toString().padStart(2, "0")}{" "}
          <span className="text-slate-500 font-normal">({formatTime(currentTick)})</span>
        </div>

        {/* Timeline Track with Clickable Milestone Nodes */}
        <div className="flex-1 flex items-center relative py-2">
          {/* Base Track */}
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${(currentTick / totalTicks) * 100}%` }}
            />
          </div>

          {/* Tick Clickable Anchors */}
          <div className="absolute inset-x-0 flex items-center justify-between pointer-events-none">
            {Array.from({ length: totalTicks + 1 }).map((_, tickIdx) => {
              const eventAtTick = eventMap.get(tickIdx);
              const isActive = tickIdx <= currentTick;
              const isCurrent = tickIdx === currentTick;

              return (
                <button
                  key={tickIdx}
                  onClick={() => {
                    onSeek(tickIdx);
                    audioEngine.playClick(1000 + tickIdx * 60);
                  }}
                  className={`pointer-events-auto w-3.5 h-3.5 rounded-full -ml-1.5 -mr-1.5 flex items-center justify-center transition-all ${
                    isCurrent
                      ? "ring-2 ring-cyan-400 bg-white scale-125 z-10"
                      : eventAtTick
                      ? eventAtTick.severity === "critical"
                        ? "bg-rose-500 hover:scale-125"
                        : "bg-amber-400 hover:scale-125"
                      : isActive
                      ? "bg-cyan-500 hover:scale-110"
                      : "bg-slate-700 hover:bg-slate-500"
                  }`}
                  title={`Tick ${tickIdx}: ${eventAtTick ? eventAtTick.title : "Clean state"}`}
                />
              );
            })}
          </div>
        </div>

        {/* Playback Speed Multiplier Toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px]">
          {[0.5, 1.0, 2.0, 5.0].map((spd) => (
            <button
              key={spd}
              onClick={() => {
                onSetSpeed(spd);
                audioEngine.playClick(1200);
              }}
              className={`px-1.5 py-0.5 rounded transition ${
                playbackSpeed === spd
                  ? "bg-cyan-500 text-black font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
