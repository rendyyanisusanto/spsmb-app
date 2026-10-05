import { ref, computed } from 'vue';
import { authService } from '@/services/authService';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const userState = ref(null);
const isLoading = ref(true);

export const initAuth = async () => {
  isLoading.value = true;
  try {
    const user = await authService.getCurrentUser();
    userState.value = user;
  } catch (error) {
    userState.value = null;
  } finally {
    isLoading.value = false;
  }
};

export const useAuth = () => {
  const login = async (username, password) => {
    try {
      const res = await authService.login(username, password);
      if (res.success && res.data?.user) {
        userState.value = res.data.user;
      }
      return res;
    } catch (error) {
      return { success: false, message: error.message || 'Terjadi kesalahan' };
    }
  };

  const logout = async () => {
    await authService.logout();
    userState.value = null;
  };

  const hasRole = (roles) => {
    if (!userState.value || !userState.value.roles) return false;
    if (!Array.isArray(roles)) {
      roles = [roles];
    }
    return userState.value.roles.some(role => roles.includes(role));
  };

  const isAuthenticated = computed(() => !!userState.value);
  const user = computed(() => userState.value);

  return {
    login,
    logout,
    isAuthenticated,
    user,
    isLoading,
    hasRole,
    initAuth
  };
};
