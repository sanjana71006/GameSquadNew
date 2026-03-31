import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { GAMES } from '../../constants/games';
import { SFX } from '../../utils/sounds';

const GamesPage = () => {
  const { token } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setAnalytics(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchAnalytics();
  }, [token]);

  if (!analytics) return <div style={{ color: 'var(--text-primary)', textAlign: 'center', marginTop: '90px' }}>Loading games...</div>;

  return (
    <div className="container" style={{ padding: '20px' }}>
      <h2 className="text-gradient" style={{ marginBottom: '18px' }}>Game Arena</h2>
      <div style={{ display: 'grid', gap: '16px' }}>
        {GAMES.map((game, i) => {
          const currentLevel = analytics.progress?.[game.id] || 1;
          return (
            <motion.div
              key={game.id}
              className="glass-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{ padding: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${game.color}` }}
            >
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: game.color }}>{game.name}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 10px 0', fontSize: '0.92rem' }}>{game.desc}</p>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.82rem' }}>
                  Current Level: {currentLevel}/5
                </span>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  SFX.gameStart();
                  navigate(`/game/${game.id}`);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={16} /> Play
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default GamesPage;
