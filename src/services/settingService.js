import api from './api';

export const getSettings = async () => {
  const response = await api.get('/settings');
  return response;
};

export const updateSettings = async (data) => {
  const response = await api.put('/settings', data);
  return response;
};

export const getPublicSettings = async () => {
  const response = await api.get('/public/settings');
  return response;
};
