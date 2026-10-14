import api from './api'

const getForm = async (registrationNumber, continueToken) => {
  const encodedToken = encodeURIComponent(continueToken || '')
  return await api.get(`/public/applications/${registrationNumber}/form?token=${encodedToken}`, {
    headers: {
      'x-continue-token': continueToken
    }
  })
}

const saveSection = async (registrationNumber, continueToken, sectionId, answers, isCompleteAction = false) => {
  const encodedToken = encodeURIComponent(continueToken || '')
  return await api.put(
    `/public/applications/${registrationNumber}/form/sections/${sectionId}?token=${encodedToken}`,
    { answers, isCompleteAction },
    {
      headers: {
        'x-continue-token': continueToken
      }
    }
  )
}

export default {
  getForm,
  saveSection
}
