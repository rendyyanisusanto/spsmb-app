import api from './api';

// --- Target Sekolah ---
export const getSchools = async (params = {}) => {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });
  return api.get(`/crm/schools?${query.toString()}`);
};

export const getSchoolStats = async (params = {}) => {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });
  return api.get(`/crm/schools/stats?${query.toString()}`);
};

export const checkDuplicate = async (name, city = '', excludeId = '') => {
  const query = new URLSearchParams();
  if (name) query.append('name', name);
  if (city) query.append('city', city);
  if (excludeId) query.append('excludeId', excludeId);
  return api.get(`/crm/schools/check-duplicate?${query.toString()}`);
};

export const getSchoolById = async (id) => {
  return api.get(`/crm/schools/${id}`);
};

export const createSchool = async (payload) => {
  return api.post('/crm/schools', payload);
};

export const updateSchool = async (id, payload) => {
  return api.put(`/crm/schools/${id}`, payload);
};

export const updateSchoolStatus = async (id, payload) => {
  return api.patch(`/crm/schools/${id}/status`, payload);
};

export const deleteSchool = async (id) => {
  return api.delete(`/crm/schools/${id}`);
};

export const getStatusHistories = async (id) => {
  return api.get(`/crm/schools/${id}/status-histories`);
};

// --- Letter Settings ---
export const getActiveLetterSettings = async () => {
  return api.get('/crm/schools/letter-settings/active');
};

export const updateLetterSettings = async (formDataOrPayload) => {
  return api.put('/crm/schools/letter-settings', formDataOrPayload);
};

// --- Letters ---
export const previewLetter = async (schoolId, payload = {}) => {
  return api.post(`/crm/schools/${schoolId}/letters/preview`, payload);
};

export const issueLetter = async (schoolId, payload = {}) => {
  return api.post(`/crm/schools/${schoolId}/letters`, payload);
};

export const getLetters = async (schoolId) => {
  return api.get(`/crm/schools/${schoolId}/letters`);
};

export const getLetterById = async (letterId) => {
  return api.get(`/crm/schools/letters/${letterId}`);
};

// --- Presentation Reports ---
export const getReports = async (schoolId) => {
  return api.get(`/crm/schools/${schoolId}/reports`);
};

export const getReportById = async (reportId) => {
  return api.get(`/crm/schools/reports/${reportId}`);
};

export const createReport = async (schoolId, payload) => {
  return api.post(`/crm/schools/${schoolId}/reports`, payload);
};

export const updateReport = async (reportId, payload) => {
  return api.put(`/crm/schools/reports/${reportId}`, payload);
};

export const deleteReport = async (reportId) => {
  return api.delete(`/crm/schools/reports/${reportId}`);
};

// --- Photos ---
export const uploadPhotos = async (reportId, formData) => {
  return api.post(`/crm/schools/reports/${reportId}/photos`, formData);
};

export const deletePhoto = async (photoId) => {
  return api.delete(`/crm/schools/photos/${photoId}`);
};
