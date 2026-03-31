import { createContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { fetchJson } from '../utils/fetchJson';

export const AuthContext = createContext();

const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return '';
  return String(baseUrl).trim().replace(/\/+$/, '');
};

const inferRenderBackendBaseUrl = () => {
  if (typeof window === 'undefined' || !window.location) return '';
  const host = window.location.hostname;
  const match = host.match(/^(.*?)-frontend(\.onrender\.com)$/);
  if (match) return `https://${match[1]}-backend${match[2]}`;
  return '';
};

const getSocketBaseUrl = () => {
  const configuredBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (configuredBase) return configuredBase;
  if (import.meta.env.DEV) return 'http://localhost:5000';
  const inferred = inferRenderBackendBaseUrl();
  return inferred || (typeof window !== 'undefined' ? window.location.origin : '');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [invitationEvents, setInvitationEvents] = useState([]);
  const [pendingGameStart, setPendingGameStart] = useState(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const pushInvitationEvent = useCallback((event) => {
    if (!event || !event.invitationId) return;
    setInvitationEvents((prev) => [event, ...prev].slice(0, 40));
  }, []);

  const syncNotification = useCallback((incoming) => {
    if (!incoming?.id) return;
    setNotifications((prev) => {
      const idx = prev.findIndex((item) => item.id === incoming.id);
      if (idx === -1) return [incoming, ...prev].slice(0, 100);
      const next = [...prev];
      next[idx] = { ...next[idx], ...incoming };
      return next;
    });
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      const data = await fetchJson('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch {
      // Keep app functional even if notifications endpoint fails.
    }
  }, [token]);

  const connectSocket = useCallback((jwtToken) => {
    if (!jwtToken) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(getSocketBaseUrl(), {
      auth: { token: jwtToken },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('notification:new', (payload) => {
      syncNotification(payload);
    });

    socket.on('notification:update', (payload) => {
      syncNotification(payload);
    });

    socket.on('invitation:response', (payload) => {
      pushInvitationEvent(payload);
    });

    socket.on('match:start', (payload) => {
      if (!payload?.matchId || !payload?.gameId) return;
      setPendingGameStart({
        invitationId: payload.invitationId,
        matchId: payload.matchId,
        gameId: payload.gameId,
        gameName: payload.gameName,
        friendName: payload.friendName,
        friendId: payload.friendId,
        startAt: payload.startAt,
        expiresAt: payload.expiresAt,
        receivedAt: new Date().toISOString()
      });
    });

    socketRef.current = socket;
  }, [pushInvitationEvent, syncNotification]);

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

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setInvitationEvents([]);
      setPendingGameStart(null);
      return;
    }

    connectSocket(token);
    void loadNotifications();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, connectSocket, loadNotifications]);

  const login = (jwtData, userData) => {
    localStorage.setItem('token', jwtData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(jwtData);
    setUser(userData);
    setPendingGameStart(null);
    setInvitationEvents([]);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setToken(null);
    setUser(null);
    setNotifications([]);
    setInvitationEvents([]);
    setPendingGameStart(null);
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

  const sendGameInvite = useCallback(async ({ friendUsername, gameId = 'crunch-match' }) => {
    const data = await fetchJson('/api/notifications/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ friendUsername, gameId })
    });
    return data;
  }, [token]);

  const respondToInvitation = useCallback(async (notificationId, action) => {
    const data = await fetchJson(`/api/notifications/${notificationId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    });

    if (data?.invitation?.id) {
      syncNotification(data.invitation);
    }

    if (action === 'accept' && data?.invitation?.gameId === 'crunch-match') {
      navigate('/game/crunch-match');
    }

    return data;
  }, [token, navigate, syncNotification]);

  const markNotificationRead = useCallback(async (notificationId) => {
    const data = await fetchJson(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (data?.notification?.id) {
      syncNotification(data.notification);
    }

    return data;
  }, [token, syncNotification]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!token) return { updatedCount: 0, notifications: [] };

    const data = await fetchJson('/api/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (Array.isArray(data?.notifications)) {
      data.notifications.forEach((item) => syncNotification(item));
    }

    return data;
  }, [token, syncNotification]);

  const validateMatchSession = useCallback(async ({ matchId, gameId }) => {
    if (!matchId) throw new Error('Match id is missing');
    const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : '';
    const data = await fetchJson(`/api/notifications/matches/${matchId}${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data?.match;
  }, [token]);

  const clearPendingGameStart = useCallback(() => {
    setPendingGameStart(null);
  }, []);

  const clearInvitationEvent = useCallback((invitationId) => {
    if (!invitationId) return;
    setInvitationEvents((prev) => prev.filter((event) => event.invitationId !== invitationId));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      updateProgress,
      loading,
      notifications,
      unreadNotificationsCount,
      invitationEvents,
      pendingGameStart,
      loadNotifications,
      sendGameInvite,
      respondToInvitation,
      markNotificationRead,
      markAllNotificationsRead,
      validateMatchSession,
      clearPendingGameStart,
      clearInvitationEvent
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
