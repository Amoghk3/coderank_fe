import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import { api, submissionEmitter, connectSubmissionWebSocket } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  ArrowLeft, BookOpen, Clock, Cpu, Play, Send, 
  Terminal as TermIcon, FileText, CheckCircle2, AlertTriangle, XCircle 
} from 'lucide-react';

const LANGUAGE_BOILERPLATES = {
  python: `# Write your solution here\n# Input is read from stdin\nimport sys\n\ndef solve():\n    # read lines from sys.stdin\n    pass\n\nif __name__ == '__main__':\n    solve()`,
  javascript: `// Write your solution here\n// Input is read from process.stdin\nconst fs = require('fs');\n\nfunction main() {\n    const input = fs.readFileSync('/dev/stdin', 'utf-8');\n    console.log(input.trim());\n}\n\nmain();`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input using cin\n    // Write output using cout\n    \n    return 0;\n}`
};

const ProblemSolver = () => {
  const { problemId } = useParams();
  const { user, isDemo } = useAuth();
  const { theme } = useTheme();

  const [problem, setProblem] = useState(null);
  const [languages, setLanguages] = useState([]);
  
  // IDE State
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [editorCode, setEditorCode] = useState('');
  
  const [leftTab, setLeftTab] = useState('details'); // details | submissions
  const [submissionHistory, setSubmissionHistory] = useState([]);
  
  // Console state
  const [consoleTab, setConsoleTab] = useState('input'); // input | output
  const [customInput, setCustomInput] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [runResult, setRunResult] = useState(null);

  // Reference to hold active subscription channel id
  const activeSubmissionRef = useRef(null);
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Helper: get language name from UUID
  const getLanguageName = (langId) => {
    const lang = languages.find(l => l.id === langId);
    return lang ? lang.name.toLowerCase() : langId;
  };

  // Helper: map language name to Monaco language identifier
  const getMonacoLanguage = (langId) => {
    const name = getLanguageName(langId);
    if (name.includes('python')) return 'python';
    if (name.includes('javascript') || name.includes('node')) return 'javascript';
    if (name.includes('c++') || name.includes('cpp')) return 'cpp';
    if (name.includes('java')) return 'java';
    if (name.includes('go')) return 'go';
    if (name.includes('rust')) return 'rust';
    return 'plaintext';
  };

  // Sync default code template when language changes
  useEffect(() => {
    const langName = getLanguageName(selectedLanguage);
    // Try exact match first, then partial match
    const boilerplate = LANGUAGE_BOILERPLATES[langName] 
      || LANGUAGE_BOILERPLATES[Object.keys(LANGUAGE_BOILERPLATES).find(k => langName.includes(k))];
    if (boilerplate) {
      setEditorCode(boilerplate);
    }
  }, [selectedLanguage, languages]);

  // Load problem details
  const fetchProblemDetails = async () => {
    try {
      const data = await api.problems.get(problemId);
      setProblem(data);
      if (data.sample_input) {
        setCustomInput(data.sample_input);
      }
    } catch (err) {
      console.error('Failed to load problem statement:', err);
    }
  };

  // Load submissions list
  const fetchSubmissionHistory = async () => {
    if (!user) return;
    try {
      const list = await api.submissions.history();
      const problemSubs = list.filter(
        s => s.problem_id === problemId || s.problem_id === problem?.id
      );
      setSubmissionHistory(problemSubs);
    } catch (err) {
      console.error('Failed to load submission history:', err);
    }
  };

  // Fetch languages supported
  const fetchLanguages = async () => {
    try {
      const list = await api.languages.list();
      setLanguages(list);
      if (list.length > 0) {
        setSelectedLanguage(list[0].id);
      }
    } catch (err) {
      console.error('Failed to retrieve languages list:', err);
    }
  };

  useEffect(() => {
    fetchProblemDetails();
    fetchLanguages();
  }, [problemId]);

  useEffect(() => {
    if (problem) {
      fetchSubmissionHistory();
    }
  }, [problem, user]);

  // Monitor submission progress via WebSocket (live) or mock emitter (demo)
  useEffect(() => {
    const handleProgress = (data) => {
      setRunResult(prev => ({
        ...prev,
        ...data
      }));

      const terminalStatuses = ['ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'FAILED'];
      if (terminalStatuses.includes(data.status)) {
        setEvaluating(false);
        fetchSubmissionHistory();

        // For live mode, fetch full results from API
        if (!isDemo && activeSubmissionRef.current) {
          api.submissions.getResults(activeSubmissionRef.current).then(results => {
            setRunResult(prev => ({
              ...prev,
              ...results
            }));
          }).catch(() => {});
        }
        
        // Trigger celebratory confetti on success
        if (data.status === 'ACCEPTED' && runResult?.is_judge) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b']
          });
        }

        // Close WebSocket after terminal status
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      }
    };

    const emitterListener = (data) => {
      handleProgress(data);
    };

    // Subscribing to emitter triggers (demo mode)
    if (activeSubmissionRef.current && isDemo) {
      submissionEmitter.on(activeSubmissionRef.current, emitterListener);
    }

    return () => {
      if (activeSubmissionRef.current) {
        submissionEmitter.off(activeSubmissionRef.current, emitterListener);
      }
    };
  }, [activeSubmissionRef.current, runResult, isDemo]);

  // Cleanup WebSocket and polling interval on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Polling fallback mechanism when WebSocket doesn't broadcast cross-process updates
  const startPollingSubmission = (submissionId, isJudge) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const subData = await api.submissions.get(submissionId);
        if (subData && subData.status) {
          const terminalStatuses = ['ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'FAILED'];
          if (terminalStatuses.includes(subData.status)) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            
            // Close WebSocket if still active
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }

            setEvaluating(false);
            fetchSubmissionHistory();
            
            // Fetch final full results
            api.submissions.getResults(submissionId).then(results => {
              setRunResult(prev => ({ ...prev, ...results }));
            }).catch(() => {});

            // Trigger celebratory confetti on success for judge submissions
            if (subData.status === 'ACCEPTED' && isJudge) {
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b']
              });
            }
          } else {
            // Keep status updated in real-time
            setRunResult(prev => ({ ...prev, ...subData }));
          }
        }
      } catch (err) {
        console.error('Error polling submission:', err);
      }
    }, 1000);
  };

  // Trigger Custom Input Execute Run
  const handleRunCode = async () => {
    if (evaluating) return;
    setEvaluating(true);
    setConsoleTab('output');
    setRunResult({ status: 'PENDING', is_judge: false });

    try {
      const sub = await api.submissions.execute(
        problem.id,
        selectedLanguage,
        editorCode,
        customInput
      );
      activeSubmissionRef.current = sub.id;
      setRunResult({ id: sub.id, status: sub.status, is_judge: false });

      // Connect WebSocket for live updates and start polling fallback
      if (!isDemo) {
        if (wsRef.current) wsRef.current.close();
        wsRef.current = connectSubmissionWebSocket(sub.id, (data) => {
          setRunResult(prev => ({ ...prev, ...data }));
          const terminalStatuses = ['ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'FAILED'];
          if (terminalStatuses.includes(data.status)) {
            setEvaluating(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            fetchSubmissionHistory();
            api.submissions.getResults(sub.id).then(results => {
              setRunResult(prev => ({ ...prev, ...results }));
            }).catch(() => {});
          }
        });
        startPollingSubmission(sub.id, false);
      }
    } catch (err) {
      setEvaluating(false);
      setRunResult({ status: 'FAILED', error: err.message });
    }
  };

  // Trigger Formal Test Submit to Judge
  const handleSubmitCode = async () => {
    if (evaluating) return;
    if (!user) {
      alert('You must be signed in to submit code answers to the judge.');
      return;
    }
    setEvaluating(true);
    setConsoleTab('output');
    setRunResult({ status: 'PENDING', is_judge: true });

    try {
      const sub = await api.submissions.judge(
        problem.id,
        selectedLanguage,
        editorCode
      );
      activeSubmissionRef.current = sub.id;
      setRunResult({ id: sub.id, status: sub.status, is_judge: true });

      // Connect WebSocket for live updates and start polling fallback
      if (!isDemo) {
        if (wsRef.current) wsRef.current.close();
        wsRef.current = connectSubmissionWebSocket(sub.id, (data) => {
          setRunResult(prev => ({ ...prev, ...data }));
          const terminalStatuses = ['ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'FAILED'];
          if (terminalStatuses.includes(data.status)) {
            setEvaluating(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            fetchSubmissionHistory();
            api.submissions.getResults(sub.id).then(results => {
              setRunResult(prev => ({ ...prev, ...results }));
            }).catch(() => {});
            if (data.status === 'ACCEPTED') {
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b']
              });
            }
          }
        });
        startPollingSubmission(sub.id, true);
      }
    } catch (err) {
      setEvaluating(false);
      setRunResult({ status: 'FAILED', error: err.message });
    }
  };

  if (!problem) {
    return (
      <div className="judge-loading-state" style={{ paddingBlock: '150px' }}>
        <div className="judge-loader-spinner"></div>
        <span>Compiling workspace environment...</span>
      </div>
    );
  }

  return (
    <div className="ide-layout-container">
      {/* LEFT COLUMN: Problem specs / Submissions history */}
      <div className="ide-left-pane glass-panel">
        <div className="ide-pane-tabs">
          <button 
            className={`pane-tab-btn ${leftTab === 'details' ? 'active' : ''}`}
            onClick={() => setLeftTab('details')}
          >
            <BookOpen size={16} />
            <span>Problem Specs</span>
          </button>
          
          {user && (
            <button 
              className={`pane-tab-btn ${leftTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setLeftTab('submissions')}
            >
              <Clock size={16} />
              <span>Submissions ({submissionHistory.length})</span>
            </button>
          )}
        </div>

        <div className="ide-pane-content">
          {leftTab === 'details' ? (
            <>
              {/* Back navigation */}
              <Link to="/problems" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-darker)', marginBottom: '14px' }}>
                <ArrowLeft size={12} /> Back to catalogue
              </Link>
              
              <h2 className="problem-details-title">{problem.title}</h2>
              
              <div className="problem-difficulty-badge-wrap">
                <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>
                  {problem.difficulty}
                </span>
                <span className="tag-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {problem.time_limit}s limit
                </span>
                <span className="tag-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={12} /> {problem.memory_limit}MB ram
                </span>
              </div>

              {/* Statement */}
              <div className="problem-statement-markdown">
                {problem.statement}
              </div>

              {/* Input Specs */}
              <h3 className="ide-spec-header">Input Format</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-bright)' }}>{problem.input_format}</p>

              {/* Output Specs */}
              <h3 className="ide-spec-header">Output Format</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-bright)' }}>{problem.output_format}</p>

              {/* Constraints */}
              {problem.constraints && (
                <>
                  <h3 className="ide-spec-header">Constraints</h3>
                  <pre className="constraints-content-box">{problem.constraints}</pre>
                </>
              )}

              {/* Examples */}
              <h3 className="ide-spec-header" style={{ border: 'none', marginBottom: '8px' }}>Example Sample</h3>
              <div className="sample-case-container">
                <div className="sample-box">
                  <span className="sample-label">Sample Input</span>
                  <pre className="sample-data">{problem.sample_input}</pre>
                </div>
                <div className="sample-box">
                  <span className="sample-label">Sample Output</span>
                  <pre className="sample-data">{problem.sample_output}</pre>
                </div>
              </div>
            </>
          ) : (
            // SUBMISSIONS HISTORY VIEW
            <div className="submission-history-list">
              <h3 style={{ marginBottom: '16px', fontFamily: 'var(--font-title)' }}>Submission History</h3>
              {submissionHistory.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-darker)' }}>You haven't submitted any answers for this challenge yet.</p>
              ) : (
                submissionHistory.map((sub) => (
                  <div key={sub.id} className="submission-history-row">
                    <div className="sub-row-meta">
                      <span className="sub-row-id">ID: #{sub.id}</span>
                      <div className="sub-row-stats">
                        <span style={{ textTransform: 'capitalize' }}>{sub.language_id}</span>
                        {sub.runtime_ms && <span>{sub.runtime_ms} ms</span>}
                        {sub.memory_kb && <span>{(sub.memory_kb / 1024).toFixed(1)} MB</span>}
                      </div>
                    </div>
                    <span className={`badge badge-${sub.status.toLowerCase()}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Monaco IDE + bottom drawers */}
      <div className="ide-right-pane">
        {/* Editor controls */}
        <div className="editor-control-banner">
          <div className="flex-center" style={{ gap: '10px' }}>
            <TermIcon size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)' }}>Code Editor</span>
          </div>

          <select 
            value={selectedLanguage} 
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="editor-lang-picker"
          >
            {languages.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.name} ({lang.version})
              </option>
            ))}
          </select>
        </div>

        {/* Monaco Editor Frame */}
        <div className="editor-mount-area">
          <Editor
            height="100%"
            language={getMonacoLanguage(selectedLanguage)}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={editorCode}
            onChange={(val) => setEditorCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              lineHeight: 22,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on'
            }}
          />
        </div>

        {/* Console drawers */}
        <div className="ide-console-panel">
          <div className="console-tab-header">
            <div className="console-tab-selectors">
              <button 
                className={`console-tab-title ${consoleTab === 'input' ? 'active' : ''}`}
                onClick={() => setConsoleTab('input')}
              >
                Custom Input
              </button>
              <button 
                className={`console-tab-title ${consoleTab === 'output' ? 'active' : ''}`}
                onClick={() => setConsoleTab('output')}
              >
                Console Results
              </button>
            </div>

            <div className="console-action-triggers">
              <button 
                onClick={handleRunCode} 
                className="btn btn-secondary btn-sm flex-center"
                disabled={evaluating}
              >
                <Play size={12} />
                <span>Run</span>
              </button>
              
              <button 
                onClick={handleSubmitCode} 
                className="btn btn-primary btn-sm flex-center"
                disabled={evaluating}
              >
                <Send size={12} />
                <span>Submit</span>
              </button>
            </div>
          </div>

          <div className="console-body-view">
            {consoleTab === 'input' ? (
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Write custom stdin input lines here..."
                className="console-textarea-input"
              />
            ) : (
              // CONSOLE RESULTS SHELL
              <div className="console-output-shell">
                {runResult ? (
                  <>
                    {/* Status diagnostic display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-glow)', paddingBottom: '8px' }}>
                      {runResult.status === 'PENDING' && (
                        <div className="judge-loading-state" style={{ flexDirection: 'row', minHeight: 'auto', gap: '10px' }}>
                          <div className="judge-loader-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                          <span style={{ color: 'var(--text-darker)' }}>Job is queued in broker...</span>
                        </div>
                      )}
                      {runResult.status === 'RUNNING' && (
                        <div className="judge-loading-state" style={{ flexDirection: 'row', minHeight: 'auto', gap: '10px' }}>
                          <div className="judge-loader-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                          <span style={{ color: 'var(--primary)' }}>Compiling and running on sandbox workers...</span>
                        </div>
                      )}
                      {runResult.status === 'ACCEPTED' && (
                        <span className="badge badge-accepted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={12} /> Accepted
                        </span>
                      )}
                      {runResult.status === 'WRONG_ANSWER' && (
                        <span className="badge badge-wrong_answer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={12} /> Wrong Answer
                        </span>
                      )}
                      {['RUNTIME_ERROR', 'COMPILATION_ERROR', 'TIME_LIMIT_EXCEEDED'].includes(runResult.status) && (
                        <span className={`badge badge-${runResult.status.toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={12} /> {runResult.status.replace('_', ' ')}
                        </span>
                      )}

                      {/* Performance Specs */}
                      {runResult.runtime_ms !== undefined && runResult.runtime_ms !== null && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-darker)', marginLeft: 'auto' }}>
                          Time: <strong>{runResult.runtime_ms} ms</strong> | RAM: <strong>{(runResult.memory_kb / 1024).toFixed(2)} MB</strong>
                        </span>
                      )}
                    </div>

                    {/* Stdout / Stderr logs (for Custom Input runs) */}
                    {!runResult.is_judge && runResult.execution_results && runResult.execution_results.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {runResult.execution_results[0].stdout && (
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-darker)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>stdout</span>
                            <pre style={{ background: 'var(--bg-code-block)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-glow)', color: 'var(--text-bright)' }}>{runResult.execution_results[0].stdout}</pre>
                          </div>
                        )}
                        {runResult.execution_results[0].stderr && (
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--danger)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>stderr / traceback</span>
                            <pre style={{ background: 'var(--stderr-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--stderr-border)', color: 'var(--stderr-color)' }}>{runResult.execution_results[0].stderr}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Judge results (Table of testcases passed) */}
                    {runResult.is_judge && runResult.judge_case_results && runResult.judge_case_results.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-bright)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Testcase Diagnostics</span>
                        <div className="case-result-badge-grid">
                          {runResult.judge_case_results.map((c, index) => (
                            <div key={index} className={`case-card ${c.passed ? 'passed' : 'failed'}`}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Test Case #{index + 1}</span>
                              <span style={{ fontSize: '0.65rem' }}>{c.passed ? 'Passed' : 'Failed'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--text-darker)', display: 'flex', alignItems: 'center', gap: '8px', height: '80px', justifyContent: 'center' }}>
                    <FileText size={18} />
                    <span>Run your code first to verify output diagnostic checks.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemSolver;
