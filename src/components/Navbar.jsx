import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Terminal, User, LogOut, ShieldAlert, Wifi, WifiOff, Menu, X, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isDemo, toggleForceDemo } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <div className="logo-icon-wrapper">
            <Terminal className="logo-icon" size={20} />
          </div>
          <span className="logo-text">Code<span className="logo-text-accent">Rank</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="nav-links-desktop">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/problems" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Problems
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Leaderboard
          </NavLink>
          {user && (
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Profile
            </NavLink>
          )}
          {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} nav-link-admin`}>
              <ShieldAlert size={14} /> Admin
            </NavLink>
          )}
        </nav>

        {/* Right Actions */}
        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Connection Status Badge */}
          <button 
            className={`status-badge ${isDemo ? 'demo' : 'live'}`}
            title={isDemo ? "Running in Offline Demo Mode. Click to try reconnecting." : "Connected to Backend API"}
            onClick={() => toggleForceDemo(!isDemo)}
          >
            {isDemo ? (
              <>
                <WifiOff size={14} />
                <span>Demo</span>
              </>
            ) : (
              <>
                <Wifi size={14} className="wifi-pulse" />
                <span>Live</span>
              </>
            )}
          </button>

          {/* User Section */}
          <div className="auth-section-desktop">
            {user ? (
              <div className="user-profile-widget">
                <Link to="/profile" className="user-info">
                  <div className="avatar">
                    <User size={14} />
                  </div>
                  <span className="username">{user.username}</span>
                </Link>
                <button onClick={handleLogout} className="logout-btn" title="Sign Out">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="btn btn-primary btn-sm login-navbar-btn">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer glass-panel">
          <nav className="mobile-nav-links">
            <NavLink 
              to="/" end
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </NavLink>
            <NavLink 
              to="/problems" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Problems
            </NavLink>
            <NavLink 
              to="/leaderboard" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Leaderboard
            </NavLink>
            {user && (
              <NavLink 
                to="/profile" 
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </NavLink>
            )}
            {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
              <NavLink 
                to="/admin" 
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''} nav-link-admin`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Panel
              </NavLink>
            )}

            <div className="mobile-auth-divider"></div>

            {/* Theme toggle in mobile menu */}
            <button 
              onClick={toggleTheme}
              className="mobile-nav-link"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', width: '100%' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            </button>

            <div className="mobile-auth-divider"></div>

            {user ? (
              <div className="mobile-user-details">
                <span className="mobile-user-welcome">Signed in as <strong>{user.username}</strong></span>
                <button onClick={handleLogout} className="btn btn-danger btn-sm mobile-logout-btn">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            ) : (
              <Link 
                to="/auth" 
                className="btn btn-primary mobile-login-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
