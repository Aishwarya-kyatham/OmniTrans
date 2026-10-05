import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Video, Sliders } from 'lucide-react';

const ProcessingStatus = ({ status, errorMessage, fileName, onOpenEditor, onOpenExportModal, onReset }) => {
  if (status === 'idle') return null;

  if (status === 'error') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mt-6 p-6 bg-rose-500/10 border border-rose-500/50 rounded-xl"
      >
        <h4 className="text-rose-400 font-bold flex items-center gap-2 mb-2">
          <span>Error Processing Video</span>
        </h4>
        <p className="text-sm text-rose-300">{errorMessage || 'An unknown error occurred during AI processing.'}</p>
      </motion.div>
    );
  }

  if (status === 'complete') {
      const downloadUrl = fileName ? `http://localhost:8000/api/download/${fileName}` : '#';
      const streamUrl = fileName ? `http://localhost:8000/api/stream/${fileName}` : '#';

      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full mt-6 p-8 bg-slate-900 border border-slate-700/50 shadow-2xl rounded-[2rem] text-center"
        >
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-black tracking-tight text-white mb-2">Translation Complete!</h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Your video has been analyzed, translated, and automatically dubbed. Watch your preview below.
          </p>
          
          <div className="w-full max-w-xl mx-auto rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-slate-700/50 bg-black mb-8">
            <video 
              controls 
              className="w-full h-auto"
              src={streamUrl}
              type="video/mp4"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {onOpenEditor && (
              <button 
                onClick={onOpenEditor}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Open Subtitle Editor
              </button>
            )}

            {onOpenExportModal && (
              <button 
                onClick={onOpenExportModal}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sliders className="w-5 h-5 text-yellow-400" />
                Custom Export & Lip-Sync
              </button>
            )}

            {onReset && (
              <button 
                onClick={onReset}
                className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 px-6 py-3.5 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Translate Another Video
              </button>
            )}
            
            <a href={downloadUrl} download className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
              <Video className="w-5 h-5" />
              Download MP4
            </a>
          </div>
        </motion.div>
      );
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full mt-6 p-[2px] rounded-2xl bg-gradient-to-r from-blue-500/50 via-emerald-500/50 to-blue-500/50 bg-[length:200%_auto] animate-pulse"
    >
      <div className="bg-slate-900 rounded-[14px] p-6 lg:p-8 h-full w-full">
        <div className="flex items-center gap-5 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-100 mb-1">AI Pipeline Engaged</h4>
            <p className="text-sm text-slate-400">Ripping audio, running Whisper & EasyOCR, generating TTS...</p>
          </div>
        </div>
        
        <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden border border-slate-700/50 shadow-inner">
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full relative overflow-hidden"
            initial={{ width: "2%" }}
            animate={{ width: "98%" }}
            transition={{ duration: 60, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
          </motion.div>
        </div>
        
        <p className="text-sm font-medium text-slate-500 text-center mt-6">
          Depending on your hardware, this might take a few minutes. Don't close this tab!
        </p>
      </div>
    </motion.div>
  );
};

export default ProcessingStatus;
