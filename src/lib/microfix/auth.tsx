// Sesión del profesional. Basado en frontend/src/auth/ (AuthContext +
// RequireAuth), ya probado contra este backend.
//
// Uso:
//   <AuthProvider> envuelve la app (dentro del <BrowserRouter>).
//   <RequireAuth> envuelve las rutas privadas; sin sesión manda a /login.
//   const { user, login, logout } = useAuth();  → user.organizationId es el
//   que se pasa a todas las llamadas de api.ts.

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from './api';
import { clearSession, getStoredUser, saveSession } from './client';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  async function login(email: string, password: string) {
    // Credenciales malas → ApiError 401 con message "Invalid credentials"
    // (no redirige): mostrar "Correo o contraseña incorrectos".
    const { access_token, user } = await authApi.login(email, password);
    saveSession(access_token, user);
    setUser(user);
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
