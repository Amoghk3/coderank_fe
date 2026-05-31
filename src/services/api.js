// Double-Fidelity API Service Client for CodeRank
// Seamlessly routes requests to http://localhost:8000/api/v1, or falls back to an offline localStorage-backed mockup db.

const API_BASE_URL = '/api/v1';

// Toggle to explicitly force Demo Mode for styling/testing without backend
let forceDemoMode = false;

// Check if backend is alive, fallback to mock if unreachable
async function isBackendAlive() {
  if (forceDemoMode) return false;
  try {
    const res = await fetch('/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(1500) 
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

// Helper: get auth header
function authHeaders(extra = {}) {
  const token = localStorage.getItem('coderank_token');
  const headers = { ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper: make an authenticated JSON request
async function apiFetch(path, options = {}) {
  const { body, method = 'GET', auth = false, ...rest } = options;
  const headers = auth
    ? authHeaders({ 'Content-Type': 'application/json' })
    : { 'Content-Type': 'application/json' };

  const fetchOptions = { method, headers, ...rest };
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  // Handle 204 No Content
  if (res.status === 204) return null;
  
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// -------------------------------------------------------
// FIELD MAPPING HELPERS
// -------------------------------------------------------

// Backend ProblemResponse → Frontend Problem shape
// Backend returns: { id, title, slug, statement, input_format, output_format, sample_input, sample_output, difficulty, time_limit_ms, memory_limit_mb, constraints, examples }
function mapProblemFromBackend(p) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    statement: p.statement || '',
    input_format: p.input_format || '',
    output_format: p.output_format || '',
    constraints: p.constraints || '',
    examples: p.examples || '',
    sample_input: p.sample_input || '',
    sample_output: p.sample_output || '',
    difficulty: p.difficulty || 'EASY',
    time_limit: p.time_limit_ms != null ? p.time_limit_ms / 1000 : 2,
    memory_limit: p.memory_limit_mb || 128,
    tags: p.tags || [],
  };
}

// Frontend Problem create payload → Backend ProblemCreate shape
function mapProblemToBackend(payload) {
  const slug = payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    title: payload.title,
    slug,
    statement: payload.statement || '',
    input_format: payload.input_format || '',
    output_format: payload.output_format || '',
    sample_input: payload.sample_input || '',
    sample_output: payload.sample_output || '',
    constraints: payload.constraints || null,
    examples: payload.examples || null,
    difficulty: payload.difficulty || 'EASY',
    time_limit_ms: payload.time_limit ? payload.time_limit * 1000 : 2000,
    memory_limit_mb: payload.memory_limit || 128,
    tags: payload.tags || [],
  };
}

// Backend Leaderboard → Frontend Leaderboard shape
function mapLeaderboardFromBackend(entries) {
  return entries.map((entry, index) => ({
    username: entry.username || (entry.email ? entry.email.split('@')[0] : `User-${String(entry.user_id).slice(0, 6)}`),
    user_id: entry.user_id,
    total_score: entry.total_score || 0,
    solved_count: entry.accepted_count || 0,
    total_submissions: entry.total_submissions || 0,
    best_runtime_ms: entry.best_runtime_ms,
    rank: index + 1,
  }));
}

// ----------------------------------------------------
// LOCAL STORAGE SEED DATABASE (Demo Mode)
// ----------------------------------------------------
const SEED_LANGUAGES = [
  { id: 'python', name: 'Python', version: '3.11', docker_image: 'python:3.11-alpine', run_command: 'python', time_limit: 2, memory_limit: 256, is_active: true },
  { id: 'javascript', name: 'JavaScript', version: 'Node 18', docker_image: 'node:18-alpine', run_command: 'node', time_limit: 2, memory_limit: 256, is_active: true },
  { id: 'cpp', name: 'C++', version: 'GCC 12', docker_image: 'gcc:12', compile_command: 'g++ -O3', run_command: './a.out', time_limit: 2, memory_limit: 256, is_active: true }
];

const SEED_PROBLEMS = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'EASY',
    tags: ['Arrays', 'Hash Table'],
    statement: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    input_format: 'Line 1: N (size of array), followed by N integers representing the array nums.\nLine 2: Target integer.',
    output_format: 'Two space-separated indices.',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    sample_input: '4 2 7 11 15\n9',
    sample_output: '0 1',
    time_limit: 2,
    memory_limit: 256
  },
  {
    id: 'reverse-string',
    title: 'Reverse a String',
    slug: 'reverse-string',
    difficulty: 'EASY',
    tags: ['Strings', 'Two Pointers'],
    statement: 'Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.',
    input_format: 'A single line containing the string to be reversed.',
    output_format: 'The reversed string output.',
    constraints: '1 <= s.length <= 10^5\ns[i] is a printable ascii character.',
    sample_input: 'hello',
    sample_output: 'olleh',
    time_limit: 1,
    memory_limit: 64
  },
  {
    id: 'longest-palindromic-substring',
    title: 'Longest Palindromic Substring',
    slug: 'longest-palindromic-substring',
    difficulty: 'MEDIUM',
    tags: ['Strings', 'Dynamic Programming'],
    statement: 'Given a string `s`, return *the longest palindromic substring* in `s`.',
    input_format: 'A single line containing string s.',
    output_format: 'Longest palindromic substring.',
    constraints: '1 <= s.length <= 1000\ns consists of only digits and English letters.',
    sample_input: 'babad',
    sample_output: 'bab',
    time_limit: 2,
    memory_limit: 256
  },
  {
    id: 'n-queens',
    title: 'N-Queens',
    slug: 'n-queens',
    difficulty: 'HARD',
    tags: ['Backtracking', 'Recursion'],
    statement: 'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer `n`, return the total number of distinct solutions, and print one valid configuration.',
    input_format: 'A single line containing integer n.',
    output_format: 'First line: Total solutions. Followed by N lines representing one solved board grid where Q represents a Queen and . represents an empty square.',
    constraints: '1 <= n <= 9',
    sample_input: '4',
    sample_output: '2\n. Q . .\n. . . Q\nQ . . .\n. . Q .',
    time_limit: 3,
    memory_limit: 128
  },
  {
    id: 'merge-k-sorted-lists',
    title: 'Merge K Sorted Lists',
    slug: 'merge-k-sorted-lists',
    difficulty: 'HARD',
    tags: ['Divide and Conquer', 'Heaps', 'Linked Lists'],
    statement: 'You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.\n\n*Merge all the linked-lists into one sorted linked-list and return it.*',
    input_format: 'Line 1: An integer K representing the number of lists.\nNext K lines: A space-separated sorted list of elements.',
    output_format: 'A single space-separated sorted list representing all merged nodes.',
    constraints: '0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4',
    sample_input: '3\n1 4 5\n1 3 4\n2 6',
    sample_output: '1 1 2 3 4 4 5 6',
    time_limit: 2,
    memory_limit: 256
  }
];

const SEED_LEADERBOARD = [
  { username: 'algorithm_master', total_score: 950, solved_count: 5, rank: 1 },
  { username: 'cyber_coder', total_score: 820, solved_count: 4, rank: 2 },
  { username: 'rust_ace', total_score: 760, solved_count: 4, rank: 3 },
  { username: 'pythonista', total_score: 550, solved_count: 3, rank: 4 },
  { username: 'bug_hunter', total_score: 410, solved_count: 2, rank: 5 }
];

// Initialize database in LocalStorage
function initStorageDb() {
  if (!localStorage.getItem('coderank_languages')) {
    localStorage.setItem('coderank_languages', JSON.stringify(SEED_LANGUAGES));
  }
  if (!localStorage.getItem('coderank_problems')) {
    localStorage.setItem('coderank_problems', JSON.stringify(SEED_PROBLEMS));
  }
  if (!localStorage.getItem('coderank_leaderboard')) {
    localStorage.setItem('coderank_leaderboard', JSON.stringify(SEED_LEADERBOARD));
  }
  if (!localStorage.getItem('coderank_submissions')) {
    localStorage.setItem('coderank_submissions', JSON.stringify([]));
  }
  if (!localStorage.getItem('coderank_users')) {
    // Default admin and user accounts
    localStorage.setItem('coderank_users', JSON.stringify([
      { id: 'usr-admin', email: 'admin@coderank.com', username: 'admin', password: 'password', is_active: true, role: 'ADMIN', total_score: 1200 },
      { id: 'usr-demo', email: 'demo@coderank.com', username: 'demo_user', password: 'password', is_active: true, role: 'USER', total_score: 250 }
    ]));
  }
}
initStorageDb();

// Helper to simulate request delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Custom event system to dispatch real-time submission progress mock alerts
export const submissionEmitter = {
  listeners: {},
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  },
  off(event, cb) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== cb);
  },
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }
};

