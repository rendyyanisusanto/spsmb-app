import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CRM_SCHOOL_STATUS_BADGES } from '@/constants/crmSchoolStatus';
import { resolveStorageUrl } from '@/utils/imageUrl';

/**
 * Helper to load an image as base64 data URL for jsPDF
 * Uses fetch blob first (safe from CORS canvas tainting), with Canvas fallback.
 */
const loadImageAsBase64 = async (rawUrl) => {
  if (!rawUrl) return null;
  const fullUrl = resolveStorageUrl(rawUrl);

  // 1. Try fetch as blob first
  try {
    const res = await fetch(fullUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });

      if (dataUrl) {
        return await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              dataUrl,
              width: img.naturalWidth || 800,
              height: img.naturalHeight || 600
            });
          };
          img.onerror = () => resolve({ dataUrl, width: 800, height: 600 });
          img.src = dataUrl;
        });
      }
    }
  } catch (_) {
    // Fall back to Image + Canvas
  }

  // 2. Fallback to Image element + Canvas
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const maxDim = 1000;
        let w = img.naturalWidth || img.width || 800;
        let h = img.naturalHeight || img.height || 600;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ dataUrl, width: w, height: h });
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = fullUrl;
  });
};

/**
 * Format date in Indonesian locale
 */
const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    if (includeTime) {
      return (
        d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB'
      );
    }
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (_) {
    return String(dateString);
  }
};

/**
 * Generate PDF Report for School Target and Presentation Reports Summary
 * - Clean, borderless official institutional document style
 * - Bold ONLY on categories/section headers (regular font on all field points)
 * - Visual photo documentation rendered cleanly in grid
 */
