import { STORAGE_KEYS } from '../constants/storageKeys'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

class ApiError extends Error {
  constructor(status, message, errors = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

const fetchWithTimeout = async (url, options, timeout = 15000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    if (error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout. Server memakan waktu terlalu lama untuk merespon.')
    }
    // Network Error (server mati / tidak ada koneksi internet)
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi Anda atau coba lagi nanti.')
  }
}

const handleResponse = async (response) => {
  const isJson = response.headers.get('content-type')?.includes('application/json')
  let data = null
  
  if (isJson) {
    data = await response.json()
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      // Only auto-redirect to login if it's an admin route
      if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/login') {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    // Tangani error dari API
    const message = data?.message || 'Terjadi kesalahan pada server.'
    const errors = data?.errors || null
    throw new ApiError(response.status, message, errors)
  }

  return data
}

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  // Jika nanti ada authorization (token), tambahkan di sini:
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  if (token) headers.Authorization = `Bearer ${token}`

  const config = {
    ...options,
    headers
  }

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body)
  }
  
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type']
  }

  const response = await fetchWithTimeout(url, config)
  return handleResponse(response)
}

const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options = {}) => request(endpoint, { ...options, method: 'POST', body: data }),
  put: (endpoint, data, options = {}) => request(endpoint, { ...options, method: 'PUT', body: data }),
  patch: (endpoint, data, options = {}) => request(endpoint, { ...options, method: 'PATCH', body: data }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' })
}

export default api
