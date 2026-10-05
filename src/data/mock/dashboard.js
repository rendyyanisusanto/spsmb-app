export const dashboardStatsMock = {
  totalApplicants: 325,
  todayApplicants: 18,
  totalUsers: 4,
  completedApplicants: 250,
  incompleteApplicants: 75,
  statsByLembaga: {
    'SMP IT Asy-Syadzili': 80,
    'SMA IT Asy-Syadzili': 70,
    'SMK IT Asy-Syadzili': 130,
    'Non Formal': 45
  }
};

export const recentApplicantsMock = [
  {
    id: 101,
    nama: 'Budi Santoso',
    no_hp: '081234567890',
    lembaga_pendidikan: 'SMK IT Asy-Syadzili',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 102,
    nama: 'Siti Aminah',
    no_hp: '089876543210',
    lembaga_pendidikan: 'SMA IT Asy-Syadzili',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 103,
    nama: 'Andi Setiawan',
    no_hp: '085678901234',
    lembaga_pendidikan: 'SMP IT Asy-Syadzili',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 104,
    nama: 'Rina Wahyuni',
    no_hp: '081122334455',
    lembaga_pendidikan: 'Non Formal',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 105,
    nama: 'Dewi Lestari',
    no_hp: '082233445566',
    lembaga_pendidikan: 'SMK IT Asy-Syadzili',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
];

export const fetchDashboardDataMock = async (role, lembagaName) => {
  await new Promise(resolve => setTimeout(resolve, 600));

  let stats = { ...dashboardStatsMock };
  let recent = [...recentApplicantsMock];

  if (role === 'ADMIN_SPSMB' && lembagaName) {
    // Filter stats for lembaga
    stats.totalApplicants = stats.statsByLembaga[lembagaName] || 0;
    stats.todayApplicants = 5; // dummy
    stats.statsByLembaga = { [lembagaName]: stats.statsByLembaga[lembagaName] };
    recent = recent.filter(p => p.lembaga_pendidikan === lembagaName);
  }

  return { success: true, stats, recent };
};
