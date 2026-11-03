import * as XLSX from 'xlsx';

export const exportCrmReportExcel = ({
  report,
  institutionName = 'Semua Lembaga',
  periodLabel = 'Semua Periode'
}) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan & KPI
  const kpis = report.kpis || {};
  const rates = kpis.rates || {};
  const summaryData = [
    { Parameter: 'Nama Laporan', Nilai: 'Dashboard Laporan CRM & Performa SPMB' },
    { Parameter: 'Lembaga', Nilai: institutionName },
    { Parameter: 'Periode Filter', Nilai: periodLabel },
    { Parameter: 'Tanggal Ekspor', Nilai: new Date().toLocaleString('id-ID') },
    { Parameter: '', Nilai: '' },
    { Parameter: '--- RINGKASAN STATISTIK (KPI) ---', Nilai: '' },
    { Parameter: 'Total Prospek Lead', Nilai: kpis.totalLeads || 0 },
    { Parameter: 'Lead Baru (Periode Terpilih)', Nilai: kpis.newLeads || 0 },
    { Parameter: 'Sudah Difollow-up', Nilai: kpis.contactedLeads || 0 },
    { Parameter: 'Belum Difollow-up', Nilai: kpis.uncontactedLeads || 0 },
    { Parameter: 'Dalam Follow-up (Aktif)', Nilai: kpis.inFollowUp || 0 },
    { Parameter: 'Berhasil Konversi (Mendaftar)', Nilai: kpis.convertedLeads || 0 },
    { Parameter: 'Tidak Berlanjut (Batal)', Nilai: kpis.notInterestedLeads || 0 },
    { Parameter: '', Nilai: '' },
    { Parameter: '--- INDIKATOR PERFORMA TINGKAT KONVERSI ---', Nilai: '' },
    { Parameter: 'Follow-up Rate', Nilai: `${rates.followUpRate || 0}%` },
    { Parameter: 'Conversion Rate', Nilai: `${rates.conversionRate || 0}%` },
    { Parameter: 'Non-Response Rate', Nilai: `${rates.nonResponseRate || 0}%` },
    { Parameter: 'Uncontacted Rate', Nilai: `${rates.uncontactedRate || 0}%` }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan & KPI');

  // Sheet 2: Funnel Calon Siswa
  const funnelData = (report.funnel || []).map(f => ({
    'Tahap': `Tahap ${f.stage}`,
    'Nama Tahap': f.name,
    'Deskripsi': f.description,
    'Jumlah Prospek': f.count,
    '% dari Total Masuk': `${f.percentageOfTotal}%`,
    '% Konversi dari Tahap Sebelumnya': `${f.conversionFromPrevious}%`,
    '% Drop-off': `${f.dropOffRate}%`
  }));
  const wsFunnel = XLSX.utils.json_to_sheet(funnelData);
  XLSX.utils.book_append_sheet(wb, wsFunnel, 'Funnel Calon Siswa');

  // Sheet 3: Performa Petugas
  const officerData = (report.officerPerformance || []).map(o => ({
    'Ranking': o.rank,
    'Nama Petugas': o.officerName,
    'Kontak/Telepon': o.officerPhone || '-',
    'Jumlah Prospek Ditangani': o.totalLeads,
    'Sudah Dihubungi': o.contactedLeads,
    'Belum Dihubungi': o.uncontactedLeads,
    'Total Aktivitas Follow-up': o.totalActivities,
    'Berhasil Konversi': o.convertedLeads,
    'Conversion Rate (%)': `${o.conversionRate}%`,
    'Follow-up Rate (%)': `${o.followUpRate}%`
  }));
  const wsOfficers = XLSX.utils.json_to_sheet(officerData);
  XLSX.utils.book_append_sheet(wb, wsOfficers, 'Performa Petugas');

  // Sheet 4: Analisis Sumber & Sekolah
  const sourceData = (report.sourceAnalysis || []).map(s => ({
    'Saluran Promosi / Sumber': s.sourceName,
    'Jumlah Prospek': s.totalLeads,
    'Berhasil Konversi': s.convertedLeads,
    'Conversion Rate (%)': `${s.conversionRate}%`,
    'Pangsa Prospek (%)': `${s.percentage}%`
  }));
  const wsSources = XLSX.utils.json_to_sheet(sourceData);
  XLSX.utils.book_append_sheet(wb, wsSources, 'Sumber Prospek');

  const schoolData = (report.schoolAnalysis || []).map(s => ({
    'Asal SMP/MTs': s.schoolName,
    'Jumlah Prospek': s.totalLeads,
    'Berhasil Konversi': s.convertedLeads,
    'Conversion Rate (%)': `${s.conversionRate}%`
  }));
  const wsSchools = XLSX.utils.json_to_sheet(schoolData);
  XLSX.utils.book_append_sheet(wb, wsSchools, 'Asal Sekolah');

  // Sheet 5: Actionable Leads
  const actionableData = (report.actionableLeads || []).map((l, index) => ({
    'No': index + 1,
    'Nama Calon Siswa': l.fullName,
    'Asal Sekolah': l.schoolOrigin || '-',
    'No. HP / WhatsApp': l.phone || '-',
    'Status Lead': l.status,
    'Petugas Penangan': l.leadByName,
    'Lembaga': l.institutionName,
    'Terakhir Dihubungi': l.lastContactedAt ? new Date(l.lastContactedAt).toLocaleDateString('id-ID') : 'Belum Pernah',
    'Jadwal Follow-up': l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleDateString('id-ID') : '-',
    'Status Jadwal': l.isOverdue ? 'TERLEWAT (OVERDUE)' : 'Normal',
    'Catatan': l.notes || '-'
  }));
  const wsActionable = XLSX.utils.json_to_sheet(actionableData);
  XLSX.utils.book_append_sheet(wb, wsActionable, 'Daftar Tindak Lanjut');

  // Write file
  const safeInstName = institutionName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Laporan_CRM_SPMB_${safeInstName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

