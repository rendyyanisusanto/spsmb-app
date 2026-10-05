import api from './api';

const getHeaders = (continueToken) => ({
  headers: {
    'X-Continue-Token': continueToken
  }
});

export const getCompleteness = async (registrationNumber, continueToken) => {
  const { data } = await api.get(`/public/applications/${registrationNumber}/completeness`, getHeaders(continueToken));
  return data;
};

export const getReview = async (registrationNumber, continueToken) => {
  const { data } = await api.get(`/public/applications/${registrationNumber}/review`, getHeaders(continueToken));
  return data;
};

export const submitApplication = async (registrationNumber, continueToken) => {
  const { data } = await api.post(`/public/applications/${registrationNumber}/submit`, null, getHeaders(continueToken));
  return data;
};

export const getStatus = async (registrationNumber, continueToken) => {
  const { data } = await api.get(`/public/applications/${registrationNumber}/status`, getHeaders(continueToken));
  return data;
};

export const getSummary = async (registrationNumber, continueToken) => {
  const { data } = await api.get(`/public/applications/${registrationNumber}/summary`, getHeaders(continueToken));
  return data;
};

export default {
  getCompleteness,
  getReview,
  submitApplication,
  getStatus,
  getSummary
};
