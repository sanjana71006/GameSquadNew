import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Crown, Medal, Trophy, Flame } from 'lucide-react';

const prettyGameName = (gameId) => {
  return gameId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const rankBadgeColor = (rank) => {
  if (rank === 1) return 'linear-gradient(135deg, #f59e0b, #f97316)';
  if (rank === 2) return 'linear-gradient(135deg, #94a3b8, #64748b)';
  if (rank === 3) return 'linear-gradient(135deg, #d97706, #a16207)';
  return 'linear-gradient(135deg, #2563eb, #0ea5e9)';
};

const LeaderboardPage = () => {
  const { token } = useContext(AuthContext);
  const [board, setBoard] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setBoard(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchLeaderboard();
  }, [token]);

  if (!board) return <div style={{ color: 'var(--text-primary)', textAlign: 'center', marginTop: '90px' }}>Loading leaderboard...</div>;

  const topThree = (board.overall || []).slice(0, 3);
  const remainingOverall = (board.overall || []).slice(3);

  return (
    <div className="container" style={{ padding: '20px' }}>
      <div className="glass-panel" style={{ padding: '22px', marginBottom: '20px', background: 'linear-gradient(120deg, rgba(30,58,138,0.22), rgba(14,165,233,0.14))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h2 style={{ marginBottom: '4px', color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Leaderboard</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>Track top performers across all puzzle games.</p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#ffffff', padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', textShadow: '0 1px 8px rgba(0,0,0,0.35)' }}>
            <Trophy size={18} color="#f59e0b" />
            <strong>{board.overall?.length || 0}</strong>
            <span>Ranked Players</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '18px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{ marginBottom: '12px' }}>Top 3 Champions</h4>
          {topThree.length === 0 && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No leaderboard data yet.</p>}

          <div style={{ display: 'grid', gap: '12px' }}>
            {topThree.map((item, idx) => {
              const rank = idx + 1;
              return (
                <div key={item.userId} style={{
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr auto',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    background: rankBadgeColor(rank)
                  }}>
                    {rank}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '1rem' }}>{item.name}</strong>
                      {rank === 1 && <Crown size={16} color="#fbbf24" />}
                      {rank === 2 && <Medal size={16} color="#cbd5e1" />}
                      {rank === 3 && <Medal size={16} color="#d97706" />}
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.wins} wins</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total Score</div>
                    <strong style={{ fontSize: '1.05rem' }}>{item.totalScore}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{ marginBottom: '12px' }}>Overall Ranking</h4>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '286px', overflowY: 'auto', paddingRight: '4px' }}>
            {remainingOverall.map((item, idx) => {
              const rank = idx + 4;
              return (
                <div key={item.userId} style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr auto',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.035)'
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>#{rank}</span>
                  <span>{item.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.totalScore} pts</span>
                </div>
              );
            })}
            {remainingOverall.length === 0 && topThree.length > 0 && (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Only top champions are available right now.</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {Object.entries(board.byGame || {}).map(([gameId, rows]) => (
          <div key={gameId} className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0 }}>{prettyGameName(gameId)}</h4>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Flame size={14} color="#f97316" />
                Top 5 Scores
              </span>
            </div>

            <div style={{ display: 'grid', gap: '7px' }}>
              {rows.slice(0, 5).map((row, idx) => (
                <div key={`${gameId}-${row.userId}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '42px 1fr 150px',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '9px 10px',
                  borderRadius: '10px',
                  background: idx === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.035)',
                  border: idx === 0 ? '1px solid rgba(34,197,94,0.35)' : '1px solid transparent'
                }}>
                  <strong style={{ color: idx === 0 ? '#4ade80' : 'var(--text-secondary)' }}>#{idx + 1}</strong>
                  <span>{row.name}</span>
                  <span style={{ textAlign: 'right' }}>Best: <strong>{row.bestScore}</strong></span>
                </div>
              ))}
              {rows.length === 0 && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No scores yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPage;
