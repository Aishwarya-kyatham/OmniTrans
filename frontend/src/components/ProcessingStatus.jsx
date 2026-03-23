import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Video } from 'lucide-react';

const ProcessingStatus = ({ status, errorMessage, fileName }) => {
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
      const downloadUrl = fileName ? `http://127.0.0.1:8000/api/download/${fileName}` : '#';
      const streamUrl = fileName ? `http://127.0.0.1:8000/api/stream/${fileName}` : '#';

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

          <a href={downloadUrl} download className="flex items-center justify-center gap-2 mx-auto bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] w-fit">
            <Video className="w-6 h-6" />
            Download Final MP4
          </a>
        </motion.div>
      );
  }
  
  // Processing state
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
        
        {/* Fake progress bar since backend doesn't stream status yet */}
        <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden border border-slate-700/50 shadow-inner">
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full relative overflow-hidden"
            initial={{ width: "2%" }}
            animate={{ width: "98%" }}
            transition={{ duration: 60, ease: "easeOut" }} // Fake estimated time
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
