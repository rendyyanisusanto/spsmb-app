export const CRM_ACTIVITY_TYPES = {
  NOTE: 'NOTE',
  CALL: 'CALL',
  WHATSAPP: 'WHATSAPP',
  CONSULTATION: 'CONSULTATION',
  STATUS_CHANGE: 'STATUS_CHANGE',
  SCHEDULE: 'SCHEDULE'
};

export const CRM_ACTIVITY_TYPE_LABELS = {
  NOTE: 'Catatan Internal',
  CALL: 'Panggilan Telepon',
  WHATSAPP: 'WhatsApp Manual',
  CONSULTATION: 'Konsultasi / Tatap Muka',
  STATUS_CHANGE: 'Perubahan Status',
  SCHEDULE: 'Penjadwalan Follow-up'
};

export const CRM_ACTIVITY_BADGES = {
  NOTE: {
    label: 'Catatan',
    colorClasses: 'bg-slate-100 text-slate-700 border border-slate-200'
  },
  CALL: {
    label: 'Telepon',
    colorClasses: 'bg-blue-50 text-blue-700 border border-blue-200'
  },
  WHATSAPP: {
    label: 'WhatsApp',
    colorClasses: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  },
  CONSULTATION: {
    label: 'Konsultasi',
    colorClasses: 'bg-purple-50 text-purple-700 border border-purple-200'
  },
  STATUS_CHANGE: {
    label: 'Status',
    colorClasses: 'bg-amber-50 text-amber-700 border border-amber-200'
  },
  SCHEDULE: {
    label: 'Jadwal',
    colorClasses: 'bg-cyan-50 text-cyan-700 border border-cyan-200'
  }
};

export const CRM_MESSAGE_STATUS_BADGES = {
  SENT: {
    label: 'Terkirim',
    colorClasses: 'bg-emerald-100 text-emerald-800'
  },
  DELIVERED: {
    label: 'Tersampaikan',
    colorClasses: 'bg-emerald-100 text-emerald-800'
  },
  QUEUED: {
    label: 'Dalam Antrean',
    colorClasses: 'bg-amber-100 text-amber-800'
  },
  FAILED: {
    label: 'Gagal',
    colorClasses: 'bg-red-100 text-red-800'
  },
  UNKNOWN: {
    label: 'Tidak Diketahui',
    colorClasses: 'bg-slate-100 text-slate-800'
  }
};
