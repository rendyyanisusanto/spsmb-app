import api from './api';

export const getInstitutions = async (params) => {
  const response = await api.get('/institutions', { params });
  return response;
};

export const getInstitution = async (id) => {
  const response = await api.get(`/institutions/${id}`);
  return response;
};

export const createInstitution = async (data) => {
  const response = await api.post('/institutions', data);
  return response;
};

export const updateInstitution = async (id, data) => {
  const response = await api.put(`/institutions/${id}`, data);
  return response;
};

export const updateInstitutionStatus = async (id, isActive) => {
  const response = await api.patch(`/institutions/${id}/status`, { isActive });
  return response;
};

export const getPublicInstitutions = async () => {
  const response = await api.get('/public/institutions');
  return response;
};
