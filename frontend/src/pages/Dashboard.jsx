import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Video } from 'lucide-react';
import UploadDropzone from '../components/UploadDropzone';
import LanguageSelector from '../components/LanguageSelector';
import ProcessingStatus from '../components/ProcessingStatus';

function Dashboard() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, complete, error
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedFileName, setGeneratedFileName] = useState('');

  const handleVideoSelect = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleSignOut = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  const startTranslation = async () => {
    if (!file) return;

    setStatus('processing');
    setErrorMsg('');
    
    // Calculate what the backend will name the final file
    const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
    const expectedFileName = `${baseName}_fully_translated_${selectedLanguage}.mp4`;
    setGeneratedFileName(expectedFileName);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_language', selectedLanguage);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload video to the processing server.');
      }

      const data = await response.json();
      console.log('Server response:', data);
      
      // Actively poll the backend to wait until processing is fully complete
      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`http://localhost:8000/api/status/${expectedFileName}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'complete') {
              setStatus('complete');
              return; // Processing finished! End polling loop.
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
        
        // Loop again in 5 seconds if not complete
        setTimeout(pollStatus, 5000);
      };

      // Kick off the polling loop
      setTimeout(pollStatus, 3000);

    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-purple-900/20 to-slate-900 text-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* Background ambient light */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]"></div>
      </div>

      {/* Embedded Dashboard Header */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2 opacity-50">
          <Video className="w-5 h-5 text-emerald-400" />
          <span className="font-bold tracking-tight text-white">OmniTrans</span>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-sm font-medium text-slate-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      <div className="w-full max-w-3xl flex flex-col items-center justify-center relative z-10 my-auto mt-24">
        <header className="mb-10 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            AI Video Pipeline 2.0
          </div>
          <h1 className="text-6xl font-black tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-500 text-transparent bg-clip-text mb-6">
            Omni<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Trans</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed mx-auto">
            Extract, Translate, and <strong className="text-slate-200 font-medium pb-0.5 border-b border-dashed border-slate-500">Dub</strong> any video automatically. 
            <br/>Powered by open-source, local-first AI.
          </p>
        </header>

        <main className="w-full flex flex-col items-center gap-6">
          
          {status === 'idle' && (
            <div className="bg-slate-900/60 p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-black/50 border border-slate-700/50 backdrop-blur-xl w-full max-w-2xl">
              
              {/* 1. Upload Section */}
              {!file ? (
                <UploadDropzone onVideoSelect={handleVideoSelect} />
              ) : (
                <div className="p-6 bg-slate-900 border border-emerald-500/50 rounded-xl mb-6">
                  <div className="flex items-center justify-between">
                    <div className="truncate pr-4">
                      <p className="text-sm text-slate-400 mb-1">Selected Video:</p>
                      <p className="font-medium text-emerald-400 truncate">{file.name}</p>
                    </div>
                    <button 
                      onClick={() => setFile(null)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-1 bg-rose-400/10 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Target Language Selection */}
              <div className={`transition-all duration-300 ${file ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <LanguageSelector 
                  selected={selectedLanguage} 
                  onSelect={setSelectedLanguage} 
                />
              </div>

              {/* 3. Action Button */}
              {file && (
                <button
                  onClick={startTranslation}
                  className="w-full mt-8 py-4 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  Translate Video
                </button>
              )}
            </div>
          )}

          {/* Status Component shows loader or result */}
          <div className="w-full max-w-2xl">
            <ProcessingStatus status={status} errorMessage={errorMsg} fileName={generatedFileName} />
          </div>

        </main>
      </div>
    </div>
  );
}

export default Dashboard;
