import { create } from 'zustand';
import { User } from '../types';
import { authAPI, setToken, removeToken, getToken } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
  
  login: (email: string, password: string) => Promise<{ requires_2fa: boolean; mocked_otp?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; phone?: string; invite_code: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  pendingEmail: null,

  login: async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    set({ pendingEmail: email });
    return {
      requires_2fa: response.data.requires_2fa,
      mocked_otp: response.data.mocked_otp,
    };
  },

  verifyOTP: async (email: string, otp: string) => {
    const response = await authAPI.verifyOTP({ email, otp });
    await setToken(response.data.access_token);
    set({
      user: response.data.user,
      isAuthenticated: true,
      pendingEmail: null,
    });
  },

  register: async (data) => {
    await authAPI.register(data);
  },

  logout: async () => {
    await removeToken();
    set({
      user: null,
      isAuthenticated: false,
      pendingEmail: null,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await getToken();
      if (token) {
        const response = await authAPI.getMe();
        set({
          user: response.data,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      await removeToken();
      set({
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  updateUser: (user: User) => {
    set({ user });
  },
}));
