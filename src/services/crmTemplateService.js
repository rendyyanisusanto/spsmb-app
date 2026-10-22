import api from './api';

export const getCrmTemplates = async (params = {}) => {
  const query = new URLSearchParams();

  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/crm/templates?${query.toString()}`);
  return response;
};

export const getCrmTemplate = async (id) => {
  const response = await api.get(`/crm/templates/${id}`);
  return response.data;
};

export const createCrmTemplate = async (payload) => {
  const response = await api.post('/crm/templates', payload);
  return response.data;
};

export const updateCrmTemplate = async (id, payload) => {
  const response = await api.put(`/crm/templates/${id}`, payload);
  return response.data;
};

export const toggleCrmTemplateStatus = async (id, isActive) => {
  const response = await api.patch(`/crm/templates/${id}/status`, { isActive });
  return response.data;
};

export const deleteCrmTemplate = async (id) => {
  const response = await api.delete(`/crm/templates/${id}`);
  return response;
};

export const getCrmTemplateCategories = async () => {
  const response = await api.get('/crm/templates/categories');
  return response.data;
};

export const getCrmTemplatePlaceholders = async () => {
  const response = await api.get('/crm/templates/placeholders');
  return response.data;
};

export const previewCrmTemplate = async (messageBody, overrides = {}) => {
  const response = await api.post('/crm/templates/preview', { messageBody, overrides });
  return response.data;
};
