export const CRM_LEAD_STATUS = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  INTERESTED: 'INTERESTED',
  FOLLOW_UP: 'FOLLOW_UP',
  READY_TO_REGISTER: 'READY_TO_REGISTER',
  CONVERTED: 'CONVERTED',
  NOT_INTERESTED: 'NOT_INTERESTED'
}

export const CRM_LEAD_STATUS_LABELS = {
  [CRM_LEAD_STATUS.NEW]: 'Lead Baru',
  [CRM_LEAD_STATUS.CONTACTED]: 'Sudah Dihubungi',
  [CRM_LEAD_STATUS.INTERESTED]: 'Tertarik',
  [CRM_LEAD_STATUS.FOLLOW_UP]: 'Perlu Follow-up',
  [CRM_LEAD_STATUS.READY_TO_REGISTER]: 'Siap Mendaftar',
  [CRM_LEAD_STATUS.CONVERTED]: 'Berhasil Dikonversi',
  [CRM_LEAD_STATUS.NOT_INTERESTED]: 'Tidak Berminat'
}

export const CRM_LEAD_STATUS_BADGES = {
  [CRM_LEAD_STATUS.NEW]: {
    variant: 'info',
    colorClasses: 'bg-blue-50 text-blue-700 border border-blue-200'
  },
  [CRM_LEAD_STATUS.CONTACTED]: {
    variant: 'warning',
    colorClasses: 'bg-amber-50 text-amber-700 border border-amber-200'
  },
  [CRM_LEAD_STATUS.INTERESTED]: {
    variant: 'info',
    colorClasses: 'bg-indigo-50 text-indigo-700 border border-indigo-200'
  },
  [CRM_LEAD_STATUS.FOLLOW_UP]: {
    variant: 'warning',
    colorClasses: 'bg-orange-50 text-orange-700 border border-orange-200'
  },
  [CRM_LEAD_STATUS.READY_TO_REGISTER]: {
    variant: 'success',
    colorClasses: 'bg-teal-50 text-teal-700 border border-teal-200'
  },
  [CRM_LEAD_STATUS.CONVERTED]: {
    variant: 'success',
    colorClasses: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  },
  [CRM_LEAD_STATUS.NOT_INTERESTED]: {
    variant: 'danger',
    colorClasses: 'bg-rose-50 text-rose-700 border border-rose-200'
  }
}
