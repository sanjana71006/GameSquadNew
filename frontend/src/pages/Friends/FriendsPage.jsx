import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';

const FriendsPage = () => {
  const { token } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const loadFriends = async () => {
    try {
      const res = await fetch('/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load friends');
      setFriends(data.friends || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    void loadFriends();
  }, []);

  const addFriend = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not add friend');
      setEmail('');
      await loadFriends();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not remove friend');
      await loadFriends();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container" style={{ padding: '20px' }}>
      <h2 className="text-gradient" style={{ marginBottom: '18px' }}>Friends</h2>
      <div className="glass-panel" style={{ padding: '18px', marginBottom: '16px', maxWidth: '700px' }}>
        <form onSubmit={addFriend} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Friend email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button className="btn-primary" type="submit">Add Friend</button>
        </form>
        {error && <p style={{ color: 'var(--accent-red)', marginTop: '10px' }}>{error}</p>}
      </div>

      <div style={{ display: 'grid', gap: '12px', maxWidth: '700px' }}>
        {friends.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No friends added yet.</p>}
        {friends.map((friend) => (
          <div key={friend.id} className="glass-panel" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{friend.name}</strong>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{friend.email}</p>
            </div>
            <button className="btn-outline" onClick={() => removeFriend(friend.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsPage;
