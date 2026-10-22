import api from './api';

export const getLeads = async (params = {}) => {
  const query = new URLSearchParams();

  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/crm/leads?${query.toString()}`);
  return response;
};

export const getLeadDetail = async (id) => {
  const response = await api.get(`/crm/leads/${id}`);
  return response.data;
};

export const createLead = async (payload) => {
  const response = await api.post('/crm/leads', payload);
  return response.data;
};

export const updateLead = async (id, payload) => {
  const response = await api.put(`/crm/leads/${id}`, payload);
  return response.data;
};

export const updateLeadStatus = async (id, payload) => {
  const response = await api.patch(`/crm/leads/${id}/status`, payload);
  return response.data;
};

export const deleteLead = async (id) => {
  const response = await api.delete(`/crm/leads/${id}`);
  return response;
};

export const getLeadStatusHistories = async (id) => {
  const response = await api.get(`/crm/leads/${id}/status-histories`);
  return response.data;
};

export const getLeadStatuses = async () => {
  const response = await api.get('/crm/leads/statuses');
  return response.data;
};

export const getLeadOfficers = async () => {
  const response = await api.get('/crm/leads/officers');
  return response.data;
};

export const getLeadActivities = async (id) => {
  const response = await api.get(`/crm/leads/${id}/activities`);
  return response.data;
};

export const addLeadActivity = async (id, payload) => {
  const response = await api.post(`/crm/leads/${id}/activities`, payload);
  return response.data;
};

export const updateLeadSchedule = async (id, payload) => {
  const response = await api.post(`/crm/leads/${id}/schedule`, payload);
  return response.data;
};

export const previewLeadMessage = async (id, payload) => {
  const response = await api.post(`/crm/leads/${id}/preview-message`, payload);
  return response.data;
};

export const sendManualWhatsApp = async (id, payload) => {
  const response = await api.post(`/crm/leads/${id}/whatsapp`, payload);
  return response.data;
};

export const importLeads = async (formDataOrPayload, config = {}) => {
  const isFormData = formDataOrPayload instanceof FormData;
  const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.post('/crm/leads/import', formDataOrPayload, {
    headers,
    ...config
  });
  return response.data;
};

export const downloadImportTemplate = async () => {
  const response = await api.get('/crm/leads/import/template', {
    responseType: 'blob'
  });
  return response;
};

