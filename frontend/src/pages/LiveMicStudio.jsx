import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Globe, 
  Sparkles, 
  Radio, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND = 'http://localhost:8000';

const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese (简体中文)', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'en', name: 'English (US)', flag: '🇺🇸' }
];

function LiveMicStudio() {
  const navigate = useNavigate();

  const [targetLang, setTargetLang] = useState('hi');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [micVolume, setMicVolume] = useState(0);
  const [activePopupResult, setActivePopupResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Initialize and clean up audio context
  useEffect(() => {
    return () => {
      stopRecording();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio analysis for live visualizer
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Configure MediaRecorder
      const options = MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' } 
        : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        if (audioBlob.size > 500) {
          await processLiveAudio(audioBlob);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setErrorMsg('Microphone permission denied. Please allow microphone access in your browser settings.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setMicVolume(0);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const processLiveAudio = async (blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', blob, 'live_mic.webm');
    formData.append('target_language', targetLang);
    formData.append('source_language', 'auto');

    try {
      const res = await fetch(`${BACKEND}/api/live-translate`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      if (data.status === 'success' && data.original_text) {
        const newEntry = {
          id: Date.now(),
          originalText: data.original_text,
          translatedText: data.translated_text,
          detectedLang: data.detected_language,
          targetLang: data.target_language,
          audioBase64: data.audio_base64,
          timestamp: new Date().toLocaleTimeString(),
        };

        setHistory((prev) => [newEntry, ...prev]);
        setActivePopupResult(newEntry);

        // Auto-play the synthesized dubbed speech with audible volume
        if (data.audio_base64) {
          playAudioBase64(data.audio_base64);
        }
      }
    } catch (err) {
      console.error('Live translate error:', err);
      setErrorMsg('Translation failed. Make sure the backend server is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioBase64 = (base64) => {
    if (!base64) return;
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      const audioUrl = `data:audio/wav;base64,${base64}`;
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      audioPlayerRef.current = audio;
      audio.play().catch((err) => {
        console.warn('Audio auto-play blocked or waiting for user interaction:', err);
      });
    } catch (e) {
      console.warn('Playback error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-rose-500/30">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-xl shadow-lg shadow-rose-500/20">
              <Radio className="w-4 h-4 text-slate-950 font-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                OmniTrans <span className="text-rose-400 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">Live Mic Voice Changer</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Target Language Dropdown in Header */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-rose-400" />
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-rose-400 transition-colors cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center gap-8">
        
        {/* Subtitle / Description */}
        <div className="text-center max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Real-Time Neural Speech-to-Speech Translation
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            Speak in Any Language, Dub in Real-Time
          </h2>
          <p className="text-sm text-slate-400">
            Click the microphone, speak into your device, and hear your voice automatically translated and dubbed in your chosen language with ~1–2s latency.
          </p>
        </div>

        {/* Center Mic Controller Card */}
        <div className="relative w-full max-w-md p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-6">
          
          {/* Animated Glow Halo */}
          <div 
            className={`absolute -inset-1 rounded-3xl blur-xl opacity-50 transition-all pointer-events-none ${
              isRecording 
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 animate-pulse' 
                : 'bg-slate-800/20'
            }`} 
          />

          {/* Big Mic Button */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleRecording}
              className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                isRecording
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/40 ring-8 ring-rose-500/20 animate-pulse'
                  : 'bg-gradient-to-tr from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-slate-950 font-black shadow-rose-500/20'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </motion.button>

            {isRecording && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
              </span>
            )}
          </div>

          {/* Status Label & VU Meter */}
          <div className="w-full flex flex-col items-center gap-2">
            <p className="font-extrabold text-sm tracking-wide text-slate-200">
              {isRecording 
                ? 'Listening... (Click to Finish & Translate)' 
                : isProcessing 
                ? 'Translating & Dubbing Voice...' 
                : 'Click Mic to Start Speaking'}
            </p>

            {/* Live VU Meter Bars */}
            {isRecording && (
              <div className="w-full flex items-center gap-1 justify-center h-8 px-8">
                {[...Array(12)].map((_, i) => {
                  const height = Math.max(4, Math.min(28, (micVolume * (i + 1) * 0.4) % 28));
                  return (
                    <motion.div
                      key={i}
                      animate={{ height }}
                      className="w-1.5 bg-rose-400 rounded-full"
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>Faster-Whisper + EdgeTTS dubbing in progress...</span>
            </div>
          )}
        </div>

        {/* Live Translations History Log */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-rose-400" />
              Live Conversation Feed
            </h3>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear feed
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800/60">
              <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-400">No live translations yet</p>
              <p className="text-slate-600 mt-1">Tap the mic button above and say something to see instant live dubbed speech.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">You said ({item.detectedLang.toUpperCase()}):</span>
                      <span className="text-[11px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-300 italic">"{item.originalText}"</p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                        Dubbed ({item.targetLang.toUpperCase()})
                      </span>
                      <p className="text-base font-bold text-white">{item.translatedText}</p>
                    </div>
                  </div>

                  {item.audioBase64 && (
                    <button
                      onClick={() => playAudioBase64(item.audioBase64)}
                      className="p-3 bg-gradient-to-tr from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-slate-950 font-black rounded-xl shadow-lg shadow-rose-500/20 transition-all hover:scale-105 shrink-0 flex items-center gap-2 text-xs"
                      title="Replay Dubbed Audio"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Replay Voice</span>
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* POPUP MODAL: Pops up immediately with selected language translation & audible voice */}
        <AnimatePresence>
          {activePopupResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setActivePopupResult(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-rose-500/20 relative overflow-hidden"
              >
                {/* Decorative background glow */}
                <div className="absolute -top-20 -right-20 w-44 h-44 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-slate-950 shadow-lg shadow-rose-500/20">
                      <Volume2 className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        Live Dubbing Voice
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                          {activePopupResult.targetLang}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">Translated and synthesized in real-time</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePopupResult(null)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* What you spoke */}
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-4">
                  <p className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-slate-400" />
                    What you said ({activePopupResult.detectedLang.toUpperCase()}):
                  </p>
                  <p className="text-sm text-slate-200 font-medium italic">
                    "{activePopupResult.originalText}"
                  </p>
                </div>

                {/* Translated Output (Highlighted) */}
                <div className="p-5 bg-gradient-to-br from-rose-950/40 to-slate-950/60 rounded-2xl border border-rose-500/40 mb-6 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      Translated Voice ({activePopupResult.targetLang.toUpperCase()}):
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Voice Active
                    </span>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-white leading-relaxed tracking-tight">
                    {activePopupResult.translatedText}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {activePopupResult.audioBase64 && (
                    <button
                      onClick={() => playAudioBase64(activePopupResult.audioBase64)}
                      className="flex-1 py-3.5 px-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Hear Voice Again</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActivePopupResult(null)}
                    className="py-3.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

export default LiveMicStudio;
