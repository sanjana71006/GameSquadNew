import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/AuthContext';
import { useContext, useEffect } from 'react';

// Placeholders for Pages
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import IntroVideo from './pages/Auth/IntroVideo';
import Dashboard from './pages/Dashboard/Dashboard';
import GameRunner from './pages/Games/GameRunner'; // Wrapper for games
import GamesPage from './pages/Games/GamesPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import FriendsPage from './pages/Friends/FriendsPage';
import LeaderboardPage from './pages/Leaderboard/LeaderboardPage';
import Navbar from './components/Navbar';
import { SFX } from './utils/sounds';

const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" replace />;
};

const PrivateLayout = () => (
  <>
    <Navbar />
    <Outlet />
  </>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
    }
  }, []);

  useEffect(() => {
    const onGlobalClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const clickable = target.closest('button, a, [role="button"]');
      if (clickable) {
        SFX.buttonClick();
      }
    };

    document.addEventListener('click', onGlobalClick, true);
    return () => document.removeEventListener('click', onGlobalClick, true);
  }, []);

  const isFullBleedRoute = ['/', '/login', '/signup', '/auth'].includes(location.pathname);

  return (
    <div className="app-container">
      <main className={`main-content ${isFullBleedRoute ? 'full-bleed' : ''}`}>
        <Routes>
          <Route path="/" element={<IntroVideo />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<PrivateRoute><PrivateLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/game/:gameId" element={<GameRunner />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
