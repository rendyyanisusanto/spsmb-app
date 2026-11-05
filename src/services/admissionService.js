import api from './api';

export const getAdmissionFilters = async () => {
  const response = await api.get('/admissions/filters');
  return response.data;
};

export const getAdmissionApplications = async (params = {}) => {
  const query = new URLSearchParams();

  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/admissions/applications?${query.toString()}`);
  return response; // Contains data, meta, stats
};

export const getAdmissionReport = async (params = {}) => {
  const query = new URLSearchParams();

  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/admissions/reports?${query.toString()}`);
  return response;
};

export const getAdmissionApplicationDetail = async (id) => {
  const response = await api.get(`/admissions/applications/${id}`);
  return response.data;
};

export const updateAdmissionAcceptance = async (id, { is_accepted, notes }) => {
  const response = await api.patch(`/admissions/applications/${id}/acceptance`, {
    is_accepted,
    notes
  });
  return response.data;
};

// Master Requirements
export const getAdmissionRequirements = async (params = {}) => {
  const query = new URLSearchParams();

  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/admissions/requirements?${query.toString()}`);
  return response.data;
};

export const getAdmissionRequirementDetail = async (id) => {
  const response = await api.get(`/admissions/requirements/${id}`);
  return response.data;
};

export const createAdmissionRequirement = async (payload) => {
  const response = await api.post('/admissions/requirements', payload);
  return response.data;
};

export const updateAdmissionRequirement = async (id, payload) => {
  const response = await api.put(`/admissions/requirements/${id}`, payload);
  return response.data;
};

export const deleteAdmissionRequirement = async (id) => {
  const response = await api.delete(`/admissions/requirements/${id}`);
  return response.data;
};

// Completions
export const updateAdmissionCompletion = async (applicationId, requirementId, payload) => {
  const response = await api.patch(
    `/admissions/applications/${applicationId}/completions/${requirementId}`,
    payload
  );
  return response.data;
};

export const uploadAdmissionCompletionFile = async (applicationId, requirementId, formData) => {
  const response = await api.post(
    `/admissions/applications/${applicationId}/completions/${requirementId}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};

export const removeAdmissionCompletionFile = async (applicationId, requirementId) => {
  const response = await api.delete(
    `/admissions/applications/${applicationId}/completions/${requirementId}/file`
  );
  return response.data;
};

