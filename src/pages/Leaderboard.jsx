import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trophy, Search, Star, Medal, User } from 'lucide-react';

const Leaderboard = () => {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await api.leaderboard.list();
      setBoard(data);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  // Filter leaderboard based on query
  const filteredBoard = board.filter(player => 
    player.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Divide into Podium (top 3) and remaining list
  const podiumPlayers = filteredBoard.slice(0, 3);
  const tablePlayers = filteredBoard.slice(3);

  // Helper to re-arrange podium visually: 2nd, 1st, 3rd
  const visualPodium = [];
  if (podiumPlayers[1]) visualPodium.push({ ...podiumPlayers[1], visualRank: 2 });
  if (podiumPlayers[0]) visualPodium.push({ ...podiumPlayers[0], visualRank: 1 });
  if (podiumPlayers[2]) visualPodium.push({ ...podiumPlayers[2], visualRank: 3 });

  return (
    <div className="leaderboard-container">
      {/* Header */}
      <div className="leaderboard-header">
        <Trophy size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
        <h2>Global Leaderboard</h2>
        <p>The hall of fame for CodeRank developers. Climb higher by tackling tougher challenges.</p>
      </div>

      {/* Visual Podium Showcase */}
      {loading ? (
        <div className="judge-loading-state" style={{ paddingBlock: '60px' }}>
          <div className="judge-loader-spinner"></div>
          <span>Loading leaderboard metrics...</span>
        </div>
      ) : (
        <>
          {podiumPlayers.length > 0 && (
            <div className="podium-showcase-grid">
              {visualPodium.map((player) => {
                const isFirst = player.visualRank === 1;
                const isSecond = player.visualRank === 2;
                const classRank = isFirst ? 'first' : (isSecond ? 'second' : 'third');
                
                return (
                  <div key={player.username} className={`glass-panel podium-card ${classRank}`}>
                    <div className="podium-badge flex-center">
                      <span className="podium-rank-text">{player.visualRank}</span>
                    </div>
                    <span className="podium-username">{player.username}</span>
                    <span className="podium-score">{player.total_score} pts</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-darker)', marginTop: '4px' }}>
                      {player.solved_count} Solves
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search Table Filters */}
          <div className="glass-panel leaderboard-filters-panel" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-darker)' }} />
              <input
                type="text"
                placeholder="Search players by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px', width: '100%', marginBottom: 0 }}
              />
            </div>
          </div>

          {/* Leaderboard Table List */}
          <div className="glass-panel leaderboard-list-table-panel">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Challenges Solved</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredBoard.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', paddingBlock: '40px', color: 'var(--text-darker)' }}>
                      No programmers matched your search.
                    </td>
                  </tr>
                ) : (
                  // Map all players to rows
                  filteredBoard.map((player, index) => {
                    const originalRank = player.rank || (index + 1);
                    return (
                      <tr key={player.username}>
                        <td>
                          {originalRank <= 3 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Medal size={16} style={{ color: originalRank === 1 ? '#facc15' : (originalRank === 2 ? '#cbd5e1' : '#f97316') }} />
                              <span className="rank-index">{originalRank}</span>
                            </div>
                          ) : (
                            <span className="rank-index" style={{ paddingLeft: '22px' }}>{originalRank}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar" style={{ width: '22px', height: '22px', border: '1px solid var(--border-glow)' }}>
                              <User size={10} />
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{player.username}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.88rem' }}><strong>{player.solved_count}</strong> solved</span>
                        </td>
                        <td className="leaderboard-score-cell" style={{ textAlign: 'right' }}>
                          {player.total_score} pts
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
