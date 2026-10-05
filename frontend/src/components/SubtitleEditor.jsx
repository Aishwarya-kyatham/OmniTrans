import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Plus, Trash2, Split, GitMerge, Save, Download, 
  RefreshCw, CheckCircle, AlertTriangle, ArrowLeft, Video, Sparkles, FileText,
  Mic, Volume2, UserCheck, X, Sliders, Scan
} from 'lucide-react';
import SubtitleTimeline from './SubtitleTimeline';
import KaraokeSubtitlePreview from './KaraokeSubtitlePreview';
import ExportModal from './ExportModal';

function SubtitleEditor({ baseName, targetLanguage = 'es', onBack }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [scanningOCR, setScanningOCR] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState(null);
  const [stylePreset, setStylePreset] = useState('capcut');
  const [showExportModal, setShowExportModal] = useState(false);

  // Neural Voice & Speaker Diarization State
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceMap, setVoiceMap] = useState({});
  const [speakers, setSpeakers] = useState(['SPEAKER_00']);
  const [syncReports, setSyncReports] = useState([]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const videoRef = useRef(null);
  const activeRowRef = useRef(null);

  const videoStreamUrl = `http://127.0.0.1:8000/api/stream/${baseName}_fully_translated_${targetLanguage}.mp4`;

  useEffect(() => {
    fetchSubtitles();
    fetchVoices();
  }, [baseName, targetLanguage]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSubtitles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/subtitles/${baseName}`);
      if (!res.ok) throw new Error('Failed to load subtitles data');
      const data = await res.json();
      if (data.segments && data.segments.length > 0) {
        setSegments(data.segments);
        setSelectedId(data.segments[0].id);
      } else {
        setSegments([]);
      }
    } catch (err) {
      console.error('Error loading subtitles:', err);
      showToast('error', 'Could not load subtitles from server');
    } finally {
      setLoading(false);
    }
  };

  const fetchVoices = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/subtitles/${baseName}/voices?lang=${targetLanguage}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableVoices(data.available_voices || []);
        setVoiceMap(data.current_voice_map || {});
        setSpeakers(data.speakers || ['SPEAKER_00']);
        if (data.sync_reports) setSyncReports(data.sync_reports);
      }
    } catch (err) {
      console.error('Error fetching voice data:', err);
    }
  };

  const handleSaveVoiceMap = async (updatedMap) => {
    setVoiceMap(updatedMap);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/subtitles/${baseName}/voices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_map: updatedMap })
      });
      if (res.ok) {
        showToast('success', 'Voice mapping updated successfully!');
      }
    } catch (err) {
      showToast('error', 'Failed to save voice map');
    }
  };

  const handleScanHardcodedSubtitles = async () => {
    setScanningOCR(true);
    showToast('info', 'Scanning video frames with Translumo Multi-Engine OCR...');
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/video/${baseName}/extract-burned-subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roi_mode: 'bottom_third',
          fps: 1,
          source_language: 'en',
          target_language: targetLanguage,
          merge_with_pipeline: true
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const detected = data.subtitles || [];
        if (detected.length === 0) {
          showToast('info', 'Translumo OCR complete: No burned-in subtitles detected in video.');
        } else {
          // Merge or append to existing segments
          setSegments(prev => {
            const combined = [...prev, ...detected].sort((a, b) => a.start - b.start);
            return combined.map((s, idx) => ({ ...s, id: idx + 1 }));
          });
          showToast('success', `Translumo OCR: Extracted & translated ${detected.length} burned-in subtitle(s)!`);
        }
      } else {
        showToast('error', data.message || data.error || 'OCR scan failed');
      }
    } catch (err) {
      console.error('Error during Translumo OCR scan:', err);
      showToast('error', 'Failed to communicate with OCR service');
    } finally {
      setScanningOCR(false);
    }
  };

  const activeSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  useEffect(() => {
    if (activeSegment && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSegment?.id]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleUpdateSegment = (id, field, value) => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== id) return seg;

        let updatedValue = value;
        if (field === 'start' || field === 'end') {
          updatedValue = parseFloat(value) || 0;
        }

        const updated = { ...seg, [field]: updatedValue };

        if (field === 'translated_text') {
          updated.text = value;
        }

        return updated;
      })
    );
  };

  const handleAddSegment = () => {
    const newStart = Math.round(currentTime * 10) / 10;
    const newEnd = Math.round((newStart + 3.0) * 10) / 10;

    const newSegment = {
      id: Date.now(),
      start: newStart,
      end: newEnd,
      speaker: speakers[0] || 'SPEAKER_00',
      original_text: 'New Subtitle Text',
      translated_text: 'Nuevo Subtítulo',
      text: 'Nuevo Subtítulo',
    };

    const insertIdx = segments.findIndex((s) => s.start > newStart);

    let updatedList = [];
    if (insertIdx === -1) {
      updatedList = [...segments, newSegment];
    } else {
      updatedList = [
        ...segments.slice(0, insertIdx),
        newSegment,
        ...segments.slice(insertIdx),
      ];
    }

    updatedList = updatedList.map((s, idx) => ({ ...s, id: idx + 1 }));
    setSegments(updatedList);
    setSelectedId(newSegment.id);
    showToast('success', 'Added new subtitle segment');
  };

  const handleDeleteSegment = () => {
    if (!selectedId) return;
    const filtered = segments.filter((s) => s.id !== selectedId);
    const reindexed = filtered.map((s, idx) => ({ ...s, id: idx + 1 }));
    setSegments(reindexed);
    setSelectedId(reindexed.length > 0 ? reindexed[0].id : null);
    showToast('info', 'Deleted subtitle segment');
  };

  const handleSplitSegment = () => {
    if (!selectedId) return;
    const target = segments.find((s) => s.id === selectedId);
    if (!target) return;

    let splitTime = Math.round(currentTime * 10) / 10;
    if (splitTime <= target.start || splitTime >= target.end) {
      splitTime = Math.round(((target.start + target.end) / 2) * 10) / 10;
    }

    const firstHalf = {
      ...target,
      end: splitTime,
    };

    const secondHalf = {
      id: Date.now(),
      start: splitTime,
      end: target.end,
      speaker: target.speaker || 'SPEAKER_00',
      original_text: target.original_text,
      translated_text: target.translated_text,
      text: target.translated_text,
    };

    const targetIdx = segments.findIndex((s) => s.id === selectedId);
    const updated = [
      ...segments.slice(0, targetIdx),
      firstHalf,
      secondHalf,
      ...segments.slice(targetIdx + 1),
    ].map((s, idx) => ({ ...s, id: idx + 1 }));

    setSegments(updated);
    showToast('success', `Split segment into 2 parts at ${splitTime}s`);
  };

  const handleMergeSegments = () => {
    if (!selectedId) return;
    const targetIdx = segments.findIndex((s) => s.id === selectedId);
    if (targetIdx === -1 || targetIdx >= segments.length - 1) {
      showToast('error', 'Select a segment with a following segment to merge');
      return;
    }

    const current = segments[targetIdx];
    const nextSeg = segments[targetIdx + 1];

    const merged = {
      ...current,
      end: nextSeg.end,
      original_text: `${current.original_text} ${nextSeg.original_text}`.trim(),
      translated_text: `${current.translated_text} ${nextSeg.translated_text}`.trim(),
      text: `${current.translated_text} ${nextSeg.translated_text}`,
    };

    const updated = [
      ...segments.slice(0, targetIdx),
      merged,
      ...segments.slice(targetIdx + 2),
    ].map((s, idx) => ({ ...s, id: idx + 1 }));

    setSegments(updated);
    setSelectedId(merged.id);
    showToast('success', `Merged segment #${current.id} and #${nextSeg.id}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/subtitles/${baseName}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_language: targetLanguage,
          segments: segments,
        }),
      });

      if (!res.ok) throw new Error('Failed to save subtitles');
      const data = await res.json();
      setSegments(data.segments);
      showToast('success', 'Subtitles saved & validated successfully!');
    } catch (err) {
      console.error('Save error:', err);
      showToast('error', 'Error saving subtitles to server');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format) => {
    const url = `http://127.0.0.1:8000/api/subtitles/${baseName}/export/${format}?lang=${targetLanguage}`;
    window.open(url, '_blank');
    showToast('success', `Downloading .${format.toUpperCase()} subtitle file...`);
  };

  const handleReRenderVideo = async () => {
    setRendering(true);
    showToast('info', 'Re-rendering dubbed video & synchronizing audio...');
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/subtitles/${baseName}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_language: targetLanguage,
          segments: segments,
        }),
      });
      if (!res.ok) throw new Error('Failed to re-render video');
      const data = await res.json();
      if (data.status === 'complete') {
        if (data.sync_reports) setSyncReports(data.sync_reports);
        showToast('success', 'Dubbed video re-rendered & audio synchronized!');
        if (videoRef.current) {
          videoRef.current.src = `${videoStreamUrl}?t=${Date.now()}`;
        }
      } else {
        throw new Error(data.error || 'Re-rendering failed');
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Error re-rendering video');
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 text-slate-100 flex flex-col gap-6">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-blue-950/90 border-blue-500 text-blue-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speaker Voice Mapping Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <Mic className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Speaker Voice Mapping</h3>
                    <p className="text-xs text-slate-400">Assign Neural TTS voices for detected speakers</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {speakers.map((spk) => {
                  const currentVoice = voiceMap[spk] || (availableVoices[0] && availableVoices[0].id) || '';
                  return (
                    <div key={spk} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          {spk}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase">Target Voice</span>
                      </div>
                      <select
                        value={currentVoice}
                        onChange={(e) => {
                          const updated = { ...voiceMap, [spk]: e.target.value };
                          handleSaveVoiceMap(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 focus:border-emerald-500 outline-none"
                      >
                        {availableVoices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.gender})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setShowVoiceModal(false);
                    handleReRenderVideo();
                  }}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-xl text-sm transition-all"
                >
                  Apply & Re-generate Dubbing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Synchronization Warnings Banner */}
      {syncReports && syncReports.length > 0 && (
        <div className="bg-amber-950/60 border border-amber-500/40 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-300">
              {syncReports.length} Segment(s) Required Time-Stretching Adjustment:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 max-h-24 overflow-y-auto">
              {syncReports.map((r, idx) => (
                <li key={idx}>
                  Segment #{r.segment_id} ({r.speaker}): {r.warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Editor Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Subtitle & Dubbing Editor
            </h2>
            <p className="text-xs text-slate-400">
              Project: <span className="text-emerald-400 font-mono">{baseName}</span> ({targetLanguage.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Style Preset Selector for Karaoke Preview */}
          <select
            value={stylePreset}
            onChange={(e) => setStylePreset(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-yellow-400"
          >
            <option value="capcut">Preset: CapCut Bold (Yellow)</option>
            <option value="neon">Preset: Neon Cyberpunk</option>
            <option value="minimal">Preset: Minimal Box</option>
            <option value="pop">Preset: Pop Pink</option>
            <option value="classic">Preset: Classic</option>
          </select>

          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-xl text-sm border border-slate-700 transition-all"
          >
            <Mic className="w-4 h-4" />
            Voices & Diarization
          </button>

          <button
            onClick={handleScanHardcodedSubtitles}
            disabled={scanningOCR}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 hover:text-purple-200 font-semibold rounded-xl text-sm border border-purple-800/60 shadow-sm transition-all"
            title="Scan & extract burned-in video subtitles with Translumo Multi-Engine OCR"
          >
            {scanningOCR ? (
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            ) : (
              <Scan className="w-4 h-4 text-purple-400" />
            )}
            Translumo OCR
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 text-sm transition-all"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Subtitles
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-md transition-all"
          >
            <Sliders className="w-4 h-4 text-yellow-400" />
            Custom Export & Lip-Sync
          </button>

          <button
            onClick={handleReRenderVideo}
            disabled={rendering}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
          >
            {rendering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            Re-render Dubbed MP4
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Video Preview & Timeline */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-black relative">
            <video
              ref={videoRef}
              src={videoStreamUrl}
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full aspect-video object-contain"
              controls
            />
            
            {/* Live Karaoke Subtitle Preview Overlay */}
            <KaraokeSubtitlePreview
              currentTime={currentTime}
              segments={segments}
              stylePreset={stylePreset}
            />
          </div>

          {/* Timeline Component */}
          <SubtitleTimeline
            segments={segments}
            duration={duration}
            currentTime={currentTime}
            selectedId={selectedId}
            onSelectSegment={(seg) => setSelectedId(seg.id)}
            onSeek={handleSeek}
          />
        </div>

        {/* Right Column: Subtitle List & Tools */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Action Row Toolbar */}
          <div className="flex flex-wrap items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddSegment}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Subtitle
              </button>
              <button
                onClick={handleSplitSegment}
                disabled={!selectedId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors disabled:opacity-40"
              >
                <Split className="w-3.5 h-3.5" /> Split
              </button>
              <button
                onClick={handleMergeSegments}
                disabled={!selectedId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors disabled:opacity-40"
              >
                <GitMerge className="w-3.5 h-3.5" /> Merge
              </button>
            </div>

            <button
              onClick={handleDeleteSegment}
              disabled={!selectedId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/30 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>

          {/* Subtitle Rows List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 max-h-[600px] overflow-y-auto space-y-3 shadow-inner">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                Loading subtitles & voice mapping...
              </div>
            ) : segments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No subtitle segments found. Click "Add Subtitle" to create one.
              </div>
            ) : (
              segments.map((seg) => {
                const isSelected = selectedId === seg.id;
                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                const isWarned = syncReports.some((r) => r.segment_id === seg.id);

                return (
                  <div
                    key={seg.id}
                    ref={isActive ? activeRowRef : null}
                    onClick={() => {
                      setSelectedId(seg.id);
                      handleSeek(seg.start);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                        : isActive
                        ? 'bg-slate-900/90 border-blue-500/60 shadow-md shadow-blue-500/5'
                        : isWarned
                        ? 'bg-slate-950/60 border-amber-500/40'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row: Segment ID, Speaker, & Timestamps */}
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{seg.id}
                        </span>

                        <select
                          value={seg.speaker || 'SPEAKER_00'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateSegment(seg.id, 'speaker', e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono font-bold rounded px-1.5 py-0.5 outline-none focus:border-emerald-500"
                        >
                          {speakers.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        {isActive && (
                          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider animate-pulse">
                            Playing
                          </span>
                        )}

                        {isWarned && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold flex items-center gap-1" title="Segment timing stretched beyond optimal bounds">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Sync Stretch
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={seg.start}
                          onChange={(e) => handleUpdateSegment(seg.id, 'start', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-emerald-400 font-medium text-center focus:border-emerald-500 outline-none"
                        />
                        <span className="text-slate-600">→</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={seg.end}
                          onChange={(e) => handleUpdateSegment(seg.id, 'end', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-emerald-400 font-medium text-center focus:border-emerald-500 outline-none"
                        />
                        <span className="text-slate-500 text-[10px]">
                          ({(seg.end - seg.start).toFixed(1)}s)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {seg.original_text && (
                        <div className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Original:</span>
                          {seg.original_text}
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] text-emerald-400/80 uppercase font-semibold block mb-1">Translated Subtitle:</span>
                        <textarea
                          rows={2}
                          value={seg.translated_text || ''}
                          onChange={(e) => handleUpdateSegment(seg.id, 'translated_text', e.target.value)}
                          placeholder="Enter subtitle text..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Custom Export & Lip Sync Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        baseName={baseName}
        targetLanguage={targetLanguage}
        segments={segments}
      />
    </div>
  );
}

export default SubtitleEditor;
