import api from './api';

export const getApplications = async (params = {}) => {
  const query = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/applications?${query.toString()}`);
  return response;
};

export const exportApplications = async (params = {}) => {
  const query = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/applications/export?${query.toString()}`);
  return response.data;
};

export const getApplicationDetail = async (id) => {
  const response = await api.get(`/applications/${id}`);
  return response.data;
};

export const getApplicationForm = async (id) => {
  const response = await api.get(`/applications/${id}/form`);
  return response.data;
};

export const getApplicationStatusHistory = async (id) => {
  const response = await api.get(`/applications/${id}/status-history`);
  return response.data;
};

export const updateApplicationStatus = async (id, status) => {
  const response = await api.patch(`/applications/${id}/status`, { status });
  return response.data;
};

export const updateApplication = async (id, data) => {
  const response = await api.put(`/applications/${id}`, data);
  return response.data || response;
};

export const resendApplicationWhatsapp = async (id, payload = {}) => {
  const response = await api.post(`/applications/${id}/resend-whatsapp`, payload);
  return response.data || response;
};

export const getResendPreview = async (id) => {
  const response = await api.get(`/applications/${id}/resend-preview`);
  return response.data || response;
};

export const deleteApplication = async (id) => {
  const response = await api.delete(`/applications/${id}`);
  return response.data || response;
};

