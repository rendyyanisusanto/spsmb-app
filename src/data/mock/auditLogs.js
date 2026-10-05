const baseLogs = [
  {
    id: 1,
    userId: 1,
    userName: 'Super Admin',
    username: 'admin',
    role: 'SUPER_ADMIN',
    institutionId: null,
    institutionName: 'Global',
    action: 'LOGIN',
    module: 'AUTH',
    targetType: null,
    targetId: null,
    targetName: null,
    description: 'Login ke dalam sistem SPSMB',
    before: null,
    after: null,
    createdAt: '2026-09-30 07:30'
  },
  {
    id: 2,
    userId: 2,
    userName: 'Admin SMK',
    username: 'adminsmk',
    role: 'ADMIN_SPSMB',
    institutionId: 4,
    institutionName: 'SMK IT Asy-Syadzili',
    action: 'LOGIN',
    module: 'AUTH',
    targetType: null,
    targetId: null,
    targetName: null,
    description: 'Login ke dalam sistem SPSMB',
    before: null,
    after: null,
    createdAt: '2026-09-30 07:35'
  },
  {
    id: 3,
    userId: 1,
    userName: 'Super Admin',
    username: 'admin',
    role: 'SUPER_ADMIN',
    institutionId: null,
    institutionName: 'Global',
    action: 'FORM_CONFIG_UPDATE',
    module: 'FORM',
    targetType: 'FIELD',
    targetId: 'field_12',
    targetName: 'Pilihan Jurusan',
    description: 'Mengubah status Required pada form Pilihan Jurusan',
    before: { required: false },
    after: { required: true },
    createdAt: '2026-09-30 08:00'
  },
  {
    id: 4,
    userId: 2,
    userName: 'Admin SMK',
    username: 'adminsmk',
    role: 'ADMIN_SPSMB',
    institutionId: 4,
    institutionName: 'SMK IT Asy-Syadzili',
    action: 'DOCUMENT_VERIFY',
    module: 'DOCUMENT',
    targetType: 'APPLICANT_DOCUMENT',
    targetId: 10,
    targetName: 'Kartu Keluarga - Ahmad Fauzan',
    description: 'Memverifikasi dokumen Kartu Keluarga pendaftar',
    before: { status: 'UPLOADED' },
    after: { status: 'VERIFIED' },
    createdAt: '2026-09-30 08:15'
  },
  {
    id: 5,
    userId: 2,
    userName: 'Admin SMK',
    username: 'adminsmk',
    role: 'ADMIN_SPSMB',
    institutionId: 4,
    institutionName: 'SMK IT Asy-Syadzili',
    action: 'STATUS_CHANGE',
    module: 'APPLICANT',
    targetType: 'APPLICANT',
    targetId: 1,
    targetName: 'Ahmad Fauzan',
    description: 'Mengubah status pendaftaran menjadi Terverifikasi',
    before: { status: 'Menunggu Verifikasi' },
    after: { status: 'Terverifikasi' },
    createdAt: '2026-09-30 08:16'
  }
];

// Generate more to reach ~50
const institutions = [
  { id: 2, name: 'SMP IT Asy-Syadzili', role: 'ADMIN_SPSMB', userName: 'Admin SMP', username: 'adminsmp' },
  { id: 3, name: 'SMA IT Asy-Syadzili', role: 'ADMIN_SPSMB', userName: 'Admin SMA', username: 'adminsma' },
  { id: 4, name: 'SMK IT Asy-Syadzili', role: 'ADMIN_SPSMB', userName: 'Admin SMK', username: 'adminsmk' },
  { id: 1, name: 'Non Formal', role: 'ADMIN_SPSMB', userName: 'Admin NF', username: 'adminnf' }
];

const actions = [
  { action: 'DOCUMENT_VERIFY', module: 'DOCUMENT', targetType: 'APPLICANT_DOCUMENT', desc: 'Memverifikasi dokumen' },
  { action: 'DOCUMENT_REVISION', module: 'DOCUMENT', targetType: 'APPLICANT_DOCUMENT', desc: 'Meminta perbaikan dokumen' },
  { action: 'STATUS_CHANGE', module: 'APPLICANT', targetType: 'APPLICANT', desc: 'Mengubah status pendaftaran' },
  { action: 'UPDATE', module: 'APPLICANT', targetType: 'APPLICANT', desc: 'Memperbarui data pendaftar' },
  { action: 'WHATSAPP_TEMPLATE_UPDATE', module: 'WHATSAPP', targetType: 'TEMPLATE', desc: 'Memperbarui template WhatsApp khusus lembaga' },
  { action: 'EXPORT', module: 'REPORT', targetType: 'REPORT_EXCEL', desc: 'Mengunduh laporan pendaftar' }
];

for (let i = 6; i <= 50; i++) {
  const isSuper = i % 7 === 0;
  let user;
  if (isSuper) {
    user = { id: 1, userName: 'Super Admin', username: 'admin', role: 'SUPER_ADMIN', institutionId: null, institutionName: 'Global' };
  } else {
    const inst = institutions[i % institutions.length];
    user = { id: inst.id + 1, userName: inst.userName, username: inst.username, role: inst.role, institutionId: inst.id, institutionName: inst.name };
  }
  
  const act = actions[i % actions.length];
  
  const padId = String(i).padStart(5, '0');
  const day = String(1 + (i % 30)).padStart(2, '0');
  const hour = String(9 + (i % 8)).padStart(2, '0');
  const minute = String(i % 60).padStart(2, '0');
  const timeStr = `2026-09-${day} ${hour}:${minute}`;
  
  let before = null;
  let after = null;
  
  if (act.action === 'STATUS_CHANGE') {
    before = { status: 'Menunggu Verifikasi' };
    after = { status: 'Terverifikasi' };
  } else if (act.action === 'DOCUMENT_REVISION') {
    before = { status: 'UPLOADED' };
    after = { status: 'REVISION', note: 'Scan tidak jelas' };
  } else if (act.action === 'DOCUMENT_VERIFY') {
    before = { status: 'UPLOADED' };
    after = { status: 'VERIFIED' };
  }

  baseLogs.push({
    id: i,
    userId: user.id,
    userName: user.userName,
    username: user.username,
    role: user.role,
    institutionId: user.institutionId,
    institutionName: user.institutionName,
    action: act.action,
    module: act.module,
    targetType: act.targetType,
    targetId: 100 + i,
    targetName: act.targetType === 'TEMPLATE' ? 'Pendaftaran Awal Berhasil' : `Target ID ${100 + i}`,
    description: `${act.desc} ${act.targetType === 'TEMPLATE' ? '' : 'Calon Santri'}`,
    before,
    after,
    createdAt: timeStr
  });
}

baseLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const getAuditLogsMock = () => {
  return new Promise((resolve) => {
    // If we have localStorage, merge them.
    const saved = localStorage.getItem('spsmb_audit_logs');
    let allLogs = [...baseLogs];
    if (saved) {
      allLogs = JSON.parse(saved);
    } else {
      localStorage.setItem('spsmb_audit_logs', JSON.stringify(baseLogs));
    }
    
    setTimeout(() => {
      resolve({
        success: true,
        data: allLogs
      });
    }, 500);
  });
};
