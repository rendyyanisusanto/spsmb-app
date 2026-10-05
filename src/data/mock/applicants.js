export const mockApplicants = Array.from({ length: 45 }).map((_, i) => {
  const lembagaList = ['SMP IT Asy-Syadzili', 'SMA IT Asy-Syadzili', 'SMK IT Asy-Syadzili', 'Non Formal'];
  const statusList = ['Pendaftaran Awal', 'Form Belum Lengkap', 'Form Lengkap', 'Menunggu Verifikasi', 'Perlu Perbaikan', 'Terverifikasi', 'Selesai'];
  const genderList = ['Laki-laki', 'Perempuan'];
  const gelombangList = ['Gelombang 1', 'Gelombang 2', 'Gelombang 3'];
  const sumberList = ['Instagram', 'Brosur / Pamflet', 'Teman / Kerabat', 'WhatsApp', 'Guru / Karyawan', 'Website Sekolah', 'Facebook'];
  
  return {
    id: i + 1,
    nama: `Calon Siswa ${i + 1}`,
    jenis_kelamin: genderList[i % 2],
    tempat_lahir: 'Malang',
    tanggal_lahir: '2005-08-15T00:00:00.000Z',
    no_hp: `08${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    alamat: `Jl. Pendidikan No. ${i + 1}, Desa Sukamaju, Kec. Sumber, Kab. Malang`,
    nama_wali: `Wali Siswa ${i + 1}`,
    no_hp_wali: `08${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    hubungan_wali: 'Ayah',
    alamat_wali: `Jl. Pendidikan No. ${i + 1}, Desa Sukamaju, Kec. Sumber, Kab. Malang`,
    lembaga_pendidikan: lembagaList[i % 4],
    asal_sekolah: 'SMP N 1 Malang',
    tahun_lulus: '2023',
    nilai_un: '85.5',
    status: statusList[i % statusList.length],
    gelombang: gelombangList[i % gelombangList.length],
    sumber_informasi: sumberList[i % sumberList.length],
    isConfirmed: (i % 3) === 1,
    created_at: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
  };
});

export const getApplicantsMock = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 800));

  let filtered = [...mockApplicants];

  if (params.lembaga) {
    filtered = filtered.filter(p => p.lembaga_pendidikan === params.lembaga);
  }

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(p => 
      p.nama.toLowerCase().includes(q) || 
      p.no_hp.includes(q) || 
      p.nama_wali.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const page = params.page || 1;
  const limit = params.limit || 10;
  const totalPages = Math.ceil(total / limit);

  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

export const getApplicantByIdMock = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const applicant = mockApplicants.find(p => p.id === parseInt(id));
  if (applicant) {
    return { success: true, data: applicant };
  }
  return { success: false, error: 'Data pendaftar tidak ditemukan' };
};
