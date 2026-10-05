const baseLogs = [
  {
    id: 1,
    applicantId: 1,
    registrationNumber: 'SPSMB-2027-00001',
    studentName: 'Ahmad Fauzan',
    recipientName: 'Abdul Karim',
    whatsapp: '081234567890',
    institutionId: 4,
    institutionName: 'SMK IT Asy-Syadzili',
    event: 'INITIAL_REGISTRATION_SUCCESS',
    templateId: 1,
    templateName: 'Pendaftaran Awal Berhasil',
    templateScope: 'GLOBAL',
    message: 'Assalamu’alaikum Bapak/Ibu Abdul Karim,\n\nPendaftaran awal atas nama Ahmad Fauzan telah berhasil kami terima.\n\nNomor Pendaftaran:\nSPSMB-2027-00001\n\nLembaga:\nSMK IT Asy-Syadzili',
    status: 'DELIVERED',
    errorCode: null,
    errorMessage: null,
    createdAt: '2026-09-30 08:15',
    sentAt: '2026-09-30 08:16',
    deliveredAt: '2026-09-30 08:16'
  },
  {
    id: 2,
    applicantId: 2,
    registrationNumber: 'SPSMB-2027-00002',
    studentName: 'Siti Aminah',
    recipientName: 'Budi Santoso',
    whatsapp: '085678901234',
    institutionId: 2,
    institutionName: 'SMP IT Asy-Syadzili',
    event: 'FORM_INCOMPLETE',
    templateId: 2,
    templateName: 'Form Belum Lengkap',
    templateScope: 'GLOBAL',
    message: 'Assalamu’alaikum Bapak/Ibu Budi Santoso,\n\nMohon maaf, form pendaftaran atas nama Siti Aminah belum lengkap. Silakan login kembali untuk melengkapi data pendaftaran.',
    status: 'FAILED',
    errorCode: 'WA_TIMEOUT',
    errorMessage: 'Gateway tidak memberikan respons.',
    createdAt: '2026-09-30 09:00',
    sentAt: null,
    deliveredAt: null
  },
  {
    id: 3,
    applicantId: 3,
    registrationNumber: 'SPSMB-2027-00003',
    studentName: 'Muhammad Rizki',
    recipientName: 'Sholeh',
    whatsapp: '089876543210',
    institutionId: 4,
    institutionName: 'SMK IT Asy-Syadzili',
    event: 'FULL_REGISTRATION_SUBMITTED',
    templateId: 3,
    templateName: 'Pendaftaran Berhasil Dikirim',
    templateScope: 'LEMBAGA',
    message: 'Assalamu’alaikum Bapak/Ibu Sholeh,\n\nPendaftaran lengkap atas nama Muhammad Rizki telah kami terima khusus untuk SMK IT Asy-Syadzili. Berkas sedang diverifikasi.',
    status: 'SENT',
    errorCode: null,
    errorMessage: null,
    createdAt: '2026-09-30 10:30',
    sentAt: '2026-09-30 10:31',
    deliveredAt: null
  },
  {
    id: 4,
    applicantId: 4,
    registrationNumber: 'SPSMB-2027-00004',
    studentName: 'Nurul Hidayah',
    recipientName: 'Hasanah',
    whatsapp: '082233445566',
    institutionId: 3,
    institutionName: 'SMA IT Asy-Syadzili',
    event: 'DOCUMENT_REVISION_REQUIRED',
    templateId: 4,
    templateName: 'Dokumen Perlu Diperbaiki',
    templateScope: 'GLOBAL',
    message: 'Assalamu’alaikum Bapak/Ibu Hasanah,\n\nDokumen Kartu Keluarga atas nama Nurul Hidayah perlu perbaikan. Catatan: Scan buram, mohon upload ulang.',
    status: 'DELIVERED',
    errorCode: null,
    errorMessage: null,
    createdAt: '2026-09-30 11:45',
    sentAt: '2026-09-30 11:46',
    deliveredAt: '2026-09-30 11:47'
  },
  {
    id: 5,
    applicantId: 5,
    registrationNumber: 'SPSMB-2027-00005',
    studentName: 'Irfan Hakim',
    recipientName: 'Lukman',
    whatsapp: '087766554433',
    institutionId: 1,
    institutionName: 'Non Formal',
    event: 'DOCUMENTS_VERIFIED',
    templateId: 5,
    templateName: 'Berkas Terverifikasi',
    templateScope: 'GLOBAL',
    message: 'Assalamu’alaikum Bapak/Ibu Lukman,\n\nSeluruh berkas pendaftaran atas nama Irfan Hakim telah selesai diverifikasi. Menunggu informasi tes selanjutnya.',
    status: 'PENDING',
    errorCode: null,
    errorMessage: null,
    createdAt: '2026-09-30 14:00',
    sentAt: null,
    deliveredAt: null
  }
];

