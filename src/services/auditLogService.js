import api from './api'

export const getAuditLogs = async (params = {}) => {
  // Convert object to query string
  const query = new URLSearchParams()
  
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  if (params.action && params.action !== 'ALL') query.append('action', params.action)
  if (params.entityType && params.entityType !== 'ALL') query.append('entityType', params.entityType)
  if (params.userId) query.append('userId', params.userId)
  if (params.dateFrom) query.append('dateFrom', params.dateFrom)
  if (params.dateTo) query.append('dateTo', params.dateTo)
  if (params.search) query.append('search', params.search)
  if (params.sortBy) query.append('sortBy', params.sortBy)
  if (params.sortOrder) query.append('sortOrder', params.sortOrder)

  const queryString = query.toString()
  const endpoint = `/audit-logs${queryString ? `?${queryString}` : ''}`
  
  return await api.get(endpoint)
}

export const getAuditLogById = async (id) => {
  return await api.get(`/audit-logs/${id}`)
}
