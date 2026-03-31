import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import { LogOut, LayoutDashboard, Gamepad2, User as UserIcon, Sun, Moon, BarChart3, Users, Trophy, Bell } from 'lucide-react';

const prettyTime = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Navbar = () => {
  const {
    user,
    logout,
    notifications,
    unreadNotificationsCount,
    respondToInvitation,
    markNotificationRead
  } = useContext(AuthContext);
  const [isLight, setIsLight] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'light') {
      setIsLight(true);
    }
  }, []);

  useEffect(() => {
    if (!isNotifOpen) return;

    const onDocClick = () => setIsNotifOpen(false);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [isNotifOpen]);

  const pendingInvites = notifications.filter((n) => n.type === 'game-invite' && n.status === 'pending');

  const toggleTheme = () => {
    if (isLight) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
      setIsLight(false);
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
      setIsLight(true);
    }
  };

  if (!user) return null;

  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    transition: 'color 0.3s',
    fontWeight: isActive ? 700 : 500
  });

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 30px',
      margin: '8px auto 16px',
      width: '96%',
      maxWidth: '1360px',
      background: 'var(--bg-panel)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '20px',
      border: '1px solid var(--border-light)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: '10px',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img
          src="/logo.png"
          alt="PuzzlePlay Arena logo"
          style={{ width: '40px', height: '40px', objectFit: 'contain' }}
        />
        <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.65rem' }}>PuzzlePlay Arena</h1>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <NavLink to="/dashboard" style={navLinkStyle}><LayoutDashboard size={18} /><span>Home</span></NavLink>
        <NavLink to="/games" style={navLinkStyle}><Gamepad2 size={18} /><span>Games</span></NavLink>
        <NavLink to="/analytics" style={navLinkStyle}><BarChart3 size={18} /><span>Analytics</span></NavLink>
        <NavLink to="/profile" style={navLinkStyle}><UserIcon size={18} /><span>Profile</span></NavLink>
        <NavLink to="/friends" style={navLinkStyle}><Users size={18} /><span>Friends</span></NavLink>
        <NavLink to="/leaderboard" style={navLinkStyle}><Trophy size={18} /><span>Leaderboard</span></NavLink>

        <div style={{ position: 'relative' }} onClick={(event) => event.stopPropagation()}>
          <button
            onClick={() => setIsNotifOpen((open) => !open)}
            className="btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              position: 'relative'
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-2px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'grid',
                placeItems: 'center',
                padding: '0 4px'
              }}>
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div style={{
              position: 'absolute',
              top: '52px',
              right: 0,
              width: 'min(560px, 92vw)',
              maxHeight: '70vh',
              overflowY: 'auto',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-panel)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.35)',
              padding: '12px',
              zIndex: 250
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1rem' }}>Notifications</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{notifications.length} total</span>
              </div>

              {notifications.length === 0 && (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-light)'
                }}>
                  No notifications yet.
                </div>
              )}

              {notifications.map((item) => {
                const isInvite = item.type === 'game-invite';
                const canRespond = isInvite && item.status === 'pending';
                const actorName = item.sender?.name || 'Friend';
                const statusLabel = item.status?.charAt(0).toUpperCase() + item.status?.slice(1);

                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: '12px',
                      padding: '12px',
                      marginBottom: '10px',
                      border: `1px solid ${item.read ? 'var(--border-light)' : 'rgba(0, 240, 255, 0.45)'}`,
                      background: item.read ? 'rgba(255,255,255,0.03)' : 'rgba(0, 240, 255, 0.08)'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '5px' }}>
                      {isInvite ? `${actorName} invited you` : `${actorName} responded to your invite`}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Game: {item.gameName}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.82rem' }}>
                      {prettyTime(item.respondedAt || item.createdAt)}
                    </div>

                    {canRespond ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-primary"
                          style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                          onClick={async () => {
                            await respondToInvitation(item.id, 'accept');
                            await markNotificationRead(item.id);
                            setIsNotifOpen(false);
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-outline"
                          style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                          onClick={async () => {
                            await respondToInvitation(item.id, 'reject');
                            await markNotificationRead(item.id);
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem'
                      }}>
                        {statusLabel}
                      </div>
                    )}
                  </div>
                );
              })}

              {pendingInvites.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Pending invites: {pendingInvites.length}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px', borderLeft: '1px solid var(--border-light)', paddingLeft: '14px' }}>
          <UserIcon size={20} />
          <span>{user.name}</span>
        </div>
        
        <button onClick={toggleTheme} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', border: 'none', background: 'transparent' }}>
          {isLight ? <Sun size={20} color="#eab308" /> : <Moon size={20} color="#60a5fa" />}
        </button>

        <button onClick={logout} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
