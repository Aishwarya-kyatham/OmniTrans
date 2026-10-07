import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import WatchDownloads from './pages/WatchDownloads';
import LiveMicStudio from './pages/LiveMicStudio';
import SubtitleEditor from './components/SubtitleEditor';

// Mock Authentication Guard
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public/Guest Route: if already logged in, redirect directly to /app
const PublicRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }
  
  return children;
};

const DirectEditorWrapper = () => {
  const { baseName } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-purple-900/20 to-slate-900 text-slate-50 py-8 px-4">
      <SubtitleEditor
        baseName={baseName}
        targetLanguage="es"
        onBack={() => navigate('/app')}
      />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />
        
        {/* Protected Application Route */}
        <Route 
          path="/app" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/editor/:baseName" 
          element={
            <ProtectedRoute>
              <DirectEditorWrapper />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/watch" 
          element={
            <ProtectedRoute>
              <WatchDownloads />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/live" 
          element={
            <ProtectedRoute>
              <LiveMicStudio />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
