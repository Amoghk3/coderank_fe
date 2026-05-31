import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, Award, Zap, Shield, Cpu, Flame, ChevronRight } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-container-wrapper">
      {/* Hero Section */}
      <section className="hero-container">
        <div className="hero-content">
          <div className="hero-tagline">
            <Flame size={14} />
            <span>Next-Generation Sandbox Platform</span>
          </div>
          
          <h1 className="hero-title">
            Code.<br />
            Compile.<br />
            <span className="text-gradient">Rank.</span>
          </h1>
          
          <p className="hero-desc">
            CodeRank is a premium competitive programming workspace designed for elite developers. Benchmark your execution speeds, compile inside isolated docker containers, and climb the leaderboard.
          </p>
          
          <div className="hero-buttons">
            <Link to="/problems" className="btn btn-primary">
              <span>Solve Challenges</span>
              <ChevronRight size={16} />
            </Link>
            {!user && (
              <Link to="/auth" className="btn btn-secondary">
                Join Platform
              </Link>
            )}
          </div>
        </div>

        {/* Visual Showcase Panel */}
        <div className="hero-visual-wrapper">
          <div className="glass-panel floating-code-panel">
            <div className="panel-header">
              <div className="window-dots">
                <span className="window-dot red"></span>
                <span className="window-dot yellow"></span>
                <span className="window-dot green"></span>
              </div>
              <span className="panel-title">two_sum.py — CodeRank IDE</span>
            </div>
            
            <div className="panel-body-code">
              <p><span className="code-comment"># Optimized Two Sum Algorithm</span></p>
              <p><span className="code-keyword">def</span> <span className="code-func">two_sum</span>(nums: list[int], target: int) -&gt; list[int]:</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;seen = &#123;&#125;</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;<span className="code-keyword">for</span> idx, num <span className="code-keyword">in</span> <span className="code-func">enumerate</span>(nums):</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;complement = target - num</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="code-keyword">if</span> complement <span className="code-keyword">in</span> seen:</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="code-keyword">return</span> [seen[complement], idx]</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;seen[num] = idx</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;<span className="code-keyword">return</span> []</p>
              <br />
              <p><span className="code-comment"># Submitting to Celery cluster...</span></p>
              <p><span className="code-keyword">print</span>(<span className="code-func">two_sum</span>([<span className="code-str">2, 7, 11, 15</span>], <span className="code-str">9</span>)) <span className="code-comment"># [0, 1]</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats Grid */}
      <section className="home-features-section">
        <span className="section-label">Performance Metrics</span>
        <h2 className="section-title">Engineered for Scalability</h2>
        
        <div className="grid-auto">
          {/* Feature 1 */}
          <div className="glass-panel feature-card">
            <div className="feature-icon-box flex-center">
              <Cpu size={22} />
            </div>
            <h3>Isolated Sandbox</h3>
            <p>Your code compiles inside sandboxed Docker containers, protected by strict resource boundaries, memory caps, and process isolation.</p>
          </div>
          
          {/* Feature 2 */}
          <div className="glass-panel feature-card">
            <div className="feature-icon-box flex-center">
              <Zap size={22} />
            </div>
            <h3>Real-Time Verdicts</h3>
            <p>Integrated Celery task queues route jobs instantly. WebSockets feed grading processes directly to your console in real time.</p>
          </div>
          
          {/* Feature 3 */}
          <div className="glass-panel feature-card">
            <div className="feature-icon-box flex-center">
              <Award size={22} />
            </div>
            <h3>Competitive Ranks</h3>
            <p>Score points upon passing all test cases. Race against the clock and rival programmers to lock down top ranks.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
