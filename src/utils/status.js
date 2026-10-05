const STATUS_LABELS = {
  // Registration Status
  'FULL_REGISTRATION_SUBMITTED': 'Pendaftaran Berhasil Dikirim',
  'DOCUMENT_REVISION_REQUIRED': 'Perlu Perbaikan Dokumen',
  'VERIFIED': 'Terverifikasi',
  'NEW': 'Baru',
  'DRAFT': 'Draft',
  
  // WhatsApp Status
  'SENT': 'Terkirim',
  'FAILED': 'Gagal',
  'PENDING': 'Menunggu',
  
  // Common Status
  'ACTIVE': 'Aktif',
  'INACTIVE': 'Nonaktif',
  
  'COMPLETE': 'Lengkap',
  'INCOMPLETE': 'Belum Lengkap',
};

const STATUS_COLORS = {
  'FULL_REGISTRATION_SUBMITTED': 'primary',
  'DOCUMENT_REVISION_REQUIRED': 'warning',
  'VERIFIED': 'success',
  'NEW': 'info',
  'DRAFT': 'secondary',
  
  'SENT': 'success',
  'FAILED': 'danger',
  'PENDING': 'warning',
  
  'ACTIVE': 'success',
  'INACTIVE': 'secondary',
  
  'COMPLETE': 'success',
  'INCOMPLETE': 'warning',
};

export const getStatusLabel = (statusKey) => {
  if (!statusKey) return '-';
  return STATUS_LABELS[statusKey] || statusKey;
};

export const getStatusColor = (statusKey) => {
  if (!statusKey) return 'secondary';
  return STATUS_COLORS[statusKey] || 'secondary';
};
