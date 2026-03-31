import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import { LogOut, LayoutDashboard, Gamepad2, User as UserIcon, Sun, Moon, BarChart3, Users, Trophy } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'light') {
      setIsLight(true);
    }
  }, []);

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
      maxWidth: '1280px',
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
          style={{ width: '34px', height: '34px', objectFit: 'contain' }}
        />
        <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>PuzzlePlay Arena</h1>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <NavLink to="/dashboard" style={navLinkStyle}><LayoutDashboard size={18} /><span>Home</span></NavLink>
        <NavLink to="/games" style={navLinkStyle}><Gamepad2 size={18} /><span>Games</span></NavLink>
        <NavLink to="/analytics" style={navLinkStyle}><BarChart3 size={18} /><span>Analytics</span></NavLink>
        <NavLink to="/profile" style={navLinkStyle}><UserIcon size={18} /><span>Profile</span></NavLink>
        <NavLink to="/friends" style={navLinkStyle}><Users size={18} /><span>Friends</span></NavLink>
        <NavLink to="/leaderboard" style={navLinkStyle}><Trophy size={18} /><span>Leaderboard</span></NavLink>

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
