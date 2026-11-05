import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Utility to export Admission Completeness Report as Landscape PDF
 */
export const exportAdmissionCompletenessPdf = ({
  applications = [],
  institutionName = 'Semua Lembaga',
  academicYear = 'Semua Tahun Ajaran',
  waveName = 'Semua Gelombang',
  acceptanceFilter = 'Semua Status',
  completenessFilter = 'Semua Status',
  stats = {}
}) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color palette (Emerald & Slate theme)
  const primaryColor = [5, 150, 105]; // emerald-600
  const darkColor = [30, 41, 59]; // slate-800
  const grayColor = [100, 116, 139]; // slate-500
  const lightBg = [248, 250, 252]; // slate-50

  // 1. Top Decorative Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // 2. Report Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...darkColor);
  doc.text('LAPORAN KELENGKAPAN DOKUMEN & PENERIMAAN SISWA', 14, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...grayColor);
  doc.text(
    `Lembaga: ${institutionName}   |   Tahun Ajaran: ${academicYear}   |   Gelombang: ${waveName}`,
    14,
    23
  );

  const printTimeStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  doc.text(
    `Filter Penerimaan: ${acceptanceFilter}   |   Filter Kelengkapan: ${completenessFilter}   |   Dicetak: ${printTimeStr} WIB`,
    14,
    28
  );

  let currentY = 32;

  // 3. Mini Summary Stats Card
  const totalApps = stats.totalApplicants || applications.length || 0;
  const acceptedApps = stats.totalAccepted || 0;
  const pendingApps = stats.totalPending || 0;
  const completedApps = stats.totalCompleted || 0;
  const incompleteApps = stats.totalIncomplete || 0;
  const acceptedIncompleteApps = stats.acceptedIncomplete || 0;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      'Total Pendaftar',
      'Diterima',
      'Belum Diterima',
      'Berkas Lengkap',
      'Berkas Belum Lengkap',
      'Diterima & Belum Lengkap'
    ]],
    body: [[
      String(totalApps),
      `${acceptedApps} (${stats.acceptanceRate || (totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100) : 0)}%)`,
      String(pendingApps),
      `${completedApps} (${stats.completionRate || (totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0)}%)`,
      String(incompleteApps),
      String(acceptedIncompleteApps)
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
    styles: { cellPadding: 2.5 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 4. Main Applicants & Document Completeness Table
  // Format requested:
  // - Nama (Nama Calon Siswa & No Pendaftaran)
  // - Sekolah Asal
  // - L/P
  // - Status diterima
  // - Kelengkapan (jabarkan dan berikan centang kalau sudah selesai)

  const tableBody = applications.map((app, index) => {
    // Requirements breakdown
    let requirementsText = '';
    if (app.requirements && app.requirements.length > 0) {
      requirementsText = app.requirements.map(req => {
        const mark = req.isCompleted ? '[V]' : '[-]';
        const statusNote = req.isCompleted ? 'Selesai' : 'Belum';
        const reqNote = req.isRequired ? '(Wajib)' : '(Opsional)';
        return `${mark} ${req.name} ${reqNote}: ${statusNote}`;
      }).join('\n');
    } else {
      requirementsText = '- Belum ada komponen kelengkapan -';
    }

    const regNum = app.registrationNumber ? `\nNo: ${app.registrationNumber}` : '';
    const inst = app.institutionName ? `\n(${app.institutionName})` : '';

    return [
      String(index + 1),
      `${app.fullName || '-'}${regNum}${inst}`,
      app.previousSchool || '-',
      app.gender || '-',
      app.isAccepted ? 'DITERIMA' : 'BELUM DITERIMA',
      requirementsText
    ];
  });

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      'No',
      'Nama Calon Siswa',
      'Sekolah Asal',
      'L/P',
      'Status Diterima',
      'Rincian Kelengkapan Dokumen / Administrasi'
    ]],
    body: tableBody.length > 0 ? tableBody : [['-', 'Tidak ada data pendaftar sesuai filter', '-', '-', '-', '-']],
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'top',
      cellPadding: 2.5
    },
    columnStyles: {
      0: { width: 10, halign: 'center' },
      1: { width: 55, fontStyle: 'bold' },
      2: { width: 45 },
      3: { width: 12, halign: 'center', fontStyle: 'bold' },
      4: { width: 32, halign: 'center', fontStyle: 'bold' },
      5: { width: 115 }
    },
    didParseCell: (data) => {
      // Highlight Status Diterima
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'DITERIMA') {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
        } else if (data.cell.raw === 'BELUM DITERIMA') {
          data.cell.styles.textColor = [156, 163, 175]; // slate-400
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      doc.text(
        `SPSMB - Laporan Kelengkapan Dokumen | Halaman ${data.pageNumber} dari ${totalPages}`,
        14,
        pageHeight - 6
      );

      const generatedText = `Dicetak otomatis oleh Sistem SPSMB`;
      doc.text(generatedText, pageWidth - 14, pageHeight - 6, { align: 'right' });
    }
  });

  // Save the PDF
  const cleanInst = institutionName.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`Laporan_Kelengkapan_Dokumen_${cleanInst}_${timestamp}.pdf`);
};

