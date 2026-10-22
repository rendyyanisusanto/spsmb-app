import api from './api'

export const getFaqs = async (params = {}) => {
  const query = new URLSearchParams()
  if (params.scope) query.append('scope', params.scope)
  if (params.institution_id) query.append('institution_id', params.institution_id)
  if (params.q) query.append('q', params.q)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return await api.get(`/faqs${qs}`)
}

export const getFaqDetail = async (id) => {
  return await api.get(`/faqs/${id}`)
}

export const createFaq = async (data) => {
  return await api.post('/faqs', data)
}

export const updateFaq = async (id, data) => {
  return await api.put(`/faqs/${id}`, data)
}

export const deleteFaq = async (id) => {
  return await api.delete(`/faqs/${id}`)
}

export default {
  getFaqs,
  getFaqDetail,
  createFaq,
  updateFaq,
  deleteFaq
}
