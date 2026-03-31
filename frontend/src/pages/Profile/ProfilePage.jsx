import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ProfilePage = () => {
  const { token, user } = useContext(AuthContext);
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

  if (!analytics) return <div style={{ color: 'var(--text-primary)', textAlign: 'center', marginTop: '90px' }}>Loading profile...</div>;

  return (
    <div className="container" style={{ padding: '20px' }}>
      <h2 className="text-gradient" style={{ marginBottom: '18px' }}>Profile</h2>
      <div className="glass-panel" style={{ padding: '20px', maxWidth: '700px' }}>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div><span style={{ color: 'var(--text-secondary)' }}>Name:</span> <strong>{user?.name || 'Player'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> <strong>{user?.email || 'NA'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Games Played:</span> <strong>{analytics.totalGames}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Win Ratio:</span> <strong>{analytics.winRatio.toFixed(1)}%</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Average Accuracy:</span> <strong>{analytics.avgAccuracy.toFixed(1)}%</strong></div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
