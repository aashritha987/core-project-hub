import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, UserRole } from '@/types/jira';
import { users } from '@/data/mockData';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  forgotPassword: (email: string) => { success: boolean; message: string };
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jira_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const login = useCallback((email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      const { password: _, ...safeUser } = user;
      setCurrentUser(safeUser as User);
      localStorage.setItem('jira_current_user', JSON.stringify(safeUser));
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const register = useCallback((name: string, email: string, password: string) => {
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Email already exists' };
    }
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newUser: User = {
      id: `u-${Date.now()}`,
      name, email, avatar: '', initials,
      role: 'developer',
    };
    users.push({ ...newUser, password });
    setCurrentUser(newUser);
    localStorage.setItem('jira_current_user', JSON.stringify(newUser));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('jira_current_user');
  }, []);

  const forgotPassword = useCallback((email: string) => {
    const user = users.find(u => u.email === email);
    if (user) {
      return { success: true, message: 'Password reset link sent to your email (demo: check console)' };
    }
    return { success: false, message: 'No account found with that email' };
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

  const canManageProject = useCallback(() => {
    return hasRole(['admin']);
  }, [hasRole]);

  const canManageSprints = useCallback(() => {
    return hasRole(['admin', 'project_manager']);
  }, [hasRole]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      login, register, logout, forgotPassword,
      hasRole, canEditIssue, canManageProject, canManageSprints,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
