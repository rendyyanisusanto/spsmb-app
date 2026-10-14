import api from './api'

const publicRegistrationService = {
  getInformationSources() {
    return api.get('/public/information-sources')
  },
  
  createInitialApplication(data) {
    return api.post('/public/applications', data)
  },
  
  getRegistrationReceipt(registrationNumber, continueToken) {
    const encodedToken = encodeURIComponent(continueToken || '');
    return api.get(`/public/applications/${registrationNumber}/receipt?token=${encodedToken}`, {
      headers: {
        'x-continue-token': continueToken
      }
    })
  }
}

export default publicRegistrationService
