import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { User, UserRole } from '@/types/jira';
import { apiRequest, getToken, setToken } from '@/lib/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  hasRole: (roles: UserRole[]) => boolean;
  canEditIssue: (assigneeId: string | null, reporterId: string) => boolean;
  canManageProject: () => boolean;
  canManageSprints: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const USER_KEY = 'jira_current_user';

type AuthResponse = {
  success: boolean;
  token: string;
  user: User;
  error?: string;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = getToken();
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const user = await apiRequest<User>('/auth/me/');
        setCurrentUser(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem(USER_KEY);
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const resp = await apiRequest<AuthResponse>('/auth/login/', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      setToken(resp.token);
      setCurrentUser(resp.user);
      localStorage.setItem(USER_KEY, JSON.stringify(resp.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Invalid email or password' };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const resp = await apiRequest<AuthResponse>('/auth/register/', {
        method: 'POST',
        body: { name, email, password },
        auth: false,
      });
      setToken(resp.token);
      setCurrentUser(resp.user);
      localStorage.setItem(USER_KEY, JSON.stringify(resp.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout/', { method: 'POST' });
    } catch {
      // Ignore logout request failures and clear client auth anyway.
    }
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      const result = await apiRequest<{ success: boolean; message: string }>('/auth/forgot-password/', {
        method: 'POST',
        body: { email },
        auth: false,
      });
      return result;
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Request failed' };
    }
  }, []);

  const hasRole = useCallback((roles: UserRole[]) => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  }, [currentUser]);

  const canEditIssue = useCallback((assigneeId: string | null, reporterId: string) => {
    if (!currentUser) return false;
    if (['admin', 'project_manager'].includes(currentUser.role)) return true;
    if (currentUser.role === 'developer') {
      return currentUser.id === assigneeId || currentUser.id === reporterId;
    }
    return false;
  }, [currentUser]);

  const canManageProject = useCallback(() => hasRole(['admin']), [hasRole]);
  const canManageSprints = useCallback(() => hasRole(['admin', 'project_manager']), [hasRole]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isInitializing,
        login,
        register,
        logout,
        forgotPassword,
        hasRole,
        canEditIssue,
        canManageProject,
        canManageSprints,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
