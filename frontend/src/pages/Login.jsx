import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call for authentication
    setTimeout(() => {
      // For this demo, we bypass real backend auth and just set local storage
      localStorage.setItem('isAuthenticated', 'true');
      setIsLoading(false);
      navigate('/app');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        
        {/* Logo Header */}
        <div className="flex flex-col items-center justify-center mb-10">
          <Link to="/" className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 hover:scale-110 transition-transform">
            <Video className="w-7 h-7 text-white" />
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-slate-400 font-medium">Log in to OmniTrans AI</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-slate-900/60 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-xl shadow-2xl">
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <a href="#" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

        </form>

        <p className="text-center text-slate-400 mt-8 font-medium">
          Don't have an account?{' '}
          <Link to="/signup" className="text-white hover:text-blue-400 transition-colors underline decoration-slate-600 underline-offset-4 font-semibold">
            Create an account
          </Link>
        </p>

      </motion.div>
    </div>
  );
};

export default Login;
