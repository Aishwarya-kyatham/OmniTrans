import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const KaraokeSubtitlePreview = ({ currentTime = 0, segments = [], stylePreset = 'capcut' }) => {
  // Find current active segment based on video currentTime
  const activeSegment = useMemo(() => {
    return segments.find(seg => currentTime >= seg.start && currentTime <= seg.end);
  }, [segments, currentTime]);

  if (!activeSegment) return null;

  const text = activeSegment.translated_text || activeSegment.text || activeSegment.original_text || '';
  const words = activeSegment.words && activeSegment.words.length > 0
    ? activeSegment.words
    : text.split(' ').map((w, idx, arr) => {
        const segDur = Math.max(0.5, activeSegment.end - activeSegment.start);
        const perWord = segDur / arr.length;
        return {
          word: w,
          start: activeSegment.start + idx * perWord,
          end: activeSegment.start + (idx + 1) * perWord
        };
      });

  // Preset styles matching ASS backend configurations
  const presets = {
    capcut: {
      activeClass: 'text-yellow-300 scale-110 drop-shadow-[0_4px_10px_rgba(234,179,8,0.8)] font-extrabold',
      inactiveClass: 'text-white opacity-80 font-bold',
      containerClass: 'bg-black/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-yellow-500/30 shadow-2xl'
    },
    neon: {
      activeClass: 'text-cyan-400 scale-115 drop-shadow-[0_0_15px_rgba(34,211,238,1)] font-black uppercase tracking-wider',
      inactiveClass: 'text-slate-400 font-bold',
      containerClass: 'bg-slate-950/90 border-2 border-cyan-500/50 px-8 py-4 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.4)]'
    },
    minimal: {
      activeClass: 'text-white font-semibold underline decoration-blue-400 decoration-4 underline-offset-4',
      inactiveClass: 'text-slate-300 font-normal',
      containerClass: 'bg-slate-900/80 px-5 py-2.5 rounded-lg border border-slate-700 shadow-md'
    },
    pop: {
      activeClass: 'text-fuchsia-400 scale-110 drop-shadow-[0_0_12px_rgba(232,121,249,0.9)] font-extrabold italic',
      inactiveClass: 'text-pink-100 opacity-75 font-semibold',
      containerClass: 'bg-slate-900/85 px-6 py-3 rounded-2xl border border-fuchsia-500/40 shadow-xl'
    },
    classic: {
      activeClass: 'text-yellow-400 font-bold',
      inactiveClass: 'text-white font-medium',
      containerClass: 'bg-black/60 px-4 py-2 rounded-md'
    }
  };

  const styleConfig = presets[stylePreset] || presets.capcut;

  return (
    <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center pointer-events-none z-30 px-4">
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeSegment.id || activeSegment.start}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-wrap justify-center items-center gap-2 max-w-2xl text-center ${styleConfig.containerClass}`}
        >
          {words.map((wObj, idx) => {
            const isActive = currentTime >= wObj.start && currentTime <= wObj.end;
            return (
              <span
                key={idx}
                className={`transition-all duration-150 text-xl sm:text-2xl ${
                  isActive ? styleConfig.activeClass : styleConfig.inactiveClass
                }`}
              >
                {wObj.word}
              </span>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default KaraokeSubtitlePreview;
