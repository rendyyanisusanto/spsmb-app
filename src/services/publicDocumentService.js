import api from './api';

const getHeaders = (continueToken) => {
  return {
    headers: {
      'X-Continue-Token': continueToken
    }
  };
};

export const getDocuments = async (registrationNumber, continueToken) => {
  const { data } = await api.get(`/public/applications/${registrationNumber}/documents`, getHeaders(continueToken));
  return data;
};

export const uploadDocument = async (registrationNumber, continueToken, documentTypeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const headers = getHeaders(continueToken);
  
  const { data } = await api.post(`/public/applications/${registrationNumber}/documents/${documentTypeId}`, formData, headers);
  return data;
};

export const replaceDocument = async (registrationNumber, continueToken, documentTypeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const headers = getHeaders(continueToken);
  
  const { data } = await api.put(`/public/applications/${registrationNumber}/documents/${documentTypeId}`, formData, headers);
  return data;
};

export const deleteDocument = async (registrationNumber, continueToken, documentTypeId) => {
  const { data } = await api.delete(`/public/applications/${registrationNumber}/documents/${documentTypeId}`, getHeaders(continueToken));
  return data;
};

export const getDocumentFileUrl = (registrationNumber, continueToken, documentTypeId) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  return `${baseURL}/public/applications/${registrationNumber}/documents/${documentTypeId}/file?token=${encodeURIComponent(continueToken)}`;
};

export default {
  getDocuments,
  uploadDocument,
  replaceDocument,
  deleteDocument,
  getDocumentFileUrl
};
