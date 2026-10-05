import api from './api';

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `?${query}` : '';
};

// TARGETS
export const getTargets = async (params = {}) => {
  const { data } = await api.get(`/form-targets${buildQueryString(params)}`);
  return data;
};

export const getTarget = async (id) => {
  const { data } = await api.get(`/form-targets/${id}`);
  return data;
};

// SECTIONS
export const getSections = async (params = {}) => {
  const { data } = await api.get(`/form-sections${buildQueryString(params)}`);
  return data;
};

export const createSection = async (payload) => {
  const { data } = await api.post('/form-sections', payload);
  return data;
};

export const updateSection = async (id, payload) => {
  const { data } = await api.put(`/form-sections/${id}`, payload);
  return data;
};

export const updateSectionStatus = async (id, isActive) => {
  const { data } = await api.patch(`/form-sections/${id}/status`, { isActive });
  return data;
};

export const deleteSection = async (id) => {
  const { data } = await api.delete(`/form-sections/${id}`);
  return data;
};

// FIELDS
export const getFields = async (params = {}) => {
  const { data } = await api.get(`/form-fields${buildQueryString(params)}`);
  return data;
};

export const getField = async (id) => {
  const { data } = await api.get(`/form-fields/${id}`);
  return data;
};

export const createField = async (payload) => {
  const { data } = await api.post('/form-fields', payload);
  return data;
};

export const updateField = async (id, payload) => {
  const { data } = await api.put(`/form-fields/${id}`, payload);
  return data;
};

export const updateFieldStatus = async (id, isActive) => {
  const { data } = await api.patch(`/form-fields/${id}/status`, { isActive });
  return data;
};

export const updateFieldRequired = async (id, isRequired) => {
  const { data } = await api.patch(`/form-fields/${id}/required`, { isRequired });
  return data;
};

export const updateFieldOrder = async (id, sortOrder) => {
  const { data } = await api.patch(`/form-fields/${id}/order`, { sortOrder });
  return data;
};

export const reorderFields = async (fields) => {
  const promises = fields.map(f => updateFieldOrder(f.id, f.sortOrder));
  await Promise.all(promises);
  return { success: true };
};

export const deleteField = async (id) => {
  const { data } = await api.delete(`/form-fields/${id}`);
  return data;
};

// PREVIEW / EFFECTIVE CONFIG
export const getEffectiveForm = async (institutionId, includePondok = true) => {
  const { data } = await api.get(`/form-config/effective${buildQueryString({ institutionId, includePondok })}`);
  return data;
};
