import api from './api'

export const getPublicLanding = async (slug) => {
  return await api.get(`/public/landing/${slug}`)
}

export const getPublicGlobalFaqs = async (search = '') => {
  const query = search ? `?q=${encodeURIComponent(search)}` : ''
  return await api.get(`/public/faq${query}`)
}

export default {
  getPublicLanding,
  getPublicGlobalFaqs
}
