import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, PlusCircle, Globe, CheckCircle, AlertTriangle, Database, Trash2 } from 'lucide-react';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('problem'); // problem | languages | testcases
  
  // Create Problem Form State
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('EASY');
  const [tags, setTags] = useState('');
  const [statement, setStatement] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [timeLimit, setTimeLimit] = useState(2);
  const [memoryLimit, setMemoryLimit] = useState(256);

  const [languages, setLanguages] = useState([]);

  // Prompts
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Test Case Management State
  const [problems, setProblems] = useState([]);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [testCases, setTestCases] = useState([]);
  const [tcInputData, setTcInputData] = useState('');
  const [tcExpectedOutput, setTcExpectedOutput] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);
  const [tcPoints, setTcPoints] = useState(1);
  const [tcLoading, setTcLoading] = useState(false);

  const fetchLanguages = async () => {
    try {
      const list = await api.languages.list();
      setLanguages(list);
    } catch (err) {
      console.error('Failed to load languages list:', err);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'MODERATOR')) {
      fetchLanguages();
      fetchProblems();
    }
  }, [user]);

  const fetchProblems = async () => {
    try {
      const list = await api.problems.list();
      setProblems(list);
    } catch (err) {
      console.error('Failed to load problems:', err);
    }
  };

  const fetchTestCases = async (problemId) => {
    if (!problemId) return;
    setTcLoading(true);
    try {
      const list = await api.testCases.list(problemId);
      setTestCases(list);
    } catch (err) {
      console.error('Failed to load test cases:', err);
      setTestCases([]);
    } finally {
      setTcLoading(false);
    }
  };

  const handleSelectProblem = (id) => {
    setSelectedProblemId(id);
    if (id) fetchTestCases(id);
    else setTestCases([]);
  };

  const handleCreateTestCase = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.testCases.create(selectedProblemId, {
        input_data: tcInputData,
        expected_output: tcExpectedOutput,
        is_hidden: tcIsHidden,
        points: parseInt(tcPoints)
      });
      setSuccess('Test case created successfully!');
      setTcInputData('');
      setTcExpectedOutput('');
      setTcIsHidden(false);
      setTcPoints(1);
      fetchTestCases(selectedProblemId);
    } catch (err) {
      setError(err.message || 'Failed to create test case.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTestCase = async (tcId) => {
    if (!confirm('Are you sure you want to delete this test case?')) return;
    try {
      await api.testCases.delete(tcId);
      setSuccess('Test case deleted.');
      fetchTestCases(selectedProblemId);
    } catch (err) {
      setError(err.message || 'Failed to delete test case.');
    }
  };

  // Restrict access
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return (
      <div className="glass-panel empty-catalog-fallback" style={{ marginBlock: '80px' }}>
        <Shield size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3>Access Restricted</h3>
        <p style={{ color: 'var(--text-darker)' }}>You do not have administrative credentials to enter the CodeRank manager panel.</p>
        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ marginTop: '16px' }}>Back to Home</button>
      </div>
    );
  }

  const handleCreateProblem = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const parsedTags = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      title,
      difficulty,
      tags: parsedTags,
      statement,
      input_format: inputFormat,
      output_format: outputFormat,
      constraints,
      sample_input: sampleInput,
      sample_output: sampleOutput,
      time_limit: parseInt(timeLimit),
      memory_limit: parseInt(memoryLimit)
    };

    try {
      const res = await api.problems.create(payload);
      setSuccess(`Challenge "${res.title}" generated successfully with ID: ${res.id}`);
      
      // Clear form
      setTitle('');
      setDifficulty('EASY');
      setTags('');
      setStatement('');
      setInputFormat('');
      setOutputFormat('');
      setConstraints('');
      setSampleInput('');
      setSampleOutput('');
      setTimeLimit(2);
      setMemoryLimit(256);
    } catch (err) {
      setError(err.message || 'An error occurred creating the problem challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-view-container">
      <div className="catalog-header" style={{ marginBottom: '24px' }}>
        <div className="catalog-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} style={{ color: 'var(--accent-purple)' }} />
            <h2>CodeRank Console</h2>
          </div>
          <p>Administrative system to construct code challenges and manage compiler clusters.</p>
        </div>
      </div>

      {/* Tabs selectors */}
      <div className="admin-dashboard-tabs">
        <button 
          className={`admin-tab-trigger ${activeTab === 'problem' ? 'active' : ''}`}
          onClick={() => { setActiveTab('problem'); setError(null); setSuccess(null); }}
        >
          <PlusCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          <span>New Problem</span>
        </button>
        <button 
          className={`admin-tab-trigger ${activeTab === 'testcases' ? 'active' : ''}`}
          onClick={() => { setActiveTab('testcases'); setError(null); setSuccess(null); }}
        >
          <Database size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          <span>Test Cases</span>
        </button>
        <button 
          className={`admin-tab-trigger ${activeTab === 'languages' ? 'active' : ''}`}
          onClick={() => { setActiveTab('languages'); setError(null); setSuccess(null); }}
        >
          <Globe size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          <span>Compiler Status</span>
        </button>
      </div>

      {/* Form Prompts */}
      {error && (
        <div className="auth-error-alert" style={{ maxWidth: '800px', marginInline: 'auto' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="auth-error-alert" style={{ maxWidth: '800px', marginInline: 'auto', background: 'var(--success-glow)', borderColor: 'var(--success-border)', color: 'var(--success)' }}>
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Active Tab View */}
      {activeTab === 'problem' ? (
        // CREATE PROBLEM VIEW
        <div className="glass-panel admin-crud-card" style={{ maxWidth: '800px', marginInline: 'auto' }}>
          <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-title)' }}>Construct Coding Challenge</h3>
          
          <form onSubmit={handleCreateProblem}>
            {/* Title */}
            <div className="input-group">
              <label className="input-label">Challenge Title</label>
              <input 
                type="text" 
                required 
                placeholder="Longest Common Subsequence"
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="input-field" 
                disabled={submitting}
              />
            </div>

            {/* Row: Difficulty and tags */}
            <div className="form-grid-two-col">
              <div className="input-group">
                <label className="input-label">Difficulty Rating</label>
                <select 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input-field select-field"
                  disabled={submitting}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Category Tags (comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="DP, Strings, Arrays"
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)}
                  className="input-field" 
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Problem Statement */}
            <div className="input-group">
              <label className="input-label">Problem Statement (supports Markdown/plain text)</label>
              <textarea 
                required 
                placeholder="Given a string, find the length of the longest palindromic substring..."
                value={statement} 
                onChange={(e) => setStatement(e.target.value)}
                className="input-field" 
                style={{ height: '140px', resize: 'vertical' }}
                disabled={submitting}
              />
            </div>

            {/* Grid Specifications: input output format */}
            <div className="form-grid-two-col">
              <div className="input-group">
                <label className="input-label">Input Layout format</label>
                <textarea 
                  required 
                  placeholder="First line: integer N representing elements..."
                  value={inputFormat} 
                  onChange={(e) => setInputFormat(e.target.value)}
                  className="input-field" 
                  style={{ height: '70px', resize: 'vertical' }}
                  disabled={submitting}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Output Layout format</label>
                <textarea 
                  required 
                  placeholder="Returns single space-separated integers..."
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="input-field" 
                  style={{ height: '70px', resize: 'vertical' }}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Constraints */}
            <div className="input-group">
              <label className="input-label">Constraints</label>
              <textarea 
                placeholder="1 <= N <= 10^5"
                value={constraints} 
                onChange={(e) => setConstraints(e.target.value)}
                className="input-field" 
                style={{ height: '50px', resize: 'vertical' }}
                disabled={submitting}
              />
            </div>

            {/* Sample Inputs Outputs */}
            <div className="form-grid-two-col">
              <div className="input-group">
                <label className="input-label">Sample Input Case</label>
                <textarea 
                  required 
                  placeholder={"5\n1 2 3 4 5"}
                  value={sampleInput} 
                  onChange={(e) => setSampleInput(e.target.value)}
                  className="input-field" 
                  style={{ height: '60px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', resize: 'vertical' }}
                  disabled={submitting}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Sample Output Case</label>
                <textarea 
                  required 
                  placeholder="15"
                  value={sampleOutput} 
                  onChange={(e) => setSampleOutput(e.target.value)}
                  className="input-field" 
                  style={{ height: '60px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', resize: 'vertical' }}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Time / Memory limits */}
            <div className="form-grid-two-col">
              <div className="input-group">
                <label className="input-label">Execution Time Limit (seconds)</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  max="10"
                  value={timeLimit} 
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="input-field" 
                  disabled={submitting}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Memory Boundary Limit (MB)</label>
                <input 
                  type="number" 
                  required 
                  min="16" 
                  max="1024"
                  value={memoryLimit} 
                  onChange={(e) => setMemoryLimit(e.target.value)}
                  className="input-field" 
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="admin-submit-wrapper">
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '150px' }}
                disabled={submitting}
              >
                {submitting ? 'Generating...' : 'Build Challenge'}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'testcases' ? (
        // TEST CASE MANAGEMENT VIEW
        <div className="glass-panel admin-crud-card" style={{ maxWidth: '800px', marginInline: 'auto' }}>
          <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-title)' }}>Test Case Manager</h3>
          
          {/* Problem Selector */}
          <div className="input-group">
            <label className="input-label">Select Problem</label>
            <select
              value={selectedProblemId}
              onChange={(e) => handleSelectProblem(e.target.value)}
              className="input-field select-field"
            >
              <option value="">— Choose a problem —</option>
              {problems.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>
              ))}
            </select>
          </div>

          {selectedProblemId && (
            <>
              {/* Create Test Case Form */}
              <form onSubmit={handleCreateTestCase} style={{ marginBottom: '32px' }}>
                <h4 style={{ marginBottom: '16px', fontFamily: 'var(--font-title)', fontSize: '1rem' }}>Add New Test Case</h4>
                <div className="form-grid-two-col">
                  <div className="input-group">
                    <label className="input-label">Input Data</label>
                    <textarea
                      required
                      placeholder={"5\n1 2 3 4 5"}
                      value={tcInputData}
                      onChange={(e) => setTcInputData(e.target.value)}
                      className="input-field"
                      style={{ height: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', resize: 'vertical' }}
                      disabled={submitting}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Expected Output</label>
                    <textarea
                      required
                      placeholder="15"
                      value={tcExpectedOutput}
                      onChange={(e) => setTcExpectedOutput(e.target.value)}
                      className="input-field"
                      style={{ height: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', resize: 'vertical' }}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="form-grid-two-col">
                  <div className="input-group">
                    <label className="input-label">Points</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={tcPoints}
                      onChange={(e) => setTcPoints(e.target.value)}
                      className="input-field"
                      disabled={submitting}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ marginBottom: '4px' }}>Hidden Test Case</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="checkbox"
                        checked={tcIsHidden}
                        onChange={(e) => setTcIsHidden(e.target.checked)}
                        disabled={submitting}
                      />
                      <span>Hidden from users (used for judging only)</span>
                    </label>
                  </div>
                </div>
                <div className="admin-submit-wrapper">
                  <button type="submit" className="btn btn-success btn-sm" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Add Test Case'}
                  </button>
                </div>
              </form>

              {/* Existing Test Cases List */}
              <h4 style={{ marginBottom: '12px', fontFamily: 'var(--font-title)', fontSize: '1rem' }}>Existing Test Cases</h4>
              {tcLoading ? (
                <div className="judge-loading-state" style={{ paddingBlock: '20px' }}>
                  <div className="judge-loader-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                  <span>Loading test cases...</span>
                </div>
              ) : testCases.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-darker)', textAlign: 'center', padding: '20px' }}>No test cases found for this problem.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {testCases.map((tc, idx) => (
                    <div key={tc.id} className="submission-history-row" style={{ background: 'var(--bg-hover-row)', border: '1px solid var(--border-glow)' }}>
                      <div className="sub-row-meta">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-bright)' }}>Test Case #{idx + 1}</span>
                        <div className="sub-row-stats">
                          <span>{tc.points} pts</span>
                          <span className={`badge ${tc.is_hidden ? 'badge-pending' : 'badge-accepted'}`}>
                            {tc.is_hidden ? 'Hidden' : 'Visible'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTestCase(tc.id)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '6px 10px' }}
                        title="Delete test case"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // LANGUAGE RUNNERS VIEW
        <div className="glass-panel admin-crud-card" style={{ maxWidth: '800px', marginInline: 'auto' }}>
          <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-title)' }}>Supported Compiler Clusters</h3>
          
          <div className="leaderboard-list-table-panel" style={{ border: 'none' }}>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Engine</th>
                  <th>Image Source</th>
                  <th>Core commands</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {languages.map((lang) => (
                  <tr key={lang.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{lang.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-darker)' }}>Version: {lang.version}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tag-pill" style={{ fontSize: '0.75rem' }}>{lang.docker_image}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                        {lang.compile_command ? `${lang.compile_command} && ` : ''}{lang.run_command}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${lang.is_active ? 'badge-accepted' : 'badge-pending'}`}>
                        {lang.is_active ? 'Active' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
