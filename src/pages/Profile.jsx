import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, Award, Calendar, Layers, CheckCircle2, ChevronRight, Play } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    solvedCount: 0,
    totalProblems: 0,
    easySolved: 0,
    easyTotal: 0,
    mediumSolved: 0,
    mediumTotal: 0,
    hardSolved: 0,
    hardTotal: 0,
    totalPoints: 0
  });

  const [submissions, setSubmissions] = useState([]);

  const loadProfileStats = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch full problems list
      const problems = await api.problems.list();
      // Fetch user submissions history
      const subHistory = await api.submissions.history();
      setSubmissions(subHistory);

      // Find unique successfully solved problems
      const solvedProblemsIds = new Set(
        subHistory
          .filter(s => s.status === 'ACCEPTED')
          .map(s => s.problem_id)
      );

      // Map unique solved ids to problem entities to discover difficulty
      let easyS = 0, medS = 0, hardS = 0;
      let easyT = 0, medT = 0, hardT = 0;

      problems.forEach(p => {
        const isSolved = solvedProblemsIds.has(p.id) || solvedProblemsIds.has(p.slug);
        
        if (p.difficulty === 'EASY') {
          easyT++;
          if (isSolved) easyS++;
        } else if (p.difficulty === 'MEDIUM') {
          medT++;
          if (isSolved) medS++;
        } else if (p.difficulty === 'HARD') {
          hardT++;
          if (isSolved) hardS++;
        }
      });

      // Retrieve user's actual score
      let score = 0;
      const demo = await api.isDemoMode();
      if (demo) {
        const users = JSON.parse(localStorage.getItem('coderank_users')) || [];
        const u = users.find(x => x.id === user.id || x.username === user.username);
        if (u) score = u.total_score || 0;
      } else {
        // Live mode: get score from leaderboard
        try {
          const leaderboard = await api.leaderboard.list();
          const myEntry = leaderboard.find(l => l.username === user.username || l.user_id === user.id);
          if (myEntry) {
            score = myEntry.total_score || 0;
          }
        } catch (e) {
          score = solvedProblemsIds.size * 100; // fallback
        }
      }

      setStats({
        solvedCount: solvedProblemsIds.size,
        totalProblems: problems.length,
        easySolved: easyS,
        easyTotal: easyT,
        mediumSolved: medS,
        mediumTotal: medT,
        hardSolved: hardS,
        hardTotal: hardT,
        totalPoints: score
      });
    } catch (err) {
      console.error('Failed to aggregate user stats dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileStats();
  }, [user]);

  if (!user) {
    return (
      <div className="glass-panel empty-catalog-fallback" style={{ marginBlock: '80px' }}>
        <User size={48} style={{ color: 'var(--text-darker)', marginBottom: '16px' }} />
        <h3>Access Denied</h3>
        <p style={{ color: 'var(--text-darker)' }}>You must be authenticated to check user workspace stats.</p>
        <a href="/auth" className="btn btn-primary" style={{ marginTop: '16px' }}>Sign In</a>
      </div>
    );
  }

  // Calculate SVG circular gauge variables
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const solvedRatio = stats.totalProblems > 0 ? stats.solvedCount / stats.totalProblems : 0;
  const strokeDashoffset = circumference - solvedRatio * circumference;

  return (
    <div className="profile-dashboard-layout">
      {/* Sidebar profile overview */}
      <div className="glass-panel profile-sidebar">
        <div className="profile-avatar-large flex-center">
          <User size={36} />
        </div>
        
        <h3 className="profile-username-header">{user.username}</h3>
        <span className="profile-role-badge">{user.role}</span>
        
        <div className="profile-score-summary">
          <div className="profile-score-metric">
            <span className="metric-lbl">Total Score</span>
            <span className="metric-val">{stats.totalPoints}</span>
          </div>
          <div className="profile-score-metric">
            <span className="metric-lbl">Solves Rate</span>
            <span className="metric-val">{stats.solvedCount}</span>
          </div>
        </div>
        
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-darker)', justifyContent: 'center' }}>
          <Calendar size={14} />
          <span>Session active: API workspace</span>
        </div>
      </div>

      {/* Main dashboard stats visualizer & lists */}
      {loading ? (
        <div className="judge-loading-state" style={{ paddingBlock: '60px' }}>
          <div className="judge-loader-spinner"></div>
          <span>Loading performance visualizer...</span>
        </div>
      ) : (
        <div className="profile-performance-panel">
          {/* Circular donut chart and legends */}
          <div className="chart-cards-grid">
            {/* SVG Circular Progress Card */}
            <div className="glass-panel chart-card-wrapper flex-center" style={{ flexDirection: 'column' }}>
              <span className="chart-title-lbl" style={{ alignSelf: 'flex-start', margin: 0 }}>Category Ratio</span>
              
              <div className="circular-gauge-container" style={{ width: '100%' }}>
                {/* SVG Progress Circle */}
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                  <svg className="svg-circular-gauge" width="120" height="120">
                    <circle
                      className="gauge-bg-circle"
                      cx="60"
                      cy="60"
                      r={radius}
                      strokeWidth="8"
                    />
                    <circle
                      className="gauge-indicator-circle"
                      cx="60"
                      cy="60"
                      r={radius}
                      strokeWidth="8"
                      stroke="var(--primary)"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Center Text inside ring */}
                  <div className="gauge-center-text" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
                    <span className="gauge-center-val">{stats.solvedCount}</span>
                    <span className="gauge-center-lbl">/ {stats.totalProblems} Solved</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="difficulty-legend-list">
                  <div className="legend-item-row">
                    <span>
                      <span className="legend-color-dot easy"></span>
                      <span>Easy</span>
                    </span>
                    <span className="legend-value-count">{stats.easySolved} / {stats.easyTotal}</span>
                  </div>
                  <div className="legend-item-row">
                    <span>
                      <span className="legend-color-dot medium"></span>
                      <span>Medium</span>
                    </span>
                    <span className="legend-value-count">{stats.mediumSolved} / {stats.mediumTotal}</span>
                  </div>
                  <div className="legend-item-row">
                    <span>
                      <span className="legend-color-dot hard"></span>
                      <span>Hard</span>
                    </span>
                    <span className="legend-value-count">{stats.hardSolved} / {stats.hardTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Accents Stats */}
            <div className="glass-panel chart-card-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Layers size={22} style={{ color: 'var(--accent-purple)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem' }}>Acceptance Level</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-darker)' }}>
                    {stats.solvedCount > 0 ? ((stats.solvedCount / stats.totalProblems) * 100).toFixed(0) : 0}% problem space conquered
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Award size={22} style={{ color: 'var(--success)' }} />
                <div>
                  <h4 style={{ fontSize: '1rem' }}>Rank Standing</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-darker)' }}>
                    Active climber on CodeRank servers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submissions Log list */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={18} style={{ color: 'var(--primary)' }} />
              <span>Recent Activity Logs</span>
            </h3>

            {submissions.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-darker)', padding: '20px', textAlign: 'center' }}>No submission records registered yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {submissions.slice(0, 5).map((sub) => (
                  <div key={sub.id} className="submission-history-row" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glow)' }}>
                    <div className="sub-row-meta">
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)' }}>Problem ID: {sub.problem_id}</span>
                      <div className="sub-row-stats">
                        <span style={{ textTransform: 'capitalize' }}>{sub.language_id}</span>
                        {sub.runtime_ms && <span>{sub.runtime_ms} ms</span>}
                        {sub.created_at && <span>{new Date(sub.created_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <span className={`badge badge-${sub.status.toLowerCase()}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
