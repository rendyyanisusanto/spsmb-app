import api from './api';

export const getUsers = async (params) => {
  const response = await api.get('/users', { params });
  return response;
};

export const getUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response;
};

export const createUser = async (data) => {
  const response = await api.post('/users', data);
  return response;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/users/${id}`, data);
  return response;
};

export const updateStatus = async (id, isActive) => {
  const response = await api.patch(`/users/${id}/status`, { isActive });
  return response;
};

export const resetPassword = async (id, data) => {
  const response = await api.post(`/users/${id}/reset-password`, data);
  return response;
};

export const getRoles = async () => {
  const response = await api.get('/roles');
  return response;
};
