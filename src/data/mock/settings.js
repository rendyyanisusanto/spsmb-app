export const defaultSettings = {
  general: {
    systemName: 'SPSMB Terpadu',
    registrationName: 'Seleksi Penerimaan Santri dan Murid Baru',
    academicYear: '2027/2028'
  },
  registration: {
    enabled: true,
    allowEditAfterSubmit: false,
    registrationPrefix: 'SPSMB',
    defaultPeriodId: 1,
    defaultWaveId: 1
  },
  contact: {
    whatsapp: '081234567890',
    email: 'info@spsmb.com',
    address: 'Jl. Pesantren No. 1, Malang',
    serviceHours: 'Senin - Sabtu, 08.00 - 16.00 WIB'
  },
  whatsapp: {
    enabled: true,
    senderName: 'SPSMB Asy-Syadzili',
    adminNumber: '081234567890',
    defaultScope: 'GLOBAL'
  },
  appearance: {
    headerTitle: 'SPSMB Terpadu',
    headerSubtitle: 'Pondok Pesantren Asy-Syadzili',
    showLogo: true,
    showAcademicYear: true,
    footerMessage: '© 2026 SPSMB Terpadu Asy-Syadzili. All rights reserved.'
  }
}

export const getSettingsMock = async () => {
  await new Promise(resolve => setTimeout(resolve, 300))
  const saved = localStorage.getItem('spsmb_settings')
  if (saved) return { success: true, data: JSON.parse(saved) }
  
  localStorage.setItem('spsmb_settings', JSON.stringify(defaultSettings))
  return { success: true, data: defaultSettings }
}

export const saveSettingsMock = async (settings) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  localStorage.setItem('spsmb_settings', JSON.stringify(settings))
  return { success: true }
}
