import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Flame, History, Play, Target } from 'lucide-react';
import { SFX } from '../../utils/sounds';
import { GAMES } from '../../constants/games';

const Dashboard = () => {
  const { token, user } = useContext(AuthContext);
  const [homeData, setHomeData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const [homeRes, analyticsRes] = await Promise.all([
          fetch('/api/home/insights', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/analytics', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const [homeJson, analyticsJson] = await Promise.all([
          homeRes.json(),
          analyticsRes.json()
        ]);

        setHomeData(homeJson);
        setAnalytics(analyticsJson);
      } catch (err) {
        console.error(err);
      }
    };

    fetchHome();
  }, [token]);

  if (!homeData || !analytics) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Loading Home...</div>;
  }

  const gameMap = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  const winRatio = analytics.winRatio.toFixed(1);
  const agendaPoints = homeData.agenda?.points || [];
  const trending = homeData.trending || [];
  const recent = homeData.recent || [];

  const toGameName = (gameId) => gameMap[gameId]?.name || gameId;

  return (
    <div className="container" style={{ padding: '20px' }}>
      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.9fr',
          gap: '16px',
          marginBottom: '22px',
          background: 'linear-gradient(120deg, var(--surface-strong), var(--surface-soft))'
        }}
      >
        <div>
          <h2 style={{ marginBottom: '6px', color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>Welcome, {user?.name || 'Player'}</h2>
          <p style={{ color: 'rgba(255,255,255,0.92)', marginBottom: '14px', textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>
            {homeData.agenda?.title || 'PuzzlePlay Arena Mission'}
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            {agendaPoints.map((point, idx) => (
              <div key={`agenda-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Brain size={16} color="#22d3ee" style={{ marginTop: '2px' }} />
                <span style={{ color: '#ffffff', textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px', alignContent: 'start' }}>
          <div className="glass-panel" style={{ padding: '14px' }}>
            <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Win Ratio</p>
            <h3 style={{ margin: 0, fontSize: '1.7rem' }}>{winRatio}%</h3>
          </div>
          <div className="glass-panel" style={{ padding: '14px' }}>
            <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Games Played</p>
            <h3 style={{ margin: 0, fontSize: '1.7rem' }}>{analytics.totalGames}</h3>
          </div>
          <div className="glass-panel" style={{ padding: '14px' }}>
            <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Average Accuracy</p>
            <h3 style={{ margin: 0, fontSize: '1.7rem' }}>{analytics.avgAccuracy.toFixed(1)}%</h3>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        <motion.div className="glass-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Flame size={18} color="#fb923c" />
            <h3 style={{ margin: 0 }}>Trending Games</h3>
          </div>

          <div style={{ display: 'grid', gap: '9px' }}>
            {trending.map((item, idx) => {
              const game = gameMap[item.gameId];
              return (
                <div
                  key={`trend-${item.gameId}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '34px 1fr auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: idx === 0 ? 'rgba(251,146,60,0.2)' : 'var(--surface-soft)'
                  }}
                >
                  <strong style={{ color: idx === 0 ? '#fb923c' : 'var(--text-secondary)' }}>#{idx + 1}</strong>
                  <span>{toGameName(item.gameId)}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.totalPlays} plays</span>
                </div>
              );
            })}
            {trending.length === 0 && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No trend data yet.</p>}
          </div>
        </motion.div>

        <motion.div className="glass-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <History size={18} color="#60a5fa" />
            <h3 style={{ margin: 0 }}>Recently Played</h3>
          </div>

          <div style={{ display: 'grid', gap: '9px' }}>
            {recent.map((item) => {
              const game = gameMap[item.gameId];
              return (
                <div
                  key={`recent-${item.gameId}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'var(--surface-soft)'
                  }}
                >
                  <div>
                    <strong>{game?.name || item.gameId}</strong>
                    <p style={{ margin: '3px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                      Played {item.playCount} time{item.playCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    className="btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                    onClick={() => {
                      SFX.gameStart();
                      navigate(`/game/${item.gameId}`);
                    }}
                  >
                    <Play size={14} /> Play
                  </button>
                </div>
              );
            })}
            {recent.length === 0 && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Play games to build your personal history.</p>}
          </div>
        </motion.div>
      </div>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Target size={18} color="#22d3ee" />
          <h3 style={{ margin: 0 }}>Recommended Next Games</h3>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {GAMES.slice(0, 3).map((game) => {
            const currentLevel = analytics.progress?.[game.id] || 1;
            return (
              <motion.div
                key={game.id}
                className="glass-panel"
                whileHover={{ scale: 1.01 }}
                style={{
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderLeft: `4px solid ${game.color}`
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: game.color }}>{game.name}</h4>
                  <p style={{ margin: '0 0 7px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{game.desc}</p>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Unlocked Level: {currentLevel}/5</span>
                </div>
                <button
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    SFX.gameStart();
                    navigate(`/game/${game.id}`);
                  }}
                >
                  <Play size={14} /> Play
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
