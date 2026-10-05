import api from './api';

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `?${query}` : '';
};

export const getTemplates = async (params = {}) => {
  return await api.get(`/whatsapp-templates${buildQueryString(params)}`);
};

export const getTemplate = async (id) => {
  return await api.get(`/whatsapp-templates/${id}`);
};

export const createTemplate = async (payload) => {
  return await api.post('/whatsapp-templates', payload);
};

export const updateTemplate = async (id, payload) => {
  return await api.put(`/whatsapp-templates/${id}`, payload);
};

export const updateTemplateStatus = async (id, isActive) => {
  return await api.patch(`/whatsapp-templates/${id}/status`, { isActive });
};

export const duplicateTemplate = async (id, payload) => {
  return await api.post(`/whatsapp-templates/${id}/duplicate`, payload);
};

export const useGlobalTemplate = async (id) => {
  return await api.post(`/whatsapp-templates/${id}/use-global`);
};

export const deleteTemplate = async (id) => {
  return await api.delete(`/whatsapp-templates/${id}`);
};

export const getEvents = async () => {
  return await api.get('/whatsapp-templates/events');
};

export const getVariables = async (eventCode) => {
  const params = eventCode ? { event: eventCode } : {};
  return await api.get(`/whatsapp-templates/variables${buildQueryString(params)}`);
};

export const previewTemplate = async (eventCode, message) => {
  return await api.post('/whatsapp-templates/preview', { eventCode, message });
};

export const resolveTemplate = async (eventCode, institutionId) => {
  const params = { event: eventCode };
  if (institutionId) params.institutionId = institutionId;
  return await api.get(`/whatsapp-templates/resolve${buildQueryString(params)}`);
};
