import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Share2, 
  Clock, 
  Globe, 
  CheckCircle2, 
  Sparkles,
  Sliders,
  Trash2,
  Film
} from 'lucide-react';
import { motion } from 'framer-motion';

const BACKEND = 'http://localhost:8000';

const LANGUAGE_LABELS = {
  en: 'English',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  hi: 'Hindi (हिंदी)',
  ja: 'Japanese (日本語)',
  zh: 'Chinese (简体中文)',
  ar: 'Arabic (العربية)',
  ko: 'Korean (한국어)',
  ru: 'Russian (Русский)',
  pt: 'Portuguese (Português)',
  it: 'Italian (Italiano)'
};

function WatchDownloads() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [downloads, setDownloads] = useState(() => {
    try {
      const saved = localStorage.getItem('omnitrans_downloads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const selectedFileName = searchParams.get('v');
  const activeVideo = downloads.find((d) => d.fileName === selectedFileName) || downloads[0] || null;

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [copied, setCopied] = useState(false);

  // Sync active item in URL query parameter
  useEffect(() => {
    if (activeVideo && activeVideo.fileName !== selectedFileName) {
      setSearchParams({ v: activeVideo.fileName });
    }
  }, [activeVideo, selectedFileName, setSearchParams]);

  // Video event listeners
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteItem = (fileName, e) => {
    e.stopPropagation();
    const updated = downloads.filter((d) => d.fileName !== fileName);
    setDownloads(updated);
    try {
      localStorage.setItem('omnitrans_downloads', JSON.stringify(updated));
    } catch (err) {
      console.warn('Error saving downloads:', err);
    }
    if (activeVideo?.fileName === fileName) {
      const next = updated[0];
      if (next) {
        setSearchParams({ v: next.fileName });
      } else {
        setSearchParams({});
      }
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Top YouTube-Style Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-all hover:scale-105"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl shadow-lg shadow-emerald-500/20">
              <Film className="w-4 h-4 text-slate-950 font-black" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                OmniTrans <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">Cinema Player</span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeVideo && (
            <a
              href={`${BACKEND}/api/download/${activeVideo.fileName}`}
              download
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span>Download MP4</span>
            </a>
          )}
        </div>
      </header>

      {/* Main YouTube Theater Layout */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT / CENTER: Theater Video Player & Details (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {activeVideo ? (
            <>
              {/* Cinema Player Container */}
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl shadow-emerald-500/5 group">
                <video
                  ref={videoRef}
                  key={activeVideo.fileName}
                  src={`${BACKEND}/api/stream/${activeVideo.fileName}`}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  className="w-full h-full object-contain cursor-pointer"
                  autoPlay
                  playsInline
                />

                {/* Big Center Play Overlay Button */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-20 h-20 bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-110"
                    title="Play"
                  >
                    <Play className="w-8 h-8 ml-1 fill-current" />
                  </button>
                )}

                {/* Video Controls Bar Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                  {/* Scrubber Progress Bar */}
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:h-2.5 transition-all"
                  />

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-3">
                      <button onClick={togglePlay} className="p-1 hover:text-white transition-colors">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                      </button>

                      <div className="flex items-center gap-1.5 group/vol">
                        <button onClick={toggleMute} className="p-1 hover:text-white transition-colors">
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                      </div>

                      <span className="font-mono text-[11px] text-slate-400 ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleShare}
                        className="p-1.5 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        title="Copy Video Link"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleFullscreen}
                        className="p-1.5 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        title="Fullscreen"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Title & Metadata */}
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                      {activeVideo.title || activeVideo.fileName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold uppercase">
                        <Globe className="w-3 h-3" />
                        {LANGUAGE_LABELS[activeVideo.language] || activeVideo.language.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {activeVideo.timestamp}
                      </span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized AI Dubbing
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all hover:scale-105"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {copied ? 'Copied Link!' : 'Share'}
                    </button>
                    <a
                      href={`${BACKEND}/api/download/${activeVideo.fileName}`}
                      download
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>

                {/* Subtitle & Dubbing Tech Badge details */}
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs space-y-1.5 text-slate-400">
                  <p className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    AI Neural Pipeline Specification:
                  </p>
                  <p>
                    Transcribed via Whisper &amp; Silero VAD • Translated to{' '}
                    <strong className="text-emerald-300">
                      {LANGUAGE_LABELS[activeVideo.language] || activeVideo.language.toUpperCase()}
                    </strong>{' '}
                    • Microsoft Edge Neural TTS dubbed with pitch-preserved audio synchronization.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="p-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 flex flex-col items-center justify-center">
              <Film className="w-16 h-16 text-slate-600 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white mb-2">No Downloaded Video Selected</h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                You haven't translated any videos yet, or your previous downloads were cleared.
              </p>
              <button
                onClick={() => navigate('/app')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                Go to Dashboard &amp; Translate a Video
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: YouTube-Style Playlist / Downloaded Videos Sidebar (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400" />
                  Your Downloaded Videos
                </h3>
                <p className="text-xs text-slate-400">{downloads.length} dubbed video(s) available</p>
              </div>
            </div>

            {downloads.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <p>No downloads available yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {downloads.map((video, idx) => {
                  const isCurrent = activeVideo?.fileName === video.fileName;
                  return (
                    <motion.div
                      key={video.fileName}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSearchParams({ v: video.fileName })}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex gap-3 relative group ${
                        isCurrent
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                          : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Video Thumbnail / Icon */}
                      <div className="w-28 h-18 bg-black rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-800">
                        <video
                          src={`${BACKEND}/api/stream/${video.fileName}`}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                          <Play className={`w-5 h-5 ${isCurrent ? 'text-emerald-400 fill-emerald-400' : 'text-white/80'}`} />
                        </div>
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[9px] font-mono text-slate-200">
                          MP4
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <p className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {video.title || video.fileName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {video.language}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">{video.timestamp}</span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-end gap-1.5 mt-2">
                          <a
                            href={`${BACKEND}/api/download/${video.fileName}`}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-slate-700/60 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 rounded-lg transition-colors"
                            title="Download MP4"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={(e) => handleDeleteItem(video.fileName, e)}
                            className="p-1.5 bg-slate-700/60 hover:bg-rose-500 hover:text-white text-slate-400 rounded-lg transition-colors"
                            title="Remove from Downloads"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default WatchDownloads;
