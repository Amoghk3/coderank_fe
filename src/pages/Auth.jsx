import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';

const Auth = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setFormLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/problems');
      } else {
        const res = await register(email, username, password);
        setSuccessMsg(res.message || 'Registration successful! You can login now.');
        // Automatically switch to login after a brief delay
        setTimeout(() => {
          setIsLogin(true);
          setSuccessMsg(null);
          setPassword('');
        }, 1800);
      }
    } catch (err) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccessMsg(null);
    setEmail('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="auth-page-container">
      <div className="glass-panel auth-card">
        {/* Glowing visual effect top left */}
        <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>
            {isLogin ? "New to CodeRank? " : "Already have an account? "}
            <span className="auth-toggle-link" onClick={handleToggleMode}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>

        {/* Error Block */}
        {error && (
          <div className="auth-error-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Block */}
        {successMsg && (
          <div className="auth-error-alert" style={{ background: 'var(--success-glow)', borderColor: 'var(--success-border)', color: 'var(--success)' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-wrapper">
          {/* Username (Register only) */}
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-darker)' }} />
                <input
                  type="text"
                  required
                  placeholder="algorithm_ace"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '44px', width: '100%' }}
                  disabled={formLoading}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-darker)' }} />
              <input
                type="email"
                required
                placeholder="developer@coderank.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px', width: '100%' }}
                disabled={formLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group" style={{ marginBottom: '28px' }}>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-darker)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px', width: '100%' }}
                disabled={formLoading}
              />
            </div>
          </div>

          {/* Submit Action */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', gap: '10px' }}
            disabled={formLoading}
          >
            {formLoading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{isLogin ? 'Sign In to Workspace' : 'Initialize Account'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
