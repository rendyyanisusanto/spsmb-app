import api from './api'

export const getWhatsappLogs = async (params = {}) => {
  const query = new URLSearchParams()

  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  if (params.event && params.event !== 'ALL') query.append('event', params.event)
  if (params.status && params.status !== 'ALL') query.append('status', params.status)
  if (params.institutionId && params.institutionId !== 'ALL') query.append('institutionId', params.institutionId)
  if (params.institutionName && params.institutionName !== 'ALL') query.append('institutionName', params.institutionName)
  if (params.dateFrom) query.append('dateFrom', params.dateFrom)
  if (params.dateTo) query.append('dateTo', params.dateTo)
  if (params.search) query.append('search', params.search)

  const queryString = query.toString()
  const endpoint = `/whatsapp-logs${queryString ? `?${queryString}` : ''}`

  return await api.get(endpoint)
}

export const getWhatsappLogById = async (id) => {
  return await api.get(`/whatsapp-logs/${id}`)
}

