import React, { useCallback, useState } from 'react';
import { UploadCloud, Video, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const UploadDropzone = ({ onVideoSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const validateFile = (file) => {
    if (!file) return false;
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file (MP4, WebM, etc).');
      return false;
    }
    setError('');
    return true;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && validateFile(files[0])) {
      onVideoSelect(files[0]);
    }
  }, [onVideoSelect]);

  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files[0] && validateFile(files[0])) {
      onVideoSelect(files[0]);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative p-12 w-full border-2 border-dashed rounded-[2rem] transition-all duration-300 cursor-pointer flex flex-col items-center justify-center overflow-hidden
          ${isDragging 
            ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_40px_rgba(52,211,153,0.2)]' 
            : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-400 backdrop-blur-sm shadow-xl'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept="video/*" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
          onChange={handleChange}
        />
        
        <motion.div 
          animate={{ y: isDragging ? -10 : 0 }}
          className={`flex justify-center p-5 rounded-full mb-6 shadow-2xl transition-colors duration-300 ${
            isDragging ? 'bg-emerald-500/20 shadow-emerald-500/30' : 'bg-slate-900 shadow-black/50'
          }`}
        >
          {isDragging ? (
            <Video className="w-12 h-12 text-emerald-400" />
          ) : (
            <UploadCloud className="w-12 h-12 text-blue-400" />
          )}
        </motion.div>
        
        <h3 className="text-2xl font-extrabold text-slate-200 mb-2 tracking-tight">
          {isDragging ? 'Drop it like it\'s hot!' : 'Drag & drop a video'}
        </h3>
        <p className="text-base text-slate-400 text-center max-w-sm font-medium">
          or click anywhere to browse.<br/>
          <span className="text-sm text-slate-500 font-normal mt-2 block">MP4, WebM, MOV (Max 500MB)</span>
        </p>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex items-center gap-2 mt-4 text-rose-400 bg-rose-400/10 p-3 rounded-lg text-sm font-medium"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default UploadDropzone;
