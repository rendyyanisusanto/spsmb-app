import api from './api';

export const getAcademicYears = async (params) => {
  const response = await api.get('/academic-years', { params });
  return response;
};
export const getAcademicYear = async (id) => {
  const response = await api.get(`/academic-years/${id}`);
  return response;
};
export const createAcademicYear = async (data) => {
  const response = await api.post('/academic-years', data);
  return response;
};
export const updateAcademicYear = async (id, data) => {
  const response = await api.put(`/academic-years/${id}`, data);
  return response;
};
export const updateAcademicYearStatus = async (id, isActive) => {
  const response = await api.patch(`/academic-years/${id}/status`, { isActive });
  return response;
};

export const getPeriods = async (params) => {
  const response = await api.get('/registration-periods', { params });
  return response;
};
export const getPeriod = async (id) => {
  const response = await api.get(`/registration-periods/${id}`);
  return response;
};
export const createPeriod = async (data) => {
  const response = await api.post('/registration-periods', data);
  return response;
};
export const updatePeriod = async (id, data) => {
  const response = await api.put(`/registration-periods/${id}`, data);
  return response;
};
export const updatePeriodStatus = async (id, isActive) => {
  const response = await api.patch(`/registration-periods/${id}/status`, { isActive });
  return response;
};

export const getWaves = async (params) => {
  const response = await api.get('/registration-waves', { params });
  return response;
};
export const getWave = async (id) => {
  const response = await api.get(`/registration-waves/${id}`);
  return response;
};
export const createWave = async (data) => {
  const response = await api.post('/registration-waves', data);
  return response;
};
export const updateWave = async (id, data) => {
  const response = await api.put(`/registration-waves/${id}`, data);
  return response;
};
export const updateWaveStatus = async (id, isActive) => {
  const response = await api.patch(`/registration-waves/${id}/status`, { isActive });
  return response;
};

export const getCurrentRegistrationPeriod = async () => {
  const response = await api.get('/public/registration-period');
  return response;
};
