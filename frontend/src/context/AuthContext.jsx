import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // If we have a token but no user, we could fetch user from an endpoint.
    // For now, if we don't have user object but have token, we just clear it.
    // Ideally, there should be a /me endpoint or token decode.
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        logout();
      }
    }
    setLoading(false);
  }, [token]);

  const login = (jwtData, userData) => {
    localStorage.setItem('token', jwtData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(jwtData);
    setUser(userData);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const updateProgress = (progress) => {
    if (!progress) return;
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, progress: { ...prev.progress, ...progress } };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateProgress, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
