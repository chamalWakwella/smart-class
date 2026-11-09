import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getRole, getToken, setSession, setUnauthorizedHandler, type SessionRole } from '../api';
import type { AppConfig } from '../types';

type AppState = {
  config: AppConfig | null;
  ready: boolean;
  error: string | null;
  role: SessionRole | null;
  exitTo: string | null;
  loginAdmin: (password: string) => Promise<void>;
  loginStudent: (studentId: string, guardianPhone: string) => Promise<void>;
  logout: () => void;
  clearExit: () => void;
  reload: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [role, setRole] = useState<SessionRole | null>(() => getRole());
  const [exitTo, setExitTo] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    const next = await api<AppConfig>('/api/config');
    const savedRole = getRole();
    if (savedRole === 'admin' && next.authRequired && getToken()) {
      try {
        await api('/api/session');
      } catch {
        setSession(null, null);
        setRole(null);
      }
    }
    if (savedRole === 'student' && getToken()) {
      try {
        await api('/api/me');
      } catch {
        setSession(null, null);
        setRole(null);
      }
    }
    setConfig(next);
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null, null);
      setRole(null);
    });
    let cancelled = false;
    load()
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The class server is not running.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginAdmin = async (password: string) => {
    const data = await api<{ token: string; role: SessionRole }>('/api/session/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setSession(data.token, 'admin');
    setRole('admin');
  };

  const loginStudent = async (studentId: string, guardianPhone: string) => {
    const data = await api<{ token: string }>('/api/session/student', {
      method: 'POST',
      body: JSON.stringify({ studentId, guardianPhone }),
    });
    setSession(data.token, 'student');
    setRole('student');
  };

const logout = useCallback(() => {
    setExitTo('/');
    setSession(null, null);
    setRole(null);
  }, []);

  const clearExit = useCallback(() => setExitTo(null), []);

  const reload = async () => {
    setReady(false);
    try {
      await load();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The class server is not running.');
    } finally {
      setReady(true);
    }
  };

  return (
    <AppContext.Provider value={{ config, ready, error, role, exitTo, loginAdmin, loginStudent, logout, clearExit, reload }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is missing.');
  return value;
}

export function useConfig() {
  const { config } = useApp();
  if (!config) throw new Error('Class settings are not loaded.');
  return config;
}
