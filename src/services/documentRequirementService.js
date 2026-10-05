import api from './api';

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `?${query}` : '';
};

// DOCUMENT TYPES (MASTER)
export const getDocumentTypes = async (params = {}) => {
  const { data } = await api.get(`/document-types${buildQueryString(params)}`);
  return data;
};

export const getDocumentType = async (id) => {
  const { data } = await api.get(`/document-types/${id}`);
  return data;
};

export const createDocumentType = async (payload) => {
  const { data } = await api.post('/document-types', payload);
  return data;
};

export const updateDocumentType = async (id, payload) => {
  const { data } = await api.put(`/document-types/${id}`, payload);
  return data;
};

export const updateDocumentTypeStatus = async (id, isActive) => {
  const { data } = await api.patch(`/document-types/${id}/status`, { isActive });
  return data;
};

export const deleteDocumentType = async (id) => {
  const { data } = await api.delete(`/document-types/${id}`);
  return data;
};

// DOCUMENT REQUIREMENTS
export const getRequirements = async (params = {}) => {
  const { data } = await api.get(`/document-requirements${buildQueryString(params)}`);
  return data;
};

export const getRequirement = async (id) => {
  const { data } = await api.get(`/document-requirements/${id}`);
  return data;
};

export const createRequirement = async (payload) => {
  const { data } = await api.post('/document-requirements', payload);
  return data;
};

export const updateRequirement = async (id, payload) => {
  const { data } = await api.put(`/document-requirements/${id}`, payload);
  return data;
};

export const updateRequirementRequired = async (id, isRequired) => {
  const { data } = await api.patch(`/document-requirements/${id}/required`, { isRequired });
  return data;
};

export const updateRequirementOrder = async (id, sortOrder) => {
  const { data } = await api.patch(`/document-requirements/${id}/order`, { sortOrder });
  return data;
};

export const reorderRequirements = async (requirements) => {
  const { data } = await api.put('/document-requirements/reorder', { requirements });
  return data;
};

export const deleteRequirement = async (id) => {
  const { data } = await api.delete(`/document-requirements/${id}`);
  return data;
};

// EFFECTIVE
export const getEffectiveRequirements = async (institutionId, includePondok = true) => {
  const { data } = await api.get(`/document-requirements/effective${buildQueryString({ institutionId, includePondok })}`);
  return data;
};
