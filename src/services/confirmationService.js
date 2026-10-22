import api from './api'

export const getConfirmationApplicants = async (params = {}) => {
  const query = new URLSearchParams()
  if (params.institution_id) query.append('institution_id', params.institution_id)
  if (params.academic_year) query.append('academic_year', params.academic_year)
  if (params.status) query.append('status', params.status)
  if (params.doc_status) query.append('doc_status', params.doc_status)
  if (params.pay_status) query.append('pay_status', params.pay_status)
  if (params.q) query.append('q', params.q)
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return await api.get(`/confirmation/applicants${qs}`)
}

export const getConfirmationDetail = async (applicationId) => {
  return await api.get(`/confirmation/applicants/${applicationId}`)
}

export const startConfirmation = async (applicationId, confirmationTrackId) => {
  return await api.post('/confirmation/start', {
    application_id: applicationId,
    confirmation_track_id: confirmationTrackId
  })
}

export const verifyDocument = async (confirmationId, documentTypeId, status, notes = '') => {
  return await api.post(`/confirmation/${confirmationId}/documents/verify`, {
    document_type_id: documentTypeId,
    status,
    notes
  })
}

export const addPayment = async (confirmationId, formData) => {
  const token = localStorage.getItem('spsmb_access_token')
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
  const response = await fetch(`${baseUrl}/confirmation/${confirmationId}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Gagal mencatat pembayaran.')
  }
  return data
}

export const verifyPayment = async (paymentId, status, notes = '') => {
  return await api.post(`/confirmation/payments/${paymentId}/verify`, {
    status,
    notes
  })
}

export const finalizeAdmission = async (confirmationId, officialStudentNumber = '', notes = '') => {
  return await api.post(`/confirmation/${confirmationId}/finalize`, {
    official_student_number: officialStudentNumber,
    notes
  })
}

export const cancelAdmission = async (confirmationId, reason = '') => {
  return await api.post(`/confirmation/${confirmationId}/cancel`, {
    reason
  })
}

// Master Tracks
export const getTracks = async (params = {}) => {
  const query = new URLSearchParams()
  if (params.institution_id) query.append('institution_id', params.institution_id)
  if (params.academic_year) query.append('academic_year', params.academic_year)
  if (params.is_active !== undefined) query.append('is_active', params.is_active)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return await api.get(`/confirmation/tracks${qs}`)
}

export const createTrack = async (data) => {
  return await api.post('/confirmation/tracks', data)
}

export const updateTrack = async (id, data) => {
  return await api.put(`/confirmation/tracks/${id}`, data)
}

export const deleteTrack = async (id) => {
  return await api.delete(`/confirmation/tracks/${id}`)
}

// Master Fee Components
export const getFeeComponents = async (params = {}) => {
  const query = new URLSearchParams()
  if (params.institution_id) query.append('institution_id', params.institution_id)
  if (params.confirmation_track_id) query.append('confirmation_track_id', params.confirmation_track_id)
  if (params.is_active !== undefined) query.append('is_active', params.is_active)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return await api.get(`/confirmation/fee-components${qs}`)
}

export const createFeeComponent = async (data) => {
  return await api.post('/confirmation/fee-components', data)
}

export const updateFeeComponent = async (id, data) => {
  return await api.put(`/confirmation/fee-components/${id}`, data)
}

export const deleteFeeComponent = async (id) => {
  return await api.delete(`/confirmation/fee-components/${id}`)
}

// Official Students
export const getOfficialStudents = async (params = {}) => {
  const query = new URLSearchParams()
  if (params.institution_id) query.append('institution_id', params.institution_id)
  if (params.confirmation_track_id) query.append('confirmation_track_id', params.confirmation_track_id)
  if (params.academic_year) query.append('academic_year', params.academic_year)
  if (params.q) query.append('q', params.q)
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return await api.get(`/confirmation/official-students${qs}`)
}

export default {
  getConfirmationApplicants,
  getConfirmationDetail,
  startConfirmation,
  verifyDocument,
  addPayment,
  verifyPayment,
  finalizeAdmission,
  cancelAdmission,
  getTracks,
  createTrack,
  updateTrack,
  deleteTrack,
  getFeeComponents,
  createFeeComponent,
  updateFeeComponent,
  deleteFeeComponent,
  getOfficialStudents
}
