import api from './api'

const getForm = async (registrationNumber, continueToken) => {
  return await api.get(`/public/applications/${registrationNumber}/form`, {
    headers: {
      'x-continue-token': continueToken
    }
  })
}

const saveSection = async (registrationNumber, continueToken, sectionId, answers, isCompleteAction = false) => {
  return await api.put(
    `/public/applications/${registrationNumber}/form/sections/${sectionId}`,
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