// -------------------------------------------------------
// WEBSOCKET MANAGER for live submission updates
// -------------------------------------------------------
export function connectSubmissionWebSocket(submissionId, onMessage) {
  // WebSocket connects directly to the backend
  // Route is under /api/v1 prefix (ws_router is inside api_router)
  const wsUrl = `ws://localhost:8000/api/v1/ws/submissions/${submissionId}`;
  let ws;
  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    console.error('WebSocket connection failed:', e);
    return null;
  }

  ws.onopen = () => {
    console.log(`[WS] Connected to submission ${submissionId}`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('[WS] Failed to parse message:', e);
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
  };

  ws.onclose = () => {
    console.log(`[WS] Disconnected from submission ${submissionId}`);
  };

  return ws;
}

// ----------------------------------------------------
// CORE API CLIENT DEFINITIONS
// ----------------------------------------------------
export const api = {
  // Demo toggling
  isDemoMode: async () => {
    const backendAlive = await isBackendAlive();
    return !backendAlive;
  },

  setForceDemo: (force) => {
    forceDemoMode = force;
  },

  // Auth Operations
  auth: {
    register: async (email, username, password) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch('/auth/register', {
            method: 'POST',
            body: { email, username, password }
          });
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock register
      await delay(600);
      const users = JSON.parse(localStorage.getItem('coderank_users'));
      if (users.find(u => u.email === email)) {
        throw new Error('Email already registered');
      }
      if (users.find(u => u.username === username)) {
        throw new Error('Username already taken');
      }

      const newUser = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email,
        username,
        password, // stored plain for mock demo purposes
        is_active: true,
        role: 'USER',
        total_score: 0
      };

      users.push(newUser);
      localStorage.setItem('coderank_users', JSON.stringify(users));

      return {
        message: 'User registered successfully',
        user: { id: newUser.id, email: newUser.email, username: newUser.username, is_active: newUser.is_active }
      };
    },

    login: async (email, password) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          // OAuth2 password flow requires form-urlencoded with 'username' field
          const formData = new URLSearchParams();
          formData.append('username', email);
          formData.append('password', password);

          const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
          });

          if (!res.ok) {
            let detail = `Login failed (${res.status})`;
            try {
              const errData = await res.json();
              detail = errData.detail || detail;
            } catch (_) {}
            throw new Error(detail);
          }

          const data = await res.json();
          localStorage.setItem('coderank_token', data.access_token);

          // Fetch the full user profile after login
          const userProfile = await apiFetch('/auth/me', { method: 'GET', auth: true });

          return {
            access_token: data.access_token,
            token_type: data.token_type,
            user: userProfile,
          };
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock login
      await delay(600);
      const users = JSON.parse(localStorage.getItem('coderank_users'));
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const token = `mock-jwt-token-for-${user.id}`;
      localStorage.setItem('coderank_token', token);

      return {
        message: 'Login successful',
        access_token: token,
        token_type: 'bearer',
        user: { id: user.id, email: user.email, username: user.username, is_active: user.is_active, role: user.role }
      };
    },

    me: async () => {
      const token = localStorage.getItem('coderank_token');
      if (!token) return null;

      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch('/auth/me', { method: 'GET', auth: true });
        } catch (err) {
          // If 401, clear token
          if (err.message.includes('401') || err.message.includes('Invalid authentication')) {
            localStorage.removeItem('coderank_token');
            return null;
          }
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock me
      if (!token.startsWith('mock-jwt-token-for-')) return null;
      const userId = token.replace('mock-jwt-token-for-', '');
      const users = JSON.parse(localStorage.getItem('coderank_users'));
      const user = users.find(u => u.id === userId);
      if (!user) return null;

      return { id: user.id, email: user.email, username: user.username, is_active: user.is_active, role: user.role };
    },

    logout: async () => {
      const token = localStorage.getItem('coderank_token');
      const demo = await api.isDemoMode();
      if (!demo && token) {
        try {
          await apiFetch('/auth/logout', { method: 'POST', auth: true });
        } catch (err) {
          // ignore
        }
      }
      localStorage.removeItem('coderank_token');
      return { message: 'Logged out successfully' };
    }
  },

  // Problem Catalog Operations
  problems: {
    list: async () => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          const data = await apiFetch('/problems');
          return data.map(mapProblemFromBackend);
        } catch (err) {
          // fallback to mock
        }
      }

      return JSON.parse(localStorage.getItem('coderank_problems'));
    },

    get: async (problemId) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          const data = await apiFetch(`/problems/${problemId}`);
          return mapProblemFromBackend(data);
        } catch (err) {
          // fallback to mock
        }
      }

      const problems = JSON.parse(localStorage.getItem('coderank_problems'));
      const problem = problems.find(p => p.id === problemId || p.slug === problemId);
      if (!problem) throw new Error('Problem not found');
      return problem;
    },

    search: async (q, difficulty, tag) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          const params = new URLSearchParams();
          if (q && q.trim()) params.append('q', q.trim());
          if (difficulty) params.append('difficulty', difficulty);
          if (tag) params.append('tag', tag);
          
          const queryString = params.toString();
          const url = `/problems/search${queryString ? '?' + queryString : ''}`;
          const data = await apiFetch(url);
          return Array.isArray(data) ? data.map(mapProblemFromBackend) : [];
        } catch (err) {
          // fallback
        }
      }

      const problems = JSON.parse(localStorage.getItem('coderank_problems'));
      return problems.filter(p => {
        if (difficulty && p.difficulty !== difficulty) return false;
        if (tag && !p.tags.some(t => t.toLowerCase() === tag.toLowerCase())) return false;
        if (q) {
          const query = q.toLowerCase();
          return p.title.toLowerCase().includes(query) || p.statement.toLowerCase().includes(query);
        }
        return true;
      });
    },

    create: async (payload) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          const backendPayload = mapProblemToBackend(payload);
          const data = await apiFetch('/problems', {
            method: 'POST',
            auth: true,
            body: backendPayload
          });
          return mapProblemFromBackend(data);
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock Create
      const problems = JSON.parse(localStorage.getItem('coderank_problems'));
      const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newProblem = {
        id: 'prob-' + Math.random().toString(36).substring(2, 9),
        slug,
        tags: payload.tags || ['General'],
        time_limit: payload.time_limit || 2,
        memory_limit: payload.memory_limit || 256,
        ...payload
      };
      problems.push(newProblem);
      localStorage.setItem('coderank_problems', JSON.stringify(problems));
      return newProblem;
    },

    update: async (problemId, payload) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          const backendPayload = {};
          if (payload.title) backendPayload.title = payload.title;
          if (payload.slug) backendPayload.slug = payload.slug;
          if (payload.statement) backendPayload.statement = payload.statement;
          if (payload.input_format) backendPayload.input_format = payload.input_format;
          if (payload.output_format) backendPayload.output_format = payload.output_format;
          if (payload.sample_input) backendPayload.sample_input = payload.sample_input;
          if (payload.sample_output) backendPayload.sample_output = payload.sample_output;
          if (payload.constraints) backendPayload.constraints = payload.constraints;
          if (payload.examples) backendPayload.examples = payload.examples;
          if (payload.difficulty) backendPayload.difficulty = payload.difficulty;
          if (payload.time_limit) backendPayload.time_limit_ms = payload.time_limit * 1000;
          if (payload.memory_limit) backendPayload.memory_limit_mb = payload.memory_limit;
          if (payload.tags) backendPayload.tags = payload.tags;
          
          const data = await apiFetch(`/problems/${problemId}`, {
            method: 'PUT',
            auth: true,
            body: backendPayload
          });
          return mapProblemFromBackend(data);
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock Update
      const problems = JSON.parse(localStorage.getItem('coderank_problems'));
      const idx = problems.findIndex(p => p.id === problemId);
      if (idx === -1) throw new Error('Problem not found');
      problems[idx] = { ...problems[idx], ...payload };
      localStorage.setItem('coderank_problems', JSON.stringify(problems));
      return problems[idx];
    },

    delete: async (problemId) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          await apiFetch(`/problems/${problemId}`, { method: 'DELETE', auth: true });
          return true;
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock Delete
      const problems = JSON.parse(localStorage.getItem('coderank_problems'));
      const filtered = problems.filter(p => p.id !== problemId);
      localStorage.setItem('coderank_problems', JSON.stringify(filtered));
      return true;
    }
  },

  // Language Service
  languages: {
    list: async () => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch('/languages', { method: 'GET', auth: true });
        } catch (err) {
          // fallback
        }
      }

      return JSON.parse(localStorage.getItem('coderank_languages'));
    }
  },

  // Test Case Management (Admin)
  testCases: {
    list: async (problemId) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch(`/problems/${problemId}/test-cases`, { method: 'GET', auth: true });
        } catch (err) {
          // fallback
        }
      }
      return [];
    },

    create: async (problemId, payload) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch(`/problems/${problemId}/test-cases`, {
            method: 'POST',
            auth: true,
            body: payload
          });
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }
      // Mock create
      return { id: 'tc-' + Math.random().toString(36).substring(2, 9), problem_id: problemId, ...payload };
    },

    delete: async (testCaseId) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          await apiFetch(`/test-cases/${testCaseId}`, { method: 'DELETE', auth: true });
          return true;
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }
      return true;
    }
  },

  // Submission Operations
  submissions: {
    execute: async (problemId, languageId, sourceCode, customInput) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch('/submissions/execute', {
            method: 'POST',
            auth: true,
            body: { problem_id: problemId, language_id: languageId, source_code: sourceCode, custom_input: customInput }
          });
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock Execute (Custom Input Run)
      await delay(400);
      const user = await api.auth.me();
      const submission = {
        id: 'sub-' + Math.random().toString(36).substring(2, 9),
        user_id: user ? user.id : 'anonymous',
        problem_id: problemId,
        language_id: languageId,
        source_code: sourceCode,
        custom_input: customInput,
        status: 'PENDING',
        runtime_ms: null,
        memory_kb: null,
        is_judge: false,
        created_at: new Date().toISOString()
      };

      const submissions = JSON.parse(localStorage.getItem('coderank_submissions'));
      submissions.push(submission);
      localStorage.setItem('coderank_submissions', JSON.stringify(submissions));

      // Trigger a simulated websocket loop asynchronously
      api.submissions._triggerMockJudger(submission.id, false);

      return submission;
    },

    judge: async (problemId, languageId, sourceCode) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch('/submissions/judge', {
            method: 'POST',
            auth: true,
            body: { problem_id: problemId, language_id: languageId, source_code: sourceCode }
          });
        } catch (err) {
          if (!err.message.includes('Failed to fetch')) throw err;
        }
      }

      // Offline Mock Judge (Formal Test Submit)
      await delay(400);
      const user = await api.auth.me();
      const submission = {
        id: 'sub-' + Math.random().toString(36).substring(2, 9),
        user_id: user ? user.id : 'anonymous',
        problem_id: problemId,
        language_id: languageId,
        source_code: sourceCode,
        custom_input: null,
        status: 'PENDING',
        runtime_ms: null,
        memory_kb: null,
        is_judge: true,
        created_at: new Date().toISOString()
      };

      const submissions = JSON.parse(localStorage.getItem('coderank_submissions'));
      submissions.push(submission);
      localStorage.setItem('coderank_submissions', JSON.stringify(submissions));

      // Trigger mock grading
      api.submissions._triggerMockJudger(submission.id, true);

      return submission;
    },

    history: async () => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch('/submissions/history', { method: 'GET', auth: true });
        } catch (err) {
          // fallback
        }
      }

      const user = await api.auth.me();
      if (!user) return [];
      const submissions = JSON.parse(localStorage.getItem('coderank_submissions'));
      return submissions.filter(s => s.user_id === user.id).reverse();
    },

    get: async (submissionId) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch(`/submissions/${submissionId}`, { method: 'GET', auth: true });
        } catch (err) {
          // fallback
        }
      }

      const submissions = JSON.parse(localStorage.getItem('coderank_submissions'));
      const sub = submissions.find(s => s.id === submissionId);
      if (!sub) throw new Error('Submission not found');
      return sub;
    },

    getResults: async (submissionId) => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          return await apiFetch(`/submissions/${submissionId}/results`, { method: 'GET', auth: true });
        } catch (err) {
          // fallback
        }
      }

      // Offline mock results detail
      const submissions = JSON.parse(localStorage.getItem('coderank_submissions'));
      const sub = submissions.find(s => s.id === submissionId);
      if (!sub) throw new Error('Submission not found');

      return {
        submission_id: sub.id,
        status: sub.status,
        runtime_ms: sub.runtime_ms,
        memory_kb: sub.memory_kb,
        execution_results: sub.execution_results || [],
        judge_case_results: sub.judge_case_results || []
      };
    },

    // INTERNAL MOCK GRADER ENGINE SIMULATION
    _triggerMockJudger: async (subId, isJudgeSubmit) => {
      // Step 1: Send 'PENDING' state
      submissionEmitter.emit(subId, { status: 'PENDING' });
      await delay(1200);

      // Step 2: Send 'RUNNING' state
      submissionEmitter.emit(subId, { status: 'RUNNING' });
      await delay(1500);

      // Step 3: Grade code based on content
      const submissions = JSON.parse(localStorage.getItem('coderank_submissions'));
      const subIndex = submissions.findIndex(s => s.id === subId);
      if (subIndex === -1) return;

      const sub = submissions[subIndex];
      const source = sub.source_code.toLowerCase();

      let status = 'ACCEPTED';
      let runtime = Math.floor(Math.random() * 80) + 15; // 15ms - 95ms
      let memory = Math.floor(Math.random() * 5000) + 1024; // 1MB - 6MB

      // Basic semantic grading heuristics for demonstration
      if (source.includes('timeout') || source.includes('while true') || source.includes('infinite')) {
        status = 'TIME_LIMIT_EXCEEDED';
        runtime = 2000;
      } else if (source.includes('error') || source.includes('exception') || source.includes('undefined')) {
        status = 'RUNTIME_ERROR';
      } else if (source.includes('wrong') || source.includes('bug') || source.includes('false')) {
        status = 'WRONG_ANSWER';
      } else if (source.includes('syntaxerror') || source.includes('compile') || source.includes('import invalid')) {
        status = 'COMPILATION_ERROR';
      }

      // Seed outputs
      let execution_results = [];
      let judge_case_results = [];

      if (!isJudgeSubmit) {
        // Custom Run
        execution_results = [{
          stdout: status === 'ACCEPTED' ? `SUCCESS Output: ${sub.custom_input || 'Executed fine'}` : null,
          stderr: status === 'RUNTIME_ERROR' ? 'Traceback (most recent call last):\n  File "solution.py", line 4, in <module>\n    ValueError: Invalid input parameter.' : (status === 'COMPILATION_ERROR' ? 'SyntaxError: invalid syntax at line 2' : null)
        }];
      } else {
        // Formal Judge
        const problem = SEED_PROBLEMS.find(p => p.id === sub.problem_id);
        const expected = problem ? problem.sample_output : '0 1';
        
        judge_case_results = [
          { expected_output: expected, actual_output: status === 'ACCEPTED' ? expected : 'Wrong Output Data', passed: status === 'ACCEPTED' },
          { expected_output: '1 2', actual_output: status === 'ACCEPTED' ? '1 2' : 'Null', passed: status === 'ACCEPTED' },
          { expected_output: '4 5', actual_output: status === 'ACCEPTED' ? '4 5' : 'Null', passed: status === 'ACCEPTED' }
        ];

        // Recalculate passed rate
        const failedAny = judge_case_results.some(c => !c.passed);
        if (failedAny && status === 'ACCEPTED') {
          status = 'WRONG_ANSWER';
        }
      }

      // Update LocalStorage database
      submissions[subIndex].status = status;
      submissions[subIndex].runtime_ms = runtime;
      submissions[subIndex].memory_kb = memory;
      submissions[subIndex].execution_results = execution_results;
      submissions[subIndex].judge_case_results = judge_case_results;
      localStorage.setItem('coderank_submissions', JSON.stringify(submissions));

      // Award points on mock profile if accepted and formal judge
      if (status === 'ACCEPTED' && isJudgeSubmit && sub.user_id !== 'anonymous') {
        const users = JSON.parse(localStorage.getItem('coderank_users'));
        const uIdx = users.findIndex(u => u.id === sub.user_id);
        if (uIdx !== -1) {
          const problem = SEED_PROBLEMS.find(p => p.id === sub.problem_id);
          const score = problem ? (problem.difficulty === 'HARD' ? 300 : problem.difficulty === 'MEDIUM' ? 150 : 100) : 100;
          
          // Only award if not solved before to avoid farming points
          const solvedBefore = submissions.some((s, idx) => s.user_id === sub.user_id && s.problem_id === sub.problem_id && s.status === 'ACCEPTED' && idx < subIndex);
          if (!solvedBefore) {
            users[uIdx].total_score = (users[uIdx].total_score || 0) + score;
            localStorage.setItem('coderank_users', JSON.stringify(users));

            // Sync leaderboard
            const leaderboard = JSON.parse(localStorage.getItem('coderank_leaderboard'));
            const userInLeaderboard = leaderboard.find(l => l.username === users[uIdx].username);
            if (userInLeaderboard) {
              userInLeaderboard.total_score = users[uIdx].total_score;
              userInLeaderboard.solved_count += 1;
            } else {
              leaderboard.push({
                username: users[uIdx].username,
                total_score: users[uIdx].total_score,
                solved_count: 1,
                rank: 99
              });
            }
            // Sort leaderboard
            leaderboard.sort((a, b) => b.total_score - a.total_score);
            leaderboard.forEach((l, idx) => { l.rank = idx + 1; });
            localStorage.setItem('coderank_leaderboard', JSON.stringify(leaderboard));
          }
        }
      }

      // Dispatch final results
      submissionEmitter.emit(subId, {
        status,
        runtime_ms: runtime,
        memory_kb: memory,
        execution_results,
        judge_case_results
      });
    }
  },

  // Leaderboard retrieval
  leaderboard: {
    list: async () => {
      const demo = await api.isDemoMode();
      if (!demo) {
        try {
          const data = await apiFetch('/leaderboard');
          return mapLeaderboardFromBackend(data);
        } catch (err) {
          // fallback
        }
      }

      return JSON.parse(localStorage.getItem('coderank_leaderboard'));
    }
  }
};
