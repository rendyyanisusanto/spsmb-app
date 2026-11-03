import api from './api';

export const getCrmReportFilters = async () => {
  const response = await api.get('/crm/reports/filters');
  return response.data;
};

export const getCrmDashboardReport = async (params = {}) => {
  const query = new URLSearchParams();

  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });

  const response = await api.get(`/crm/reports/dashboard?${query.toString()}`);
  return response.data;
};

