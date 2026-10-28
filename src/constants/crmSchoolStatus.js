export const CRM_SCHOOL_STATUS = {
  LEADS: 'LEADS',
  FOLLOWED_UP: 'FOLLOWED_UP',
  REJECTED: 'REJECTED',
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED'
};

export const CRM_SCHOOL_STATUS_LABELS = {
  [CRM_SCHOOL_STATUS.LEADS]: 'Leads',
  [CRM_SCHOOL_STATUS.FOLLOWED_UP]: 'Sudah di-follow up',
  [CRM_SCHOOL_STATUS.REJECTED]: 'Ditolak',
  [CRM_SCHOOL_STATUS.SCHEDULED]: 'Dijadwalkan',
  [CRM_SCHOOL_STATUS.COMPLETED]: 'Selesai'
};

export const CRM_SCHOOL_STATUS_BADGES = {
  [CRM_SCHOOL_STATUS.LEADS]: {
    label: 'Leads',
    class: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500'
  },
  [CRM_SCHOOL_STATUS.FOLLOWED_UP]: {
    label: 'Sudah di-follow up',
    class: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500'
  },
  [CRM_SCHOOL_STATUS.REJECTED]: {
    label: 'Ditolak',
    class: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dot: 'bg-rose-500'
  },
  [CRM_SCHOOL_STATUS.SCHEDULED]: {
    label: 'Dijadwalkan',
    class: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    dot: 'bg-indigo-500'
  },
  [CRM_SCHOOL_STATUS.COMPLETED]: {
    label: 'Selesai',
    class: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500'
  }
};

export const EDUCATION_LEVEL_OPTIONS = [
  'SMP',
  'MTs',
  'SMA',
  'SMK',
  'MA',
  'Pondok Pesantren',
  'Lainnya'
];

export const getStatusBadge = (status) => {
  return CRM_SCHOOL_STATUS_BADGES[status] || {
    label: status || '-',
    class: 'bg-slate-100 text-slate-700 border border-slate-200',
    dot: 'bg-slate-400'
  };
};
