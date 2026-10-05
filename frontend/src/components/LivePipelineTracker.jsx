import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  CircleDot, 
  Clock, 
  Zap, 
  Terminal, 
  Volume2, 
  FileAudio, 
  Languages, 
  Film, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const STAGES_META = [
  {
    id: 1,
    title: "Audio Extraction & VAD Whisper Transcription",
    desc: "16kHz extraction, Silero VAD silence trimming & greedy Whisper decoding",
    icon: FileAudio,
    accent: "from-blue-500 to-cyan-400"
  },
  {
    id: 2,
    title: "Fast Batched Translation & Speaker Diarization",
    desc: "Delimited batch neural translation & multi-speaker clustering",
    icon: Languages,
    accent: "from-cyan-400 to-teal-400"
  },
  {
    id: 3,
    title: "Multi-threaded Neural TTS Dubbing & Time-Stretching",
    desc: "Parallel Microsoft Edge Neural TTS & pitch-preserving atempo sync",
    icon: Volume2,
    accent: "from-teal-400 to-emerald-400"
  },
  {
    id: 4,
    title: "FFmpeg Subtitle & Audio Multiplexing",
    desc: "Neon ASS Karaoke burning, dynamic audio ducking & hardware muxing",
    icon: Film,
    accent: "from-emerald-400 to-amber-400"
  },
  {
    id: 5,
    title: "Pipeline Complete & Output Ready",
    desc: "Instant playback stream, interactive editor & multi-format export",
    icon: Sparkles,
    accent: "from-amber-400 to-emerald-300"
  }
];

const LivePipelineTracker = ({ baseName, isProcessing, isComplete }) => {
  const [telemetry, setTelemetry] = useState(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [showLogs, setShowLogs] = useState(true);

  // Poll progress from backend while processing or when newly mounted
  useEffect(() => {
    if (!baseName) return;

    let timer;
    const fetchProgress = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/progress/${baseName}`);
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
          if (data.elapsed_seconds) {
            setLiveElapsed(data.elapsed_seconds);
          }
        }
      } catch (err) {
        console.error("Progress fetch error:", err);
      }
    };

    fetchProgress();
    if (isProcessing) {
      timer = setInterval(fetchProgress, 800);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [baseName, isProcessing]);

  // Live timer tick when actively processing
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setLiveElapsed((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const currentStep = telemetry?.current_step || (isComplete ? 5 : isProcessing ? 1 : 0);
  const stepsData = telemetry?.steps || STAGES_META.map(s => ({
    id: s.id,
    title: s.title,
    detail: s.desc,
    status: isComplete ? "done" : (s.id < currentStep ? "done" : s.id === currentStep ? "active" : "pending"),
    time: ""
  }));

  const logs = telemetry?.logs || [
    `[0.0s] Initialized pipeline for '${baseName || 'video'}'`,
    isProcessing ? `[${liveElapsed}s] Live pipeline processing active...` : `[${liveElapsed}s] Ready`
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-slate-900/90 border border-slate-700/60 rounded-3xl p-6 lg:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between"
    >
      {/* Top subtle glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400 animate-pulse'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Live Pipeline Track
                {isProcessing && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                    LIVE
                  </span>
                )}
                {isComplete && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    FAST
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Multi-stage asynchronous AI telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-xs font-semibold text-emerald-400">
              {liveElapsed > 0 ? `${liveElapsed}s` : '0.0s'}
            </span>
          </div>
        </div>

        {/* Stages list */}
        <div className="space-y-3.5 relative">
          {STAGES_META.map((meta, idx) => {
            const stepNum = idx + 1;
            const stepInfo = stepsData.find(s => s.id === stepNum) || {};
            const isDone = isComplete || stepInfo.status === 'done' || stepNum < currentStep;
            const isActive = !isComplete && isProcessing && (stepInfo.status === 'active' || stepNum === currentStep);
            const isPending = !isDone && !isActive;
            const Icon = meta.icon;

            return (
              <div 
                key={meta.id}
                className={`relative flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-500/10 via-slate-800/80 to-slate-800/40 border border-blue-500/40 shadow-lg shadow-blue-500/5' 
                    : isDone 
                    ? 'bg-slate-800/40 border border-slate-700/30' 
                    : 'opacity-40 border border-transparent'
                }`}
              >
                {/* Connecting line */}
                {idx < STAGES_META.length - 1 && (
                  <div 
                    className={`absolute left-[26px] top-[42px] w-0.5 h-4 -z-0 transition-colors ${
                      isDone ? 'bg-emerald-500/50' : 'bg-slate-700/50'
                    }`} 
                  />
                )}

                {/* Status indicator icon */}
                <div className="relative z-10 mt-0.5">
                  {isDone ? (
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : isActive ? (
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/50 animate-pulse">
                      <CircleDot className="w-4 h-4 text-blue-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center border border-slate-700 text-xs font-mono font-bold">
                      {stepNum}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold truncate ${
                      isActive ? 'text-blue-300' : isDone ? 'text-slate-200' : 'text-slate-400'
                    }`}>
                      {meta.title}
                    </p>
                    {stepInfo.time && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                        {stepInfo.time}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {meta.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Live Log Ticker */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <button 
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors mb-2"
        >
          <span className="flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            Execution Telemetry Logs
          </span>
          {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-black/60 rounded-xl p-3 border border-slate-800 text-[11px] font-mono space-y-1 max-h-32 overflow-y-auto"
            >
              {logs.map((log, lIdx) => (
                <div key={lIdx} className="text-slate-300 flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold select-none">&gt;</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LivePipelineTracker;
