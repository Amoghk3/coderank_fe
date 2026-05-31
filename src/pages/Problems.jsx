import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, SlidersHorizontal, BookOpen, CheckCircle, HelpCircle, ArrowRight } from 'lucide-react';

const Problems = () => {
  const { user } = useAuth();
  
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  
  // Track user solved problems list (for checkmarks)
  const [solvedList, setSolvedList] = useState(new Set());

  // Aggregate all unique tags from problems list
  const [allTags, setAllTags] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch matching problems
      const list = await api.problems.search(searchQuery, difficultyFilter, tagFilter);
      setProblems(list);

      // Fetch user submission history to discover solved ones
      if (user) {
        const history = await api.submissions.history();
        const solved = new Set(
          history
            .filter(sub => sub.status === 'ACCEPTED')
            .map(sub => sub.problem_id)
        );
        setSolvedList(solved);
      }
    } catch (err) {
      console.error('Failed to load problems catalogue:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters shift
  useEffect(() => {
    loadData();
  }, [searchQuery, difficultyFilter, tagFilter, user]);

  // Capture list of unique tags once on initial load
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        const list = await api.problems.list();
        const tags = new Set();
        list.forEach(p => {
          if (p.tags) p.tags.forEach(t => tags.add(t));
        });
        setAllTags(Array.from(tags));
      } catch (err) {
        console.error('Failed to parse tags:', err);
      }
    };
    fetchAllTags();
  }, []);

  return (
    <div className="problems-catalog-container">
      {/* Header Info */}
      <div className="catalog-header">
        <div className="catalog-title">
          <h2>Challenges</h2>
          <p>Sharpen your logic by hacking through our sandboxed coding tasks.</p>
        </div>
      </div>

      {/* Filters Banner */}
      <div className="glass-panel problems-filters-panel" style={{ padding: '20px' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-darker)' }} />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '44px', width: '100%', marginBottom: 0 }}
          />
        </div>

        {/* Difficulty Select */}
        <div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="input-field select-field"
            style={{ width: '100%', marginBottom: 0 }}
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Tag Select */}
        <div>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="input-field select-field"
            style={{ width: '100%', marginBottom: 0 }}
          >
            <option value="">All Categories</option>
            {allTags.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Problems Listing */}
      {loading ? (
        <div className="judge-loading-state" style={{ paddingBlock: '80px' }}>
          <div className="judge-loader-spinner"></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-darker)' }}>Compiling problems list...</span>
        </div>
      ) : problems.length === 0 ? (
        <div className="glass-panel empty-catalog-fallback">
          <BookOpen size={48} style={{ color: 'var(--text-darker)', marginBottom: '16px' }} />
          <h3>No Challenges Found</h3>
          <p style={{ color: 'var(--text-darker)', marginTop: '6px' }}>Try loosening your search filters or add a new challenge.</p>
        </div>
      ) : (
        <div className="problems-list-grid">
          {problems.map((problem) => {
            const isSolved = solvedList.has(problem.id) || solvedList.has(problem.slug);
            const difficultyLower = problem.difficulty.toLowerCase();
            
            return (
              <div key={problem.id} className="glass-panel problem-row-card">
                <div className="problem-meta-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isSolved ? (
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} title="Solved" />
                    ) : (
                      <HelpCircle size={18} style={{ color: 'var(--text-muted)' }} title="Unsolved" />
                    )}
                    <Link to={`/problems/${problem.id}`} className="problem-row-title">
                      {problem.title}
                    </Link>
                  </div>
                  
                  {/* Category Tags */}
                  <div className="problem-tags-row">
                    {problem.tags && problem.tags.map(tag => (
                      <span key={tag} className="tag-pill">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="problem-meta-right">
                  {/* Visual Difficulty Capsule */}
                  <span className={`badge badge-${difficultyLower}`}>
                    {difficultyLower}
                  </span>

                  <div className="acceptance-score-box">
                    <span className="acceptance-label">Resource limits</span>
                    <span className="acceptance-value">{problem.time_limit}s / {problem.memory_limit}MB</span>
                  </div>

                  <Link to={`/problems/${problem.id}`} className="btn btn-secondary btn-sm flex-center" style={{ paddingInline: '16px' }}>
                    <span>Solve</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Problems;