export const generateSchoolReportPdf = async ({ school, reports = [], letters = [], statusHistories = [] }) => {
  if (!school) {
    throw new Error('Data target sekolah tidak ditemukan.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = 182; // 210 - (14 * 2) = 182mm

  // Exact unified column dimensions across all tables for 100% vertical alignment
  const COL_LABEL = 48;
  const COL_COLON = 4;
  const COL_VALUE = contentWidth - COL_LABEL - COL_COLON; // 130mm

  // Shared table styling: borderless plain table, bold ONLY in categories (not in points)
  const plainTableStyles = {
    fontSize: 8.5,
    textColor: [0, 0, 0],
    font: 'helvetica',
    cellPadding: { top: 1.4, bottom: 1.4, left: 0, right: 1 },
    overflow: 'linebreak'
  };

  // Field points use normal font (not bold)
  const plainColumnStyles = {
    0: { cellWidth: COL_LABEL, fontStyle: 'normal', textColor: [0, 0, 0] },
    1: { cellWidth: COL_COLON, halign: 'center', fontStyle: 'normal', textColor: [0, 0, 0] },
    2: { cellWidth: COL_VALUE, fontStyle: 'normal', textColor: [0, 0, 0] }
  };

  // Status mapping
  const statusInfo = CRM_SCHOOL_STATUS_BADGES[school.status] || {
    label: school.status || 'NEW',
    class: ''
  };

  // Preload logo
  const logo = await loadImageAsBase64('/1.png');

  let currentY = 12;

  // ==========================================
  // 1. KOP SURAT RESMI INSTITUSI (OFFICIAL KOP)
  // ==========================================
  const logoWidth = 19;
  const logoHeight = 19;

  if (logo && logo.dataUrl) {
    pdf.addImage(logo.dataUrl, 'PNG', marginX, currentY + 0.5, logoWidth, logoHeight);
  }

  const headerTextX = logo && logo.dataUrl ? marginX + logoWidth + 4 : marginX;
  const headerTextWidth = logo && logo.dataUrl ? contentWidth - logoWidth - 4 : contentWidth;
  const headerCenterX = headerTextX + headerTextWidth / 2;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text('YAYASAN PONDOK PESANTREN ASY-SYADZILI', headerCenterX, currentY + 4, { align: 'center' });

  pdf.setFontSize(10.5);
  pdf.text('PANITIA PENERIMAAN SANTRI & SISWA BARU TERPADU (SPSMB)', headerCenterX, currentY + 9, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(40, 40, 40);
  pdf.text(
    'Jl. Raya Asy-Syadzili No. 1, Sumberpasir, Kec. Pakis, Kab. Malang, Jawa Timur 65154',
    headerCenterX,
    currentY + 13.5,
    { align: 'center' }
  );
  pdf.text(
    'Website: asy-syadzili.sch.id  •  Email: spsmb@asy-syadzili.sch.id  •  Telp/WA: 0812-3456-7890',
    headerCenterX,
    currentY + 17.5,
    { align: 'center' }
  );

  // Garis Ganda Pemisah Kop Surat (Official Double Line)
  currentY += 21;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.65);
  pdf.line(marginX, currentY, marginX + contentWidth, currentY);

  pdf.setLineWidth(0.2);
  pdf.line(marginX, currentY + 0.8, marginX + contentWidth, currentY + 0.8);

  currentY += 6;

  // ==========================================
  // 2. JUDUL LAPORAN RESMI (KATEGORI UTAMA: BOLD)
  // ==========================================
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text('LAPORAN KUNJUNGAN & SOSIALISASI TARGET SEKOLAH', marginX + contentWidth / 2, currentY + 1, {
    align: 'center'
  });

  currentY += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);
  pdf.text(
    `Target: ${school.school_name || '-'}  •  Status: ${statusInfo.label.toUpperCase()}  •  Tanggal Cetak: ${formatDate(new Date(), true)}`,
    marginX + contentWidth / 2,
    currentY,
    { align: 'center' }
  );

  currentY += 7;

  // ==========================================
  // 3. SEKSI A: DATA PROFIL TARGET SEKOLAH
  // ==========================================
  pdf.setFont('helvetica', 'bold'); // Kategori BOLD
  pdf.setFontSize(9.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('A. DATA PROFIL TARGET SEKOLAH', marginX, currentY);
  currentY += 2;

  const fullAddress = [
    school.address,
    school.village ? `Desa/Kel. ${school.village}` : null,
    school.district ? `Kec. ${school.district}` : null,
    school.city_regency ? school.city_regency : null,
    school.province ? school.province : null
  ].filter(Boolean).join(', ') || '-';

  const fullContact = [
    school.contact_person,
    school.contact_position ? `(${school.contact_position})` : null,
    school.phone ? `• Telp/WA: ${school.phone}` : null,
    school.email ? `• Email: ${school.email}` : null
  ].filter(Boolean).join(' ') || '-';

  const schoolSchedule = school.scheduled_at
    ? `${formatDate(school.scheduled_at, true)} (Lokasi: ${school.scheduled_location || 'Di Sekolah'})`
    : 'Belum dijadwalkan';

  // Poin-poin di bawah kategori menggunakan font NORMAL
  const profileRows = [
    ['Nama Lembaga / Sekolah', ':', school.school_name || '-'],
    ['Jenjang Pendidikan', ':', school.education_level || '-'],
    ['Status Kunjungan', ':', statusInfo.label.toUpperCase()],
    ['Kepala Sekolah', ':', school.principal_name || '-'],
    ['Kontak Person (PIC)', ':', fullContact],
    ['Alamat Lengkap', ':', fullAddress],
    ['Jadwal Kunjungan', ':', schoolSchedule],
    ['Tim Petugas Penanggung Jawab', ':', school.team_text || '-'],
    ['Sumber Informasi Target', ':', school.source || 'Database Internal']
  ];

  if (school.rejection_reason) {
    profileRows.push(['Alasan Penolakan / Batal', ':', school.rejection_reason]);
  }

  if (school.internal_notes) {
    profileRows.push(['Catatan Internal', ':', school.internal_notes]);
  }

  autoTable(pdf, {
    startY: currentY,
    tableWidth: contentWidth,
    margin: { left: marginX, right: marginX },
    body: profileRows,
    theme: 'plain',
    styles: plainTableStyles,
    columnStyles: plainColumnStyles
  });

  currentY = pdf.lastAutoTable.finalY + 6;

  // ==========================================
  // 4. SEKSI B: RINGKASAN PELAKSANAAN SOSIALISASI
  // ==========================================
  if (currentY > pageHeight - 50) {
    pdf.addPage();
    currentY = 16;
  }

  pdf.setFont('helvetica', 'bold'); // Kategori BOLD
  pdf.setFontSize(9.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('B. RINGKASAN PELAKSANAAN SOSIALISASI', marginX, currentY);
  currentY += 2;

  const totalReportsCount = reports.length;
  const totalAudience = reports.reduce((acc, r) => acc + (parseInt(r.participant_count) || 0), 0);
  const totalLetters = letters.length;
  const latestReport = reports.length > 0 ? reports[0] : null;

  // Poin-poin di bawah kategori menggunakan font NORMAL
  const summaryRows = [
    ['Total Sesi Kunjungan', ':', `${totalReportsCount} Kali Pelaksanaan`],
    ['Total Siswa / Audiens', ':', `${totalAudience} Orang Siswa`],
    ['Surat Resmi Diterbitkan', ':', totalLetters > 0 ? `${totalLetters} Dokumen Surat Terbit` : 'Belum Diterbitkan'],
    ['Sesi Kunjungan Terakhir', ':', latestReport?.held_at ? formatDate(latestReport.held_at, true) : '-']
  ];

  autoTable(pdf, {
    startY: currentY,
    tableWidth: contentWidth,
    margin: { left: marginX, right: marginX },
    body: summaryRows,
    theme: 'plain',
    styles: plainTableStyles,
    columnStyles: plainColumnStyles
  });

  currentY = pdf.lastAutoTable.finalY + 6;

  // ==========================================
  // 5. SEKSI C: RINCIAN LAPORAN KUNJUNGAN & PRESENTASI
  // ==========================================
  if (currentY > pageHeight - 50) {
    pdf.addPage();
    currentY = 16;
  }

  pdf.setFont('helvetica', 'bold'); // Kategori BOLD
  pdf.setFontSize(9.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('C. RINCIAN LAPORAN KUNJUNGAN & PRESENTASI', marginX, currentY);
  currentY += 2;

  if (reports.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Belum ada Laporan Presentasi & Sosialisasi yang diisi untuk target sekolah ini.', marginX, currentY + 3);
    currentY += 9;
  } else {
    // Loop each report
    for (let index = 0; index < reports.length; index++) {
      const rep = reports[index];

      // Check page break safety margin
      if (currentY > pageHeight - 55) {
        pdf.addPage();
        currentY = 16;
      }

      const reportNumber = index + 1;
      const sessionTitle = `Sesi #${reportNumber} — ${formatDate(rep.held_at, true)} (Audiens: ${rep.participant_count || 0} Siswa)`;

      // Sub-kategori sesi BOLD
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(sessionTitle, marginX, currentY + 2.5);
      currentY += 3.5;

      // Poin-poin di bawah sesi font NORMAL
      const reportRows = [
        ['Waktu Pelaksanaan', ':', formatDate(rep.held_at, true)],
        ['Lokasi / Ruangan', ':', rep.location || 'Di Sekolah'],
        ['Tim Petugas Sosialisasi', ':', rep.team_text || '-'],
        ['Jumlah Peserta / Audiens', ':', `${rep.participant_count || 0} Orang Siswa`],
        ['Ringkasan Kegiatan', ':', rep.summary || '-']
      ];

      if (rep.school_response) {
        reportRows.push(['Respon Pihak Sekolah', ':', rep.school_response]);
      }

      if (rep.evaluation) {
        reportRows.push(['Evaluasi Sesi', ':', rep.evaluation]);
      }

      if (rep.obstacles) {
        reportRows.push(['Kendala Lapangan', ':', rep.obstacles]);
      }

      if (rep.follow_up_plan) {
        reportRows.push(['Rencana Tindak Lanjut', ':', rep.follow_up_plan]);
      }

      if (rep.additional_notes) {
        reportRows.push(['Catatan Tambahan', ':', rep.additional_notes]);
      }

      const photoList = Array.isArray(rep.photos) ? rep.photos : [];
      if (photoList.length > 0) {
        reportRows.push(['Dokumentasi Terlampir', ':', `${photoList.length} Foto dokumentasi (lihat lampiran visual di bawah)`]);
      }

      autoTable(pdf, {
        startY: currentY,
        tableWidth: contentWidth,
        margin: { left: marginX, right: marginX },
        body: reportRows,
        theme: 'plain',
        styles: plainTableStyles,
        columnStyles: plainColumnStyles
      });

      currentY = pdf.lastAutoTable.finalY + 4;

      // --- TAMPILAN FOTO DOKUMENTASI UNTUK SESI INI ---
      if (photoList.length > 0) {
        // Pre-load semua foto secara paralel
        const loadedPhotos = await Promise.all(
          photoList.map(async (p) => {
            const loaded = await loadImageAsBase64(p.file_path);
            return {
              ...p,
              loaded
            };
          })
        );

        const validPhotos = loadedPhotos.filter((p) => p.loaded && p.loaded.dataUrl);

        if (validPhotos.length > 0) {
          // Cek ruang halaman untuk header foto
          if (currentY > pageHeight - 65) {
            pdf.addPage();
            currentY = 16;
          }

          pdf.setFont('helvetica', 'bold'); // Kategori / judul foto BOLD
          pdf.setFontSize(8.5);
          pdf.setTextColor(0, 0, 0);
          pdf.text(`Foto Dokumentasi Sesi #${reportNumber}:`, marginX, currentY + 1.5);
          currentY += 4.5;

          // Tata letak 2 kolom foto rapi
          const photoGap = 6;
          const photoColWidth = (contentWidth - photoGap) / 2; // 88mm
          const photoMaxHeight = 55; // 55mm per foto

          for (let pi = 0; pi < validPhotos.length; pi += 2) {
            // Cek apakah muat di halaman ini
            if (currentY > pageHeight - (photoMaxHeight + 15)) {
              pdf.addPage();
              currentY = 16;
            }

            const p1 = validPhotos[pi];
            const p2 = validPhotos[pi + 1] || null;

            // Foto 1 (Kolom Kiri)
            const x1 = marginX;
            const y1 = currentY;
            const aspect1 = (p1.loaded.height || 600) / (p1.loaded.width || 800);
            const actualH1 = Math.min(photoMaxHeight, photoColWidth * aspect1);

            pdf.addImage(p1.loaded.dataUrl, 'JPEG', x1, y1, photoColWidth, actualH1);
            pdf.setDrawColor(215, 220, 225);
            pdf.setLineWidth(0.2);
            pdf.rect(x1, y1, photoColWidth, actualH1);

            if (p1.caption) {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(7);
              pdf.setTextColor(60, 60, 60);
              pdf.text(p1.caption, x1 + photoColWidth / 2, y1 + actualH1 + 3, {
                align: 'center',
                maxWidth: photoColWidth
              });
            }

            let maxRowH = actualH1 + (p1.caption ? 5 : 0);

            // Foto 2 (Kolom Kanan jika ada)
            if (p2) {
              const x2 = marginX + photoColWidth + photoGap;
              const y2 = currentY;
              const aspect2 = (p2.loaded.height || 600) / (p2.loaded.width || 800);
              const actualH2 = Math.min(photoMaxHeight, photoColWidth * aspect2);

              pdf.addImage(p2.loaded.dataUrl, 'JPEG', x2, y2, photoColWidth, actualH2);
              pdf.setDrawColor(215, 220, 225);
              pdf.setLineWidth(0.2);
              pdf.rect(x2, y2, photoColWidth, actualH2);

              if (p2.caption) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7);
                pdf.setTextColor(60, 60, 60);
                pdf.text(p2.caption, x2 + photoColWidth / 2, y2 + actualH2 + 3, {
                  align: 'center',
                  maxWidth: photoColWidth
                });
              }

              const rowH2 = actualH2 + (p2.caption ? 5 : 0);
              if (rowH2 > maxRowH) maxRowH = rowH2;
            }

            currentY += maxRowH + 5;
          }
        }
      }

      currentY += 3;
    }
  }

  // ==========================================
  // 6. SEKSI D: RIWAYAT SURAT KELUAR (JIKA ADA)
  // ==========================================
  if (letters.length > 0) {
    if (currentY > pageHeight - 45) {
      pdf.addPage();
      currentY = 16;
    }

    pdf.setFont('helvetica', 'bold'); // Kategori BOLD
    pdf.setFontSize(9.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text('D. RIWAYAT SURAT RESMI YANG DITERBITKAN', marginX, currentY);
    currentY += 2;

    const letterRows = letters.map((l) => [
      l.letter_number || '-',
      l.subject || 'Surat Permohonan Sosialisasi',
      formatDate(l.issued_at || l.created_at),
      l.signer_snapshot?.principal?.name || l.signer_snapshot?.spmb_chair?.name || 'Panitia SPSMB'
    ]);

    autoTable(pdf, {
      startY: currentY,
      tableWidth: contentWidth,
      margin: { left: marginX, right: marginX },
      head: [['Nomor Surat', 'Perihal Surat', 'Tanggal Terbit', 'Penandatangan']],
      body: letterRows,
      theme: 'plain',
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold', // Header tabel surat BOLD
        textColor: [0, 0, 0],
        cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 1 }
      },
      styles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        fontStyle: 'normal', // Baris surat NORMAL
        cellPadding: { top: 1.3, bottom: 1.3, left: 0, right: 1 },
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'normal' },
        1: { cellWidth: 64, fontStyle: 'normal' },
        2: { cellWidth: 34, fontStyle: 'normal' },
        3: { cellWidth: 34, fontStyle: 'normal' }
      }
    });

    currentY = pdf.lastAutoTable.finalY + 6;
  }

  // ==========================================
  // 7. LEMBAR PENGESAHAN & TANDA TANGAN
  // ==========================================
  if (currentY > pageHeight - 40) {
    pdf.addPage();
    currentY = 20;
  } else {
    currentY += 4;
  }

  const signWidth = 60;
  const signX = marginX + contentWidth - signWidth;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Malang, ${formatDate(new Date())}`, signX, currentY);
  pdf.text('Panitia SPMB,', signX, currentY + 4.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('Panitia SPMB', signX, currentY + 22);

  // ==========================================
  // 8. FOOTER / NOMOR HALAMAN RESMI (ALL PAGES)
  // ==========================================
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 100, 100);

    // Garis tipis footer
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, pageHeight - 10, marginX + contentWidth, pageHeight - 10);

    const footerLeft = `Dokumen Resmi CRM SPSMB • ${school.school_name || 'Target Sekolah'}`;
    const footerRight = `Halaman ${i} dari ${totalPages}`;

    pdf.text(footerLeft, marginX, pageHeight - 6.5);
    pdf.text(footerRight, marginX + contentWidth - pdf.getTextWidth(footerRight), pageHeight - 6.5);
  }

  // Save / Trigger Download
  const cleanSchoolName = (school.school_name || 'Sekolah').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Laporan_Target_${cleanSchoolName}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

export default generateSchoolReportPdf;
