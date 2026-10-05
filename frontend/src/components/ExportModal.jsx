import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Sparkles, Sliders, CheckCircle2, Film, FileText, Smile, X } from 'lucide-react';

const ExportModal = ({ isOpen, onClose, baseName, targetLanguage, segments }) => {
  const [subtitleMode, setSubtitleMode] = useState('hardcoded'); // 'hardcoded', 'soft', 'separate'
  const [stylePreset, setStylePreset] = useState('capcut'); // 'capcut', 'neon', 'minimal', 'pop', 'classic'
  const [enableLipsync, setEnableLipsync] = useState(false);
  const [containerFormat, setContainerFormat] = useState('mp4'); // 'mp4', 'mkv'
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);

  if (!isOpen) return null;

  const presets = [
    { id: 'capcut', name: 'CapCut Bold', color: 'bg-yellow-500 text-black', border: 'border-yellow-400', desc: 'Vibrant yellow text with dark outline' },
    { id: 'neon', name: 'Neon Cyberpunk', color: 'bg-cyan-500 text-black', border: 'border-cyan-400', desc: 'Glowing cyan karaoke highlights' },
    { id: 'minimal', name: 'Minimal Box', color: 'bg-slate-700 text-white', border: 'border-slate-500', desc: 'Clean white captions with semi-transparent box' },
    { id: 'pop', name: 'Pop Highlight', color: 'bg-fuchsia-500 text-white', border: 'border-fuchsia-400', desc: 'Energetic magenta active word highlights' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(null);

    try {
      if (subtitleMode === 'separate') {
        // Direct SRT / VTT Download
        window.open(`http://localhost:8000/api/download/${baseName}_${targetLanguage}.srt`, '_blank');
        setIsExporting(false);
        setExportSuccess({ filename: `${baseName}_${targetLanguage}.srt` });
        return;
      }

      const res = await fetch('http://localhost:8000/api/export/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_name: baseName,
          target_language: targetLanguage,
          subtitle_mode: subtitleMode,
          style_preset: stylePreset,
          enable_lipsync: enableLipsync,
          container_format: containerFormat
        })
      });

      const data = await res.json();

      if (data.status === 'success') {
        setExportSuccess(data);
        window.open(`http://localhost:8000${data.download_url}`, '_blank');
      } else {
        alert(`Export error: ${data.error || 'Failed to render custom export'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <Sliders className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Export & Customization</h2>
                <p className="text-xs text-slate-400">Configure visual subtitles, soft/hard tracks, & AI lip-sync</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* 1. Subtitle Mode Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-3 flex items-center gap-2">
                <Film className="w-4 h-4 text-blue-400" /> Subtitle Delivery Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSubtitleMode('hardcoded')}
                  className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    subtitleMode === 'hardcoded' 
                      ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10' 
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-sm text-white">Hardcoded Burn</span>
                  <span className="text-[11px] text-slate-400 mt-1">Subtitles rendered directly on video frames</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubtitleMode('soft')}
                  className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    subtitleMode === 'soft' 
                      ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10' 
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-sm text-white">Soft Subtitle Track</span>
                  <span className="text-[11px] text-slate-400 mt-1">Selectable track inside MP4 / MKV stream</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubtitleMode('separate')}
                  className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    subtitleMode === 'separate' 
                      ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10' 
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-sm text-white">Separate Subtitles</span>
                  <span className="text-[11px] text-slate-400 mt-1">Download standalone .SRT / .VTT file</span>
                </button>
              </div>
            </div>

            {/* Container format toggle if soft subtitles selected */}
            {subtitleMode === 'soft' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Select Container Format</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setContainerFormat('mp4')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${containerFormat === 'mp4' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    MP4 Container (mov_text)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContainerFormat('mkv')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${containerFormat === 'mkv' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    MKV Container (srt track)
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. Subtitle Preset Styling (Only if hardcoded burn selected) */}
            {subtitleMode === 'hardcoded' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label className="text-sm font-semibold text-slate-300 block mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" /> Karaoke Visual Preset
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {presets.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setStylePreset(p.id)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                        stylePreset === p.id 
                          ? `${p.border} bg-slate-800 text-white shadow-md` 
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-black ${p.color}`}>
                        Text
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 3. AI Lip-Syncing Toggle */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Smile className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Lip-Syncing (Wav2Lip)</h4>
                  <p className="text-xs text-slate-400">Modify mouth movements in video to match dubbed audio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableLipsync(!enableLipsync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enableLipsync ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enableLipsync ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <>Rendering Custom Video...</>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Render & Download Video
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExportModal;
