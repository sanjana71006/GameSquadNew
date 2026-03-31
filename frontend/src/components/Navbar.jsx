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
    markNotificationRead,
    markAllNotificationsRead
  } = useContext(AuthContext);
  const [isLight, setIsLight] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 900 : false);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'light') {
      setIsLight(true);
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isNotifOpen) return;

    const onDocClick = () => setIsNotifOpen(false);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [isNotifOpen]);

  useEffect(() => {
    if (!isNotifOpen || unreadNotificationsCount === 0) return;
    const timerId = setTimeout(() => {
      void markAllNotificationsRead();
    }, 900);

    return () => clearTimeout(timerId);
  }, [isNotifOpen, unreadNotificationsCount, markAllNotificationsRead]);

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
    justifyContent: 'center',
    gap: isMobile ? '0' : '7px',
    transition: 'color 0.3s',
    fontWeight: isActive ? 700 : 500,
    width: isMobile ? '34px' : 'auto',
    height: isMobile ? '34px' : 'auto',
    borderRadius: isMobile ? '10px' : '0',
    background: isMobile ? (isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent') : 'transparent'
  });

  const navLinks = (
    <div
      style={{
        display: 'flex',
        gap: isMobile ? '4px' : '16px',
        alignItems: 'center',
        flexWrap: 'nowrap',
        justifyContent: isMobile ? 'space-between' : 'center',
        marginTop: isMobile ? '8px' : '0',
        width: isMobile ? '100%' : 'auto',
        overflowX: isMobile ? 'auto' : 'visible',
        paddingBottom: isMobile ? '2px' : 0
      }}
    >
      <NavLink to="/dashboard" style={navLinkStyle} title="Home" aria-label="Home"><LayoutDashboard size={18} />{!isMobile && <span>Home</span>}</NavLink>
      <NavLink to="/games" style={navLinkStyle} title="Games" aria-label="Games"><Gamepad2 size={18} />{!isMobile && <span>Games</span>}</NavLink>
      <NavLink to="/analytics" style={navLinkStyle} title="Analytics" aria-label="Analytics"><BarChart3 size={18} />{!isMobile && <span>Analytics</span>}</NavLink>
      <NavLink to="/profile" style={navLinkStyle} title="Profile" aria-label="Profile"><UserIcon size={18} />{!isMobile && <span>Profile</span>}</NavLink>
      <NavLink to="/friends" style={navLinkStyle} title="Friends" aria-label="Friends"><Users size={18} />{!isMobile && <span>Friends</span>}</NavLink>
      <NavLink to="/leaderboard" style={navLinkStyle} title="Leaderboard" aria-label="Leaderboard"><Trophy size={18} />{!isMobile && <span>Leaderboard</span>}</NavLink>
      {isMobile && (
        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px', borderLeft: '1px solid var(--border-light)', paddingLeft: '8px', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
          <UserIcon size={15} />
          <span>{user.name}</span>
        </div>
      )}
    </div>
  );

  const actionControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', flexShrink: 0 }}>
      <div style={{ position: 'relative' }} onClick={(event) => event.stopPropagation()}>
        <button
          onClick={() => setIsNotifOpen((open) => !open)}
          className="btn-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '7px' : '9px',
            width: isMobile ? '36px' : '42px',
            height: isMobile ? '36px' : '42px',
            borderRadius: '50%',
            position: 'relative'
          }}
          aria-label="Notifications"
        >
          <Bell size={isMobile ? 16 : 18} />
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
            top: isMobile ? '44px' : '52px',
            right: 0,
            width: isMobile ? 'min(92vw, 380px)' : 'min(560px, 92vw)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
              <strong style={{ fontSize: '1rem' }}>Notifications</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {unreadNotificationsCount > 0 && (
                  <button
                    className="btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                    onClick={async () => {
                      await markAllNotificationsRead();
                    }}
                  >
                    Mark all as read
                  </button>
                )}
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{notifications.length} total</span>
              </div>
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                      {!item.read && (
                        <button
                          className="btn-outline"
                          style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                          onClick={async () => {
                            await markNotificationRead(item.id);
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                      {!item.read && (
                        <button
                          className="btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          onClick={async () => {
                            await markNotificationRead(item.id);
                          }}
                        >
                          Mark as read
                        </button>
                      )}
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

      {!isMobile && (
        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px', borderLeft: '1px solid var(--border-light)', paddingLeft: '14px' }}>
          <UserIcon size={20} />
          <span>{user.name}</span>
        </div>
      )}

      <button onClick={toggleTheme} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '7px' : '8px', borderRadius: '50%', border: 'none', background: 'transparent', width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px' }}>
        {isLight ? <Sun size={isMobile ? 18 : 20} color="#eab308" /> : <Moon size={isMobile ? 18 : 20} color="#60a5fa" />}
      </button>

      <button onClick={logout} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0' : '8px', padding: isMobile ? '8px' : '8px 16px', width: isMobile ? '36px' : 'auto', height: isMobile ? '36px' : 'auto', justifyContent: 'center' }}>
        <LogOut size={16} />
        {!isMobile && <span>Logout</span>}
      </button>
    </div>
  );

  return (
    <nav style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      padding: isMobile ? '10px 12px' : '15px 30px',
      margin: isMobile ? '8px auto 12px' : '8px auto 16px',
      width: isMobile ? '98%' : '96%',
      maxWidth: '1360px',
      background: 'var(--bg-panel)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: isMobile ? '14px' : '20px',
      border: '1px solid var(--border-light)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: '10px',
      zIndex: 100
    }}>
      {isMobile ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <img
                src="/logo.png"
                alt="PuzzlePlay Arena logo"
                style={{ width: '30px', height: '30px', objectFit: 'contain' }}
              />
              <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                PuzzlePlay
              </h1>
            </div>
            {actionControls}
          </div>
          {navLinks}
        </>
      ) : (
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
            alignItems: 'center',
            gap: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <img
              src="/logo.png"
              alt="PuzzlePlay Arena logo"
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            />
            <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.65rem', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              PuzzlePlay Arena
            </h1>
          </div>
          <div style={{ minWidth: 0, overflowX: 'auto' }}>
            {navLinks}
          </div>
          {actionControls}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
