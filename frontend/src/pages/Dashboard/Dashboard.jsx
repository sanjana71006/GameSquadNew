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

  const recommendedGames = (() => {
    const breakdownEntries = Object.entries(analytics.gameBreakdown || {});
    const active = breakdownEntries
      .filter(([gameId]) => Boolean(gameMap[gameId]))
      .sort((a, b) => (b[1]?.played || 0) - (a[1]?.played || 0))
      .map(([gameId]) => gameMap[gameId]);

    const seen = new Set();
    const merged = [...active, ...GAMES].filter((g) => {
      if (!g || seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });

    return merged.slice(0, 3);
  })();

  const toGameName = (gameId) => gameMap[gameId]?.name || gameId;

  return (
    <div className="container" style={{ padding: '20px' }}>
      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '32px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.9fr',
          gap: '20px',
          marginBottom: '22px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(51, 65, 85, 0.85) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          borderRadius: '16px',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div>
          <h2 style={{ 
            marginBottom: '8px', 
            color: '#ffffff', 
            textShadow: '0 3px 16px rgba(0,0,0,0.6)',
            fontSize: 'clamp(1.8rem, 5vw, 2.4rem)',
            fontWeight: '700'
          }}>Welcome, {user?.name || 'Player'}</h2>
          <p style={{ 
            color: '#e2e8f0', 
            marginBottom: '18px', 
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            fontSize: '1.05rem',
            fontWeight: '500'
          }}>
            {homeData.agenda?.title || 'PuzzlePlay Arena Mission'}
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            {agendaPoints.map((point, idx) => (
              <div key={`agenda-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Brain size={18} color="#22d3ee" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ 
                  color: '#e2e8f0', 
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  lineHeight: '1.4',
                  fontSize: '0.95rem'
                }}>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>
          <div className="glass-panel" style={{ 
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(34, 211, 238, 0.1))',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '12px'
          }}>
            <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Win Ratio</p>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#22d3ee', fontWeight: '700', textShadow: '0 2px 8px rgba(34, 211, 238, 0.3)' }}>{winRatio}%</h3>
          </div>
          <div className="glass-panel" style={{ 
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.1))',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '12px'
          }}>
            <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Games Played</p>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#a855f7', fontWeight: '700', textShadow: '0 2px 8px rgba(168, 85, 247, 0.3)' }}>{analytics.totalGames}</h3>
          </div>
          <div className="glass-panel" style={{ 
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.1))',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '12px'
          }}>
            <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Accuracy</p>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#22c55e', fontWeight: '700', textShadow: '0 2px 8px rgba(34, 197, 94, 0.3)' }}>{analytics.avgAccuracy.toFixed(1)}%</h3>
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
          {recommendedGames.map((game) => {
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
