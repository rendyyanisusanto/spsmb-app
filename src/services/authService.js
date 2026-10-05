import api from './api';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const authService = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    if (response.success && response.data?.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
    }
    return response;
  },

  async getCurrentUser() {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;
    
    try {
      const response = await api.get('/auth/me');
      return response.data?.user || null;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      }
      return null;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout request failed, continuing local logout', error);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
  }
};
