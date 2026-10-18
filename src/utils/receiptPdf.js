import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import autoTable from 'jspdf-autotable';

/**
 * Helper to load image as base64 data URL for jsPDF
 */
export const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve({ dataUrl, width: canvas.width, height: canvas.height });
      } catch (e) {
        console.warn('Gagal render image ke canvas:', e);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    const fullUrl = url.startsWith('http') || url.startsWith('data:')
      ? url 
      : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '')}${url.startsWith('/') ? '' : '/'}${url}`;
    img.src = fullUrl;
  });
};

/**
 * Format date in Indonesian locale
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (_) {
    return dateString;
  }
};

/**
 * Format registration type for display
 */
const formatRegType = (type) => {
  const map = {
    NON_FORMAL: 'Non Formal (Hanya Pondok)',
    SMP: 'SMP IT Asy-Syadzili',
    SMA: 'SMA IT Asy-Syadzili',
    SMK: 'SMK IT Asy-Syadzili'
  };
  return map[type] || type || '-';
};

/**
 * Generate and download official PDF Struk / Bukti Pendaftaran Santri Baru
 * @param {object} receiptData Registration and receipt details
 */
export const generateReceiptPdf = async (receiptData) => {
  if (!receiptData) {
    throw new Error('Data tanda bukti pendaftaran tidak tersedia.');
  }

  const regNo = receiptData.registrationNumber || receiptData.registration_number || 'PENDAFTARAN';
  const studentName = receiptData.studentName || receiptData.student_name || receiptData.nama || receiptData.fullName || receiptData.full_name || '-';
  const rawGender = receiptData.gender || '';
  const gender = (rawGender === 'MALE' || rawGender === 'L' || rawGender === 'Laki-laki')
    ? 'Laki-laki'
    : ((rawGender === 'FEMALE' || rawGender === 'P' || rawGender === 'Perempuan') ? 'Perempuan' : '-');
  
  const birthPlace = receiptData.birthPlace || receiptData.birth_place || receiptData.raw?.applicant?.birthPlace || '';
  const birthDate = receiptData.birthDate || receiptData.birth_date || receiptData.raw?.applicant?.birthDate || '';
  let birthInfo = '-';
  if (birthPlace || birthDate) {
    birthInfo = `${birthPlace || '-'}${birthDate ? `, ${formatDate(birthDate)}` : ''}`;
  }

  const nik = receiptData.nik || receiptData.raw?.applicant?.nik || null;
  const nisn = receiptData.nisn || receiptData.raw?.applicant?.nisn || null;

  const whatsapp = receiptData.whatsapp || receiptData.no_hp || receiptData.phone || '-';
  const parentName = receiptData.parentName || receiptData.parent_name || receiptData.nama_wali || '-';
  const address = receiptData.address || receiptData.alamat || '-';
  const previousSchool = receiptData.previousSchool || receiptData.previous_school || receiptData.asal_sekolah || '-';
  
  const formalInst = receiptData.institution?.name || receiptData.formal_institution_name || receiptData.lembaga_pendidikan || formatRegType(receiptData.registrationType || receiptData.registration_type);
  const pondokInst = receiptData.pondok?.name || receiptData.pondok_institution_name || (gender === 'Perempuan' ? 'Pondok Pesantren Asy-Syadzili 2 (Putri)' : 'Pondok Pesantren Asy-Syadzili 1 (Putra)');
  const regDate = formatDate(receiptData.createdAt || receiptData.created_at);
  const status = receiptData.status || '';
  const isFinalSubmitted = status === 'SUBMITTED' || status === 'FULL_REGISTRATION_SUBMITTED';

  const continueUrl = receiptData.continueUrl || (receiptData.resumeHash ? `${window.location.origin}/pendaftaran/lanjut/${receiptData.resumeHash}` : '');

  // Retrieve logo & kop from formal institution first, fallback to pondok institution or direct props
  const kopUrl = receiptData.kop || receiptData.kopUrl || receiptData.kop_url || receiptData.institution?.kop || receiptData.institution?.kopUrl || receiptData.institution?.kop_url || receiptData.pondok?.kop || receiptData.pondok?.kopUrl || receiptData.pondok?.kop_url || null;
  const logoUrl = receiptData.logo || receiptData.logoUrl || receiptData.logo_url || receiptData.institution?.logo || receiptData.institution?.logoUrl || receiptData.institution?.logo_url || receiptData.pondok?.logo || receiptData.pondok?.logoUrl || receiptData.pondok?.logo_url || null;

  const [kopImg, logoImg] = await Promise.all([
    loadImageAsBase64(kopUrl),
    loadImageAsBase64(logoUrl)
  ]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 36;

  // Header Rendering Logic (Kop / Logo / Default)
  if (kopImg) {
    // 1. Kop Surat Banner di bagian atas (margin top 8mm, lebar 182mm)
    const availWidth = 182; // 210 - 28
    const rawHeight = availWidth * (kopImg.height / kopImg.width);
    const kopHeight = Math.min(36, Math.max(16, rawHeight));
    
    pdf.addImage(kopImg.dataUrl, 'PNG', 14, 8, availWidth, kopHeight);
    
    // Jarak proporsional antara kop surat dengan header judul (7mm)
    let headerY = 8 + kopHeight + 7;

    pdf.setFontSize(11.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('TANDA BUKTI PENDAFTARAN SANTRI BARU', 105, headerY, { align: 'center' });
    headerY += 5;

    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`No. Registrasi: ${regNo}`, 105, headerY, { align: 'center' });
    
    currentY = headerY + 7;
  } else if (logoImg) {
    // 2. Logo dengan margin proporsional (margin top 8mm)
    pdf.addImage(logoImg.dataUrl, 'PNG', 14, 8, 20, 20);

    pdf.setFontSize(12.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('TANDA BUKTI PENDAFTARAN SANTRI BARU', 105 + 6, 13, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text((formalInst || 'PONDOK PESANTREN ASY-SYADZILI').toUpperCase(), 105 + 6, 18.5, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`No. Registrasi: ${regNo}`, 105 + 6, 23.5, { align: 'center' });

    pdf.setLineWidth(0.4);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(14, 29, 196, 29);
    currentY = 36;
  } else {
    // 3. Fallback default header
    pdf.setFontSize(12.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('TANDA BUKTI PENDAFTARAN SANTRI BARU', 105, 13, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('PONDOK PESANTREN ASY-SYADZILI', 105, 18.5, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`No. Registrasi: ${regNo}`, 105, 23.5, { align: 'center' });

    pdf.setLineWidth(0.4);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(14, 29, 196, 29);
    currentY = 36;
  }

  // Seksi A: Data Pendaftaran Utama
  pdf.setFontSize(9.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('A. DATA PENDAFTARAN UTAMA', 14, currentY);
  currentY += 4.5;

  const identityData = [
    ['No. Registrasi', ':', regNo],
    ['Nama Lengkap', ':', studentName],
    ['Jenis Kelamin', ':', gender]
  ];

  if (birthInfo && birthInfo !== '-') {
    identityData.push(['Tempat, Tanggal Lahir', ':', birthInfo]);
  }
  if (nisn && nisn !== '-') {
    identityData.push(['NISN', ':', String(nisn)]);
  }
  if (nik && nik !== '-') {
    identityData.push(['NIK', ':', String(nik)]);
  }

  identityData.push(['Nomor HP / WhatsApp', ':', whatsapp]);
  identityData.push(['Nama Orang Tua / Wali', ':', parentName]);
  identityData.push(['Alamat Lengkap', ':', address]);

  if (previousSchool && previousSchool !== '-') {
    identityData.push(['Asal Sekolah', ':', previousSchool]);
  }

  identityData.push(['Lembaga Pendidikan Pilihan', ':', formalInst]);
  identityData.push(['Asrama Pondok Pesantren', ':', pondokInst]);
  identityData.push(['Tanggal Pendaftaran', ':', regDate]);
  identityData.push(['Status Administrasi', ':', isFinalSubmitted ? 'Formulir Lengkap (Telah Diverifikasi)' : 'Pendaftaran Awal (Menunggu Berkas Lengkap)']);

  autoTable(pdf, {
    startY: currentY,
    body: identityData,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      textColor: [0, 0, 0],
      font: 'helvetica',
      cellPadding: { top: 1.3, bottom: 1.3, left: 0, right: 1 },
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'normal', textColor: [0, 0, 0] },
      1: { cellWidth: 4, halign: 'center', fontStyle: 'normal', textColor: [0, 0, 0] },
      2: { cellWidth: 120, fontStyle: 'normal', textColor: [0, 0, 0] }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = pdf.lastAutoTable.finalY + 6;

  // Seksi B: Petunjuk & Informasi Pendaftaran
  pdf.setFontSize(9.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('B. PETUNJUK & INFORMASI PENDAFTARAN', 14, currentY);
  currentY += 4.5;

  const qrPayload = continueUrl || `${window.location.origin}/pendaftaran?search=${encodeURIComponent(regNo)}`;
  let qrRendered = false;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
    pdf.addImage(qrDataUrl, 'PNG', 14, currentY, 28, 28);
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(0, 0, 0);
    pdf.text('[ Pindai untuk Validasi ]', 28, currentY + 31.5, { align: 'center' });
    qrRendered = true;
  } catch (qrErr) {
    console.warn('Gagal generate QR Code:', qrErr);
  }

  const textX = qrRendered ? 48 : 14;
  const textWidth = qrRendered ? 148 : 182;
  let infoY = currentY + 1.5;

  pdf.setFontSize(8.5);
  pdf.setTextColor(0, 0, 0);

  const instructions = isFinalSubmitted ? [
    '1. Lembar ini merupakan Tanda Bukti Pendaftaran resmi SPSMB Pondok Pesantren Asy-Syadzili.',
    '2. Seluruh isian data dan dokumen persyaratan calon santri telah tersimpan pada sistem penerimaan.',
    '3. Pindai QR Code di samping menggunakan kamera smartphone untuk memeriksa keabsahan dan pembaruan informasi status penerimaan.',
    '4. Harap cetak dan bawa lembar bukti pendaftaran ini saat pelaksanaan tes masuk / registrasi ulang di pesantren.'
  ] : [
    '1. Lembar ini merupakan Tanda Bukti Pendaftaran Awal calon santri baru yang telah tercatat pada sistem.',
    '2. Calon santri WAJIB melengkapi formulir pendaftaran lanjutan dan melampirkan berkas persyaratan.',
    '3. Pindai QR Code di samping menggunakan kamera smartphone untuk melanjutkan pengisian biodata lengkap secara online.',
    continueUrl 
      ? `4. Tautan pendaftaran resmi: ${continueUrl}`
      : '4. Harap simpan dokumen tanda bukti ini dengan baik sebagai syarat administrasi verifikasi berkas.'
  ];

  instructions.forEach((inst) => {
    pdf.setFont('helvetica', 'normal');
    const splitText = pdf.splitTextToSize(inst, textWidth);
    pdf.text(splitText, textX, infoY);
    infoY += splitText.length * 4.2 + 1.8;
  });

  const sectionBEnd = Math.max(currentY + 34, infoY);

  // Tanda Tangan Resmi di bagian bawah dengan ritme proporsional
  const sigY = Math.max(sectionBEnd + 12, 192);
  const today = formatDate(new Date().toISOString()).split(',')[0];

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  // Signature (Panitia)
  pdf.text('Mengetahui,', 45, sigY, { align: 'center' });
  pdf.text('Panitia Penerimaan SPSMB', 45, sigY + 5, { align: 'center' });
  pdf.text('( ........................................ )', 45, sigY + 28, { align: 'center' });

  // Signature (Pendaftar / Wali)
  pdf.text(`Malang, ${today}`, 165, sigY, { align: 'center' });
  pdf.text('Pendaftar / Orang Tua Wali,', 165, sigY + 5, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  const signeeName = studentName && studentName !== '-' ? studentName : '( ........................................ )';
  pdf.text(signeeName, 165, sigY + 28, { align: 'center' });

  // Footer notes di paling bawah
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Dokumen resmi ini diterbitkan secara otomatis oleh Sistem SPSMB Pondok Pesantren Asy-Syadzili pada ${new Date().toLocaleString('id-ID')}`, 14, 282);

  const fileName = `Bukti_Pendaftaran_${regNo}.pdf`;
  pdf.save(fileName);
  return fileName;
};
