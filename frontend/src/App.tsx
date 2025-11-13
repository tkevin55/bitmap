import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import { Crown, LogOut, User } from 'lucide-react';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-primary-600">
            Bitmap Pixelator
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/editor" className="text-gray-700 hover:text-primary-600 font-medium">
              Editor
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-primary-600 font-medium">
              Pricing
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">{user.email}</span>
                  {user.isPro && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-semibold">
                      <Crown className="w-3 h-3" />
                      PRO
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pricing" element={<Pricing />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
