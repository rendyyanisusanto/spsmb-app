import api from './api';

export const getPrograms = async (params) => {
  const response = await api.get('/programs', { params });
  return response;
};
export const getProgram = async (id) => {
  const response = await api.get(`/programs/${id}`);
  return response;
};
export const createProgram = async (data) => {
  const response = await api.post('/programs', data);
  return response;
};
export const updateProgram = async (id, data) => {
  const response = await api.put(`/programs/${id}`, data);
  return response;
};
export const updateProgramStatus = async (id, isActive) => {
  const response = await api.patch(`/programs/${id}/status`, { isActive });
  return response;
};
export const deleteProgram = async (id) => {
  const response = await api.delete(`/programs/${id}`);
  return response;
};
export const getPublicPrograms = async (institutionId) => {
  const response = await api.get(`/public/institutions/${institutionId}/programs`);
  return response;
};
