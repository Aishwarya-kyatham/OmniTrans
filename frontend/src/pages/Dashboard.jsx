import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Video, UploadCloud, CheckCircle2, AlertTriangle, RotateCcw, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageSelector from '../components/LanguageSelector';
import LivePipelineTracker from '../components/LivePipelineTracker';
import ExportModal from '../components/ExportModal';
import SubtitleEditor from '../components/SubtitleEditor';

const BACKEND = 'http://localhost:8000';

function Dashboard() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [status, setStatus] = useState('idle'); // idle | processing | complete | error
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [activeBaseName, setActiveBaseName] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file (MP4, MOV, WebM, AVI, MKV).');
      return;
    }
    setErrorMsg('');
    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileChange(dropped);
  };

  const startTranslation = async () => {
    if (!file) return;
    if (pollRef.current) clearTimeout(pollRef.current);

    const baseName = file.name.includes('.')
      ? file.name.substring(0, file.name.lastIndexOf('.'))
      : file.name;
    const expectedFileName = `${baseName}_fully_translated_${selectedLanguage}.mp4`;

    setActiveBaseName(baseName);
    setGeneratedFileName(expectedFileName);
    setStatus('processing');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_language', selectedLanguage);

    try {
      const res = await fetch(`${BACKEND}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }

      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`${BACKEND}/api/status/${expectedFileName}`);
          if (statusRes.ok) {
            const data = await statusRes.json();
            if (data.status === 'complete') {
              setStatus('complete');
              return;
            }
          }
        } catch (err) {
          console.warn('Poll error:', err);
        }
        pollRef.current = setTimeout(pollStatus, 1500);
      };

      pollRef.current = setTimeout(pollStatus, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to connect to the server. Make sure the backend is running on port 8000.');
    }
  };

  const handleReset = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setFile(null);
    setStatus('idle');
    setErrorMsg('');
    setGeneratedFileName('');
    setActiveBaseName('');
  };

  if (currentView === 'editor' && activeBaseName) {
    return (
      <div className="min-h-screen bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-purple-900/20 to-slate-900 text-slate-50 py-8 px-4">
        <SubtitleEditor
          baseName={activeBaseName}
          targetLanguage={selectedLanguage}
          onBack={() => setCurrentView('dashboard')}
        />
      </div>
    );
  }

  const isActive = status !== 'idle';
  const streamUrl = generatedFileName ? `${BACKEND}/api/stream/${generatedFileName}` : '';
  const downloadUrl = generatedFileName ? `${BACKEND}/api/download/${generatedFileName}` : '';

  return (
    <div className="min-h-screen bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-purple-900/20 to-slate-900 text-slate-50 flex flex-col items-center p-4 md:p-8">

      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 w-[60%] h-[30%] -translate-x-1/2 rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="w-full max-w-7xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <Video className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="font-black text-xl tracking-tight text-white">
            Omni<span className="text-emerald-400">Trans</span>
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-sm font-medium text-slate-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Page Title */}
      <header className="mb-10 text-center">
        <div className="inline-block mb-3 px-4 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs font-semibold tracking-wider text-emerald-400 uppercase">
          AI-Powered Video Translation &amp; Dubbing
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-400 text-transparent bg-clip-text mb-3">
          Video Translation Pipeline
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
          Whisper VAD transcription · Neural batch translation · EdgeTTS dubbing · Karaoke sync
        </p>
      </header>

      {/* Main Grid */}
      <div className={`w-full max-w-7xl transition-all duration-500 ${isActive ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-start' : 'flex flex-col items-center'}`}>

        {/* LEFT COLUMN */}
        <div className={`${isActive ? 'lg:col-span-7' : 'w-full max-w-2xl'} flex flex-col gap-6`}>

          {/* IDLE: Upload Card */}
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="upload-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900/70 p-6 sm:p-8 rounded-[2rem] shadow-2xl shadow-black/50 border border-slate-700/50 backdrop-blur-xl"
              >
                {!file ? (
                  <div
                    onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative p-12 w-full border-2 border-dashed rounded-[2rem] transition-all duration-300 cursor-pointer flex flex-col items-center justify-center
                      ${isDragging
                        ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_40px_rgba(52,211,153,0.2)]'
                        : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-400'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                    />
                    <div className={`flex justify-center p-5 rounded-full mb-6 shadow-2xl transition-colors ${isDragging ? 'bg-emerald-500/20' : 'bg-slate-900'}`}>
                      {isDragging
                        ? <Video className="w-12 h-12 text-emerald-400" />
                        : <UploadCloud className="w-12 h-12 text-blue-400" />
                      }
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-200 mb-2">
                      {isDragging ? 'Drop it here!' : 'Drag & drop your video'}
                    </h3>
                    <p className="text-base text-slate-400 text-center max-w-sm">
                      or click to browse files<br />
                      <span className="text-sm text-slate-500">MP4, MOV, WebM, AVI, MKV</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-5 bg-slate-900 border border-emerald-500/50 rounded-2xl mb-6">
                    <div className="flex items-center justify-between">
                      <div className="truncate pr-4">
                        <p className="text-xs text-slate-400 mb-1">Selected Video</p>
                        <p className="font-bold text-emerald-400 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={() => { setFile(null); setErrorMsg(''); }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 bg-rose-400/10 rounded-lg transition-colors flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-center gap-2 mt-4 mb-2 text-rose-400 bg-rose-400/10 p-3 rounded-xl text-sm font-medium border border-rose-400/20">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div className={`transition-all duration-300 mt-4 ${file ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <LanguageSelector selected={selectedLanguage} onSelect={setSelectedLanguage} />
                </div>

                {file && (
                  <motion.button
                    onClick={startTranslation}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-6 py-4 bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    🚀 Start AI Translation
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* PROCESSING STATE */}
            {status === 'processing' && (
              <motion.div
                key="processing-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative w-full rounded-[2rem] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-teal-500/20 to-emerald-500/20 animate-pulse rounded-[2rem]" />
                <div className="relative bg-slate-900/90 border border-slate-700/50 backdrop-blur-xl rounded-[2rem] p-8">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-400 animate-ping" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-1">AI Pipeline Running...</h4>
                      <p className="text-sm text-slate-400">Transcribing · Translating · Dubbing · Muxing</p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden border border-slate-700/50">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-full rounded-full"
                      initial={{ width: '3%' }}
                      animate={{ width: '95%' }}
                      transition={{ duration: 90, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      Processing: <span className="text-slate-200 font-semibold">{file?.name}</span>
                    </p>
                    <p className="text-sm text-slate-500 font-mono">Don't close this tab</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ERROR STATE */}
            {status === 'error' && (
              <motion.div
                key="error-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full p-8 bg-rose-500/10 border border-rose-500/40 rounded-[2rem] text-center"
              >
                <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-rose-300 mb-2">Processing Failed</h4>
                <p className="text-sm text-rose-400/80 mb-6 max-w-md mx-auto">{errorMsg}</p>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-semibold text-slate-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
              </motion.div>
            )}

            {/* COMPLETE STATE */}
            {status === 'complete' && (
              <motion.div
                key="complete-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                {/* Success Banner */}
                <div className="flex items-center gap-3 p-4 mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-300">Translation Complete! 🎉</p>
                    <p className="text-xs text-emerald-400/70">Your video has been dubbed and is ready to preview below.</p>
                  </div>
                </div>

                {/* Video Player */}
                <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-black shadow-2xl shadow-emerald-500/10 mb-6">
                  <video
                    key={streamUrl}
                    controls
                    className="w-full h-auto max-h-[420px]"
                    src={streamUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <a
                    href={downloadUrl}
                    download
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                  >
                    <Video className="w-5 h-5" />
                    Download MP4
                  </a>
                  <button
                    onClick={() => setCurrentView('editor')}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                  >
                    Open Subtitle Editor
                  </button>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl font-bold transition-all hover:scale-[1.02]"
                  >
                    <Sliders className="w-5 h-5 text-yellow-400" />
                    Custom Export
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Translate Another
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Live Pipeline Tracker */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              key="tracker"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-5 w-full sticky top-8"
            >
              <LivePipelineTracker
                baseName={activeBaseName}
                isProcessing={status === 'processing'}
                isComplete={status === 'complete'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        baseName={activeBaseName}
        targetLanguage={selectedLanguage}
      />
    </div>
  );
}

export default Dashboard;
