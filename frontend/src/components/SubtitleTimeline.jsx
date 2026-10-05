import React, { useRef } from 'react';

function SubtitleTimeline({ segments, duration, currentTime, selectedId, onSelectSegment, onSeek }) {
  const containerRef = useRef(null);

  if (!duration || duration <= 0) {
    return (
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-500">
        Load video to view subtitle timeline
      </div>
    );
  }

  const handleTimelineClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = clickRatio * duration;
    onSeek(newTime);
  };

  const playheadPercent = Math.max(0, Math.min(100, (currentTime / duration) * 100));

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex justify-between items-center text-xs text-slate-400 font-mono mb-2">
        <span>00:00</span>
        <span className="text-emerald-400 font-bold">{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Interactive Timeline Bar */}
      <div
        ref={containerRef}
        onClick={handleTimelineClick}
        className="relative h-12 w-full bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden cursor-pointer select-none group"
      >
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-full border-r border-slate-500 w-0" />
          ))}
        </div>

        {/* Subtitle Segment Blocks */}
        {segments.map((seg) => {
          const leftPercent = Math.max(0, (seg.start / duration) * 100);
          const widthPercent = Math.max(0.5, ((seg.end - seg.start) / duration) * 100);
          const isSelected = selectedId === seg.id;
          const isActive = currentTime >= seg.start && currentTime <= seg.end;

          return (
            <div
              key={seg.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSegment(seg);
                onSeek(seg.start);
              }}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`[${seg.id}] ${seg.translated_text || seg.original_text}`}
              className={`absolute top-2 bottom-2 rounded-md text-[10px] font-medium px-1.5 flex items-center justify-between overflow-hidden transition-all border ${
                isSelected
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 z-20 ring-2 ring-emerald-400/50'
                  : isActive
                  ? 'bg-blue-500/30 border-blue-400 text-blue-200 z-10'
                  : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700/80 text-slate-300'
              }`}
            >
              <span className="truncate font-mono">#{seg.id}</span>
            </div>
          );
        })}

        {/* Playhead Marker */}
        <div
          style={{ left: `${playheadPercent}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] z-30 pointer-events-none transition-all duration-75"
        >
          <div className="w-3 h-3 bg-emerald-400 rounded-full -ml-[5px] -top-1 absolute shadow-md"></div>
        </div>
      </div>
    </div>
  );
}

export default SubtitleTimeline;
