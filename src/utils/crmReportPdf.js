import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@/utils/date';
import { formatPhoneDisplay } from '@/utils/phone';

export const exportCrmReportPdf = ({
  report,
  institutionName = 'Semua Lembaga',
  periodLabel = 'Semua Periode'
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [16, 185, 129]; // emerald-500
  const darkColor = [30, 41, 59]; // slate-800
  const lightBg = [248, 250, 252]; // slate-50

  // 1. Header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...darkColor);
  doc.text('LAPORAN CRM & PERFORMA SPMB', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Lembaga: ${institutionName}  |  Periode: ${periodLabel}`, 14, 29);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`, 14, 35);

  let currentY = 42;

  // 2. KPI Cards as Table
  const kpis = report.kpis || {};
  const rates = kpis.rates || {};

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Total Prospek', 'Lead Baru', 'Sudah Dihubungi', 'Belum Dihubungi', 'Dalam Follow-up', 'Konversi', 'Batal']],
    body: [[
      kpis.totalLeads?.toLocaleString('id-ID') || '0',
      kpis.newLeads?.toLocaleString('id-ID') || '0',
      kpis.contactedLeads?.toLocaleString('id-ID') || '0',
      kpis.uncontactedLeads?.toLocaleString('id-ID') || '0',
      kpis.inFollowUp?.toLocaleString('id-ID') || '0',
      `${kpis.convertedLeads?.toLocaleString('id-ID') || 0} (${rates.conversionRate || 0}%)`,
      kpis.notInterestedLeads?.toLocaleString('id-ID') || '0'
    ]],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: 'center',
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      halign: 'center',
      fontStyle: 'bold',
      textColor: [15, 23, 42]
    },
    styles: { cellPadding: 3 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 3. Conversion & Follow-up Performance Indicators
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('Indikator Performa Utama (Key Metrics)', 14, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    head: [['Indikator', 'Formula Perhitungan', 'Hasil (%)', 'Keterangan']],
    body: [
      ['Follow-up Rate', 'Prospek Sudah Dihubungi / Total Prospek', `${rates.followUpRate || 0}%`, 'Cakupan prospek yang berhasil dijangkau oleh tim'],
      ['Conversion Rate', 'Prospek Berhasil Mendaftar / Total Prospek', `${rates.conversionRate || 0}%`, 'Tingkat efektivitas konversi prospek menjadi pendaftar resmi'],
      ['Non-Response Rate', 'Prospek Belum Respons / Prospek Sudah Dihubungi', `${rates.nonResponseRate || 0}%`, 'Prospek yang belum memberikan respon balik setelah dikontak'],
      ['Uncontacted Rate', 'Prospek Belum Dihubungi / Total Prospek', `${rates.uncontactedRate || 0}%`, 'Prospek dalam antrean yang perlu segera ditindaklanjuti']
    ],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 35 },
      1: { width: 60, textColor: [100, 116, 139] },
      2: { fontStyle: 'bold', halign: 'center', width: 22 },
      3: { width: 65 }
    },
    styles: { cellPadding: 2.5 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 4. Funnel Calon Peserta Didik
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('Funnel Perjalanan Calon Peserta Didik', 14, currentY);
  currentY += 4;

  const funnelRows = (report.funnel || []).map(f => [
    `Tahap ${f.stage}: ${f.name}`,
    f.description,
    f.count.toLocaleString('id-ID'),
    `${f.percentageOfTotal}%`,
    `${f.conversionFromPrevious}%`,
    f.stage > 1 ? `${f.dropOffRate}%` : '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['Tahapan Funnel', 'Deskripsi Tahap', 'Jumlah', '% Total', '% Konversi Tahap', '% Drop-off']],
    body: funnelRows,
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45 },
      1: { width: 60 },
      2: { halign: 'center', fontStyle: 'bold', width: 20 },
      3: { halign: 'center', width: 18 },
      4: { halign: 'center', width: 23 },
      5: { halign: 'center', width: 16 }
    },
    styles: { cellPadding: 2.5 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Page break check for Officer ranking
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // 5. Performa Petugas SPMB
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('Ranking Performa Petugas SPMB', 14, currentY);
  currentY += 4;

  const officerRows = (report.officerPerformance || []).map(o => [
    `#${o.rank}`,
    o.officerName,
    o.totalLeads.toLocaleString('id-ID'),
    o.contactedLeads.toLocaleString('id-ID'),
    o.uncontactedLeads.toLocaleString('id-ID'),
    o.totalActivities.toLocaleString('id-ID'),
    o.convertedLeads.toLocaleString('id-ID'),
    `${o.conversionRate}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Rank', 'Nama Petugas', 'Prospek', 'Dihubungi', 'Belum', 'Aktivitas', 'Konversi', 'Conv. Rate']],
    body: officerRows.length > 0 ? officerRows : [['-', 'Belum ada data petugas', '-', '-', '-', '-', '-', '-']],
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: 'center',
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { halign: 'center', width: 14, fontStyle: 'bold' },
      1: { fontStyle: 'bold', width: 48 },
      2: { halign: 'center', width: 20 },
      3: { halign: 'center', width: 20 },
      4: { halign: 'center', width: 18 },
      5: { halign: 'center', width: 20 },
      6: { halign: 'center', width: 20, fontStyle: 'bold' },
      7: { halign: 'center', width: 22, fontStyle: 'bold' }
    },
    styles: { cellPadding: 2.5 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Page break check for Schools & Actionable
  doc.addPage();
  currentY = 20;

  // 6. Analisis Sumber & Asal Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('Analisis Saluran Promosi & Asal Sekolah', 14, currentY);
  currentY += 4;

  const schoolRows = (report.schoolAnalysis || []).slice(0, 10).map(s => [
    s.schoolName,
    s.totalLeads.toLocaleString('id-ID'),
    s.convertedLeads.toLocaleString('id-ID'),
    `${s.conversionRate}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['Asal SMP/MTs', 'Jumlah Prospek', 'Berhasil Konversi', 'Conversion Rate']],
    body: schoolRows.length > 0 ? schoolRows : [['-', '-', '-', '-']],
    headStyles: {
      fillColor: [100, 116, 139],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 90 },
      1: { halign: 'center', width: 30 },
      2: { halign: 'center', width: 30 },
      3: { halign: 'center', width: 32, fontStyle: 'bold' }
    },
    styles: { cellPadding: 2 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 7. Tabel Prospek Membutuhkan Tindak Lanjut
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('Prioritas Prospek yang Membutuhkan Tindak Lanjut', 14, currentY);
  currentY += 4;

  const actionableRows = (report.actionableLeads || []).slice(0, 15).map(l => [
    l.fullName,
    l.schoolOrigin || '-',
    formatPhoneDisplay(l.phone) || '-',
    l.status,
    l.leadByName || 'Belum Ditugaskan',
    l.nextFollowUpAt ? formatDate(l.nextFollowUpAt) : (l.isOverdue ? 'TERLEWAT' : '-')
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Nama Calon Siswa', 'Asal Sekolah', 'No. WhatsApp', 'Status', 'Petugas', 'Jadwal / Ket.']],
    body: actionableRows.length > 0 ? actionableRows : [['-', 'Semua prospek telah tertangani', '-', '-', '-', '-']],
    headStyles: {
      fillColor: [245, 158, 11],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45 },
      1: { width: 35 },
      2: { width: 28 },
      3: { width: 25 },
      4: { width: 27 },
      5: { width: 22 }
    },
    styles: { cellPadding: 2 }
  });

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`SPSMB Asy-Syadzili — Dashboard Laporan CRM | Halaman ${i} dari ${pageCount}`, 14, 290);
  }

  // Trigger download
  const safeInstName = institutionName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_CRM_SPMB_${safeInstName}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

