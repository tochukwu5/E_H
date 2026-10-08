import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (body) => {
    const d = await post('/auth/login', body);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (body) => {
    const d = await post('/auth/register', { ...body, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    await post('/auth/logout').catch(() => {});
    setUser(null);
    qc.clear();
  }, [qc]);

  return <AuthCtx.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
