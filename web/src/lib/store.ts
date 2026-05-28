import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  login: (user: User, accessToken: string, refreshToken: string, tenantId: string) => void;
  logout: () => void;
}

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: getStoredToken(),
  refreshToken: null,
  tenantId: null,
  login: (user, accessToken, refreshToken, tenantId) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, refreshToken, tenantId });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, tenantId: null });
  },
}));
