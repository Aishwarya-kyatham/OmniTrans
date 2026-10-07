import React, { useState } from 'react';
import { 
  Link2, 
  Youtube, 
  Globe, 
  Sparkles, 
  Clock, 
  User, 
  ExternalLink, 
  AlertCircle, 
  Loader2, 
  RotateCcw, 
  X, 
  DownloadCloud, 
  Film,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND = 'http://localhost:8000';

const POPULAR_EXAMPLES = [
  {
    label: 'Big Buck Bunny (Blender 4K)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    platform: 'YouTube'
  },
  {
    label: 'Elephants Dream (Sci-Fi Animation)',
    url: 'https://www.youtube.com/watch?v=TLkA0RELQ1g',
    platform: 'YouTube'
  }
];

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const UrlImporter = ({ onImportStart, selectedLanguage, isSubmitting }) => {
  const [url, setUrl] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleInspect = async (targetUrl = url) => {
    const cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl) {
      setError('Please enter a valid YouTube, Twitter/X, TikTok, or video URL.');
      return;
    }

    try {
      setInspecting(true);
      setError('');
      setVideoInfo(null);

      const res = await fetch(`${BACKEND}/api/inspect-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to inspect video URL. Ensure the video is public.');
      }

      setVideoInfo(data.info);
    } catch (err) {
      console.error('Inspect URL error:', err);
      setError(err.message || 'Could not fetch video info from the provided URL.');
    } finally {
      setInspecting(false);
    }
  };

  const handleStartImport = async () => {
    const cleanUrl = (videoInfo?.url || url || '').trim();
    if (!cleanUrl) {
      setError('Please enter a video URL first.');
      return;
    }

    try {
      setDownloading(true);
      setError('');

      const res = await fetch(`${BACKEND}/api/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          target_language: selectedLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Download failed. Please check the URL or try another link.');
      }

      // Notify parent dashboard to transition into live processing pipeline
      if (onImportStart) {
        onImportStart(data);
      }
    } catch (err) {
      console.error('URL import error:', err);
      setError(err.message || 'Failed to import video. Backend yt-dlp error.');
      setDownloading(false);
    }
  };

  const handleSelectExample = (exampleUrl) => {
    setUrl(exampleUrl);
    handleInspect(exampleUrl);
  };

  const handleClear = () => {
    setUrl('');
    setVideoInfo(null);
    setError('');
    setDownloading(false);
  };

  const isBusy = inspecting || downloading || isSubmitting;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Platforms header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Supported Platforms:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Youtube className="w-3 h-3" /> YouTube
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            TikTok
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-700/60 border border-slate-600 text-slate-300">
            Twitter / X
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            Bilibili
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
            Vimeo / Web MP4
          </span>
        </div>
      </div>

      {/* URL Input Box */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-400">
            <Link2 className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isBusy) {
                e.preventDefault();
                handleInspect();
              }
            }}
            disabled={isBusy}
            placeholder="Paste YouTube, TikTok, Twitter/X, or direct video link..."
            className="w-full pl-12 pr-28 py-4 bg-slate-950/80 border border-slate-700 hover:border-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-slate-100 placeholder-slate-500 text-sm transition-all outline-none"
          />
          <div className="absolute right-2.5 flex items-center gap-1">
            {url && !isBusy && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleInspect()}
              disabled={!url.trim() || isBusy}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {inspecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Inspect</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Example Links */}
      {!videoInfo && !inspecting && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Try quick sample:</span>
          {POPULAR_EXAMPLES.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectExample(ex.url)}
              className="text-xs text-slate-400 hover:text-emerald-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
            >
              <Youtube className="w-3 h-3 text-rose-400" />
              <span>{ex.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Inspecting Spinner Skeleton */}
      {inspecting && (
        <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 animate-pulse">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-slate-300">
            Querying video metadata via <span className="text-emerald-400 font-bold">yt-dlp</span>...
          </p>
          <span className="text-xs text-slate-500">Extracting stream formats, duration, and thumbnail</span>
        </div>
      )}

      {/* Video Preview Card */}
      <AnimatePresence>
        {videoInfo && !inspecting && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 bg-slate-950/80 border border-emerald-500/40 rounded-2xl shadow-xl shadow-black/40 flex flex-col sm:flex-row gap-5 items-start"
          >
            {/* Thumbnail */}
            <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 group">
              {videoInfo.thumbnail ? (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <Film className="w-10 h-10 text-slate-600" />
                </div>
              )}
              {videoInfo.duration > 0 && (
                <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[11px] font-mono font-bold text-white flex items-center gap-1 border border-white/10">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  {formatDuration(videoInfo.duration)}
                </div>
              )}
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                {videoInfo.extractor || 'Web'}
              </div>
            </div>

            {/* Video Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between w-full h-full">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-base text-slate-100 line-clamp-2 leading-snug">
                    {videoInfo.title}
                  </h4>
                  <button
                    onClick={handleClear}
                    className="text-xs text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded transition-colors"
                    title="Change video"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{videoInfo.uploader || 'Creator'}</span>
                  {videoInfo.url && (
                    <a
                      href={videoInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Source</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to download &amp; dub
                </span>
                <span className="text-slate-500">Auto-mux into 1080p MP4</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Downloading Banner */}
      {downloading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center gap-4"
        >
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
            <DownloadCloud className="w-6 h-6 animate-bounce" />
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-sm text-blue-200">
              Downloading Web Video Stream via yt-dlp...
            </h5>
            <p className="text-xs text-blue-300/80 mt-0.5">
              Merging optimal video &amp; audio streams into <code className="bg-slate-900/60 px-1 py-0.5 rounded text-blue-300">temp_uploads/</code> and launching pipeline.
            </p>
          </div>
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </motion.div>
      )}

      {/* Action Button: Download & Start Pipeline */}
      {videoInfo && !downloading && (
        <motion.button
          onClick={handleStartImport}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-2 py-4 bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          <span>🚀 Download &amp; Start AI Translation</span>
        </motion.button>
      )}
    </div>
  );
};

export default UrlImporter;