// Generate 45 more mock data procedurally to reach 50
const institutions = [
  { id: 1, name: 'Non Formal' },
  { id: 2, name: 'SMP IT Asy-Syadzili' },
  { id: 3, name: 'SMA IT Asy-Syadzili' },
  { id: 4, name: 'SMK IT Asy-Syadzili' }
];

const events = [
  { event: 'INITIAL_REGISTRATION_SUCCESS', name: 'Pendaftaran Awal Berhasil' },
  { event: 'FORM_INCOMPLETE', name: 'Form Belum Lengkap' },
  { event: 'FULL_REGISTRATION_SUBMITTED', name: 'Pendaftaran Berhasil Dikirim' },
  { event: 'DOCUMENT_REVISION_REQUIRED', name: 'Dokumen Perlu Diperbaiki' },
  { event: 'DOCUMENTS_VERIFIED', name: 'Berkas Terverifikasi' },
  { event: 'APPLICATION_STATUS_CHANGED', name: 'Status Pendaftaran Berubah' },
  { event: 'ANNOUNCEMENT', name: 'Pengumuman / Informasi' }
];

const statuses = ['PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED'];

const names = ['Agus', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gita', 'Hadi', 'Intan', 'Joko'];
const parentNames = ['Wawan', 'Susanto', 'Rina', 'Handayani', 'Pratama'];

for (let i = 6; i <= 50; i++) {
  const inst = institutions[i % institutions.length];
  const evt = events[i % events.length];
  const status = statuses[i % statuses.length];
  const student = names[i % names.length] + ' ' + (i % 2 === 0 ? 'Saputra' : 'Sari');
  const parent = parentNames[i % parentNames.length];
  
  let errorCode = null;
  let errorMessage = null;
  if (status === 'FAILED') {
    errorCode = i % 2 === 0 ? 'WA_TIMEOUT' : 'NUMBER_INVALID';
    errorMessage = i % 2 === 0 ? 'Gateway tidak memberikan respons.' : 'Nomor WhatsApp tidak valid atau tidak terdaftar.';
  }

  const padId = String(i).padStart(5, '0');
  const day = String(1 + (i % 30)).padStart(2, '0');
  const hour = String(8 + (i % 10)).padStart(2, '0');
  const minute = String(i % 60).padStart(2, '0');
  const timeStr = `2026-09-${day} ${hour}:${minute}`;

  baseLogs.push({
    id: i,
    applicantId: i,
    registrationNumber: `SPSMB-2027-${padId}`,
    studentName: student,
    recipientName: parent,
    whatsapp: `081${Math.floor(100000000 + Math.random() * 900000000)}`,
    institutionId: inst.id,
    institutionName: inst.name,
    event: evt.event,
    templateId: i % 10,
    templateName: evt.name,
    templateScope: i % 3 === 0 ? 'LEMBAGA' : 'GLOBAL',
    message: `Assalamu’alaikum Bapak/Ibu ${parent},\n\nNotifikasi sistem SPSMB untuk calon santri ${student}. Event: ${evt.name}.\n\nLembaga: ${inst.name}.`,
    status: status,
    errorCode: errorCode,
    errorMessage: errorMessage,
    createdAt: timeStr,
    sentAt: status === 'PENDING' || status === 'PROCESSING' || status === 'FAILED' ? null : timeStr,
    deliveredAt: status === 'DELIVERED' ? timeStr : null
  });
}

// Sort newest first
baseLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const getWhatsappLogsMock = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: baseLogs
      });
    }, 500);
  });
};
