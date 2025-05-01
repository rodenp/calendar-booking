import { create } from 'zustand';
import { toast } from 'react-toastify';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  verifiedEmail: boolean;
  role: string;
  avatar?: string;
  timezone?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, tokens } = response.data.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      set({
        user,
        isAuthenticated: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isLoading: false,
      });
      
      toast.success('Logged in successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to login');
      throw error;
    }
  },
  
  register: async (firstName, lastName, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
      });
      
      const { user, tokens } = response.data.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      set({
        user,
        isAuthenticated: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isLoading: false,
      });
      
      toast.success('Registered successfully. Please verify your email.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to register');
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    set({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
    });
    
    toast.success('Logged out successfully');
  },
  
  checkAuth: async () => {
    const { accessToken, refreshToken } = get();
    
    if (!accessToken) {
      set({ isLoading: false });
      return;
    }
    
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      // If token is expired, try to refresh
      if (error.response?.status === 401 && refreshToken) {
        try {
          const refreshResponse = await api.post('/auth/refresh-token', {
            refreshToken,
          });
          
          const { accessToken: newAccessToken } = refreshResponse.data.data;
          
          localStorage.setItem('accessToken', newAccessToken);
          
          set({
            accessToken: newAccessToken,
          });
          
          // Retry getting user data with new token
          const userResponse = await api.get('/auth/me');
          set({
            user: userResponse.data.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (refreshError) {
          // If refresh fails, log out
          get().logout();
          set({ isLoading: false });
        }
      } else {
        // For other errors, log out
        get().logout();
        set({ isLoading: false });
      }
    }
  },
  
  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },
  
  forgotPassword: async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
      throw error;
    }
  },
  
  resetPassword: async (token, password) => {
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully. You can now log in with your new password.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
      throw error;
    }
  },
  
  verifyEmail: async (token) => {
    try {
      await api.post('/auth/verify-email', { token });
      
      // Update user's verified email status
      set((state) => ({
        user: state.user ? { ...state.user, verifiedEmail: true } : null,
      }));
      
      toast.success('Email verified successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify email');
      throw error;
    }
  },
}));