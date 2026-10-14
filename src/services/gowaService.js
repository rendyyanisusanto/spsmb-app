/**
 * GOWA WhatsApp Gateway Frontend Service
 */

import api from './api'

export const gowaService = {
  /**
   * Health check of GOWA server
   */
  async checkHealth() {
    return api.get('/gowa/health')
  },

  /**
   * Get WhatsApp connection & login status from GOWA
   */
  async getStatus() {
    return api.get('/gowa/status')
  },

  /**
   * Send test WhatsApp message
   * @param {{ phone: string, message: string }} payload 
   */
  async sendTestMessage(payload) {
    return api.post('/gowa/test-message', payload)
  }
}

export default gowaService
