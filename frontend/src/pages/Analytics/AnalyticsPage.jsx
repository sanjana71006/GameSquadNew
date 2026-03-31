import { useEffect, useState, useContext } from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { AuthContext } from '../../context/AuthContext';
import { GAMES } from '../../constants/games';

const AnalyticsPage = () => {
  const { token } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setAnalytics(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchAnalytics();
  }, [token]);

  if (!analytics) return <div style={{ color: 'var(--text-primary)', textAlign: 'center', marginTop: '90px' }}>Loading analytics...</div>;

  const chartData = {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [analytics.wins, analytics.losses],
      backgroundColor: ['rgba(57, 255, 20, 0.85)', 'rgba(255, 51, 102, 0.85)'],
      borderColor: ['var(--bg-dark)', 'var(--bg-dark)'],
      borderWidth: 2
    }]
  };

  return (
    <div className="container" style={{ padding: '20px' }}>
      <h2 className="text-gradient" style={{ marginBottom: '18px' }}>Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ marginBottom: '16px' }}>Progress Roadmap</h4>
          <div style={{ display: 'grid', gap: '10px' }}>
            {GAMES.map((g) => (
              <div key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{g.name}</span>
                  <span>Lvl {(analytics.progress[g.id] || 1)}/5</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                  <div style={{ width: `${((analytics.progress[g.id] || 1) / 5) * 100}%`, height: '100%', background: g.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '14px' }}>Win / Loss</h4>
          {analytics.totalGames > 0 ? (
            <div style={{ width: '220px', margin: '0 auto' }}>
              <Pie data={chartData} options={{ plugins: { legend: { position: 'bottom', labels: { color: 'white' } } } }} />
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No games played yet.</p>
          )}
          <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Avg Accuracy: <strong style={{ color: 'var(--text-primary)' }}>{analytics.avgAccuracy.toFixed(1)}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
