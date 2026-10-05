<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApplicationDetail, updateApplicationStatus } from '@/services/applicationService'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import { formatDate } from '@/utils/date'
import { formatPhoneDisplay } from '@/utils/phone'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const route = useRoute()
const router = useRouter()
const pendaftarId = route.params.id

const pendaftar = ref(null)
const loading = ref(true)
const error = ref('')
const isGeneratingPdf = ref(false)

const fetchPendaftar = async () => {
  loading.value = true
  error.value = ''
  try {
    const app = await getApplicationDetail(pendaftarId)
    pendaftar.value = {
      raw: app,
      isConfirmed: app.application.status === 'SUBMITTED',
      isCancelled: app.application.status === 'CANCELLED',
      status: app.application.status,
      created_at: app.application.createdAt,
      id: app.application.id,
      registrationNumber: app.application.registrationNumber,
      
      nama: app.applicant.fullName,
      jenis_kelamin: app.applicant.gender === 'MALE' ? 'Laki-laki' : (app.applicant.gender === 'FEMALE' ? 'Perempuan' : '-'),
      lembaga_pendidikan: app.registration.formalInstitution?.name || app.registration.pondokInstitution?.name || app.application.registrationType
    }
  } catch (err) {
    error.value = 'Terjadi kesalahan sistem'
  } finally {
    loading.value = false
  }
}

const documentSections = computed(() => {
  if (!pendaftar.value || !pendaftar.value.raw) return [];
  
  const sections = [];
  const app = pendaftar.value.raw;
  
  // Section 1: Data Pendaftaran Utama (Static fields)
  sections.push({
    title: 'Data Pendaftaran Utama',
    fields: [
      { label: 'Nama Lengkap', value: app.applicant.fullName || '-' },
      { label: 'Jenis Kelamin', value: app.applicant.gender === 'MALE' ? 'Laki-laki' : (app.applicant.gender === 'FEMALE' ? 'Perempuan' : '-') },
      { label: 'Tempat, Tanggal Lahir', value: `${app.applicant.birthPlace || '-'}, ${app.applicant.birthDate ? formatDate(app.applicant.birthDate) : '-'}` },
      { label: 'Nomor HP/WhatsApp', value: formatPhoneDisplay(app.applicant.whatsapp) || '-' },
      { label: 'NIK', value: app.applicant.nik || '-' },
      { label: 'NISN', value: app.applicant.nisn || '-' },
      { label: 'Asal Sekolah', value: app.applicant.previousSchool || '-' },
      { label: 'Alamat Lengkap', value: app.applicant.address || '-' },
      { label: 'Lembaga Pendidikan Pilihan', value: pendaftar.value.lembaga_pendidikan }
    ]
  });

  // Dynamic sections from form_fields
  const dynamicGroups = {};
  if (app.dynamicAnswers && app.dynamicAnswers.length > 0) {
    app.dynamicAnswers.forEach(ans => {
      const sectionId = ans.section.id;
      if (!dynamicGroups[sectionId]) {
        dynamicGroups[sectionId] = {
          title: ans.section.name,
          fields: []
        };
      }
      
      let displayValue = ans.answer;
      if (ans.inputType === 'CHECKBOX' && Array.isArray(ans.answer)) {
        displayValue = ans.answer.join(', ');
      } else if (ans.inputType === 'FILE') {
        displayValue = ans.answer ? '✓ Terlampir' : '-';
      }
      
      dynamicGroups[sectionId].fields.push({
        label: ans.label,
        value: displayValue || '-'
      });
    });
  }
  
  // Append dynamic sections
  Object.values(dynamicGroups).forEach(group => {
    sections.push(group);
  });
  
  // Append documents section if any
  if (app.documents && app.documents.length > 0) {
    const serverUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');
    const docFields = app.documents.map(doc => {
      if (doc.filePath) {
        const fileUrl = `${serverUrl}/${doc.filePath}`;
        return {
          label: doc.name,
          value: '✓ Terlampir',
          isLink: true,
          url: fileUrl
        }
      }
      return { label: doc.name, value: 'Belum diupload' }
    });
    
    sections.push({
      title: 'Dokumen Persyaratan',
      fields: docFields
    });
  }
  
  return sections;
});

const getSectionLetter = (index) => {
  return String.fromCharCode(65 + index);
};

onMounted(() => {
  fetchPendaftar()
})

const handlePrint = async () => {
  try {
    isGeneratingPdf.value = true;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMULIR PENDAFTARAN SANTRI BARU', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Pondok Pesantren Santri Pasir', 105, 28, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`No. Registrasi: ${pendaftar.value.registrationNumber}`, 105, 36, { align: 'center' });
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);
    
    let currentY = 46;
    
    // Sections using autoTable
    documentSections.value.forEach((section, index) => {
      const title = `${getSectionLetter(index)}. ${section.title.toUpperCase()}`;
      const bodyData = section.fields.map(f => [f.label, ':', f.value]);
      
      autoTable(doc, {
        startY: currentY,
        head: [[title, '', '']],
        body: bodyData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 2,
          font: 'helvetica'
        },
        headStyles: {
          fontStyle: 'bold',
          textColor: [0, 0, 0],
          fontSize: 11,
          lineWidth: { bottom: 0.5 },
          lineColor: [0, 0, 0],
          cellPadding: { top: 4, bottom: 2, left: 0, right: 0 }
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'normal' },
          1: { cellWidth: 5, halign: 'center' },
          2: { cellWidth: 'auto', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });
      
      currentY = doc.lastAutoTable.finalY + 4;
    });
    
    // Check if we need a new page for signatures
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    currentY += 15;
    const today = formatDate(new Date().toISOString()).split(',')[0];
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Signature (Panitia)
    doc.text('Mengetahui,', 45, currentY, { align: 'center' });
    doc.text('Panitia Penerimaan', 45, currentY + 5, { align: 'center' });
    doc.text('( ........................................ )', 45, currentY + 30, { align: 'center' });
    
    // Signature (Pendaftar)
    doc.text(`Malang, ${today}`, 165, currentY - 5, { align: 'center' });
    doc.text('Pendaftar,', 165, currentY, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(pendaftar.value.nama || '( ........................................ )', 165, currentY + 30, { align: 'center' });
    
    const fileName = `Formulir_${pendaftar.value.registrationNumber}.pdf`;
    doc.save(fileName);
    
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Terjadi kesalahan saat meng-generate PDF');
  } finally {
    isGeneratingPdf.value = false;
  }
}

const handleConfirmSantri = async () => {
  if (!confirm('Konfirmasi pendaftar ini sebagai santri?')) return;
  try {
    await updateApplicationStatus(pendaftarId, 'SUBMITTED');
    fetchPendaftar();
  } catch (err) {
    alert('Gagal mengkonfirmasi santri');
  }
}
</script>

<template>
  <div class="detail-container">
    <BaseLoading v-if="loading" text="Memuat data pendaftar..." class="min-h-[50vh]" />
    
    <div v-else-if="error" class="min-h-[50vh] flex items-center justify-center">
      <BaseErrorState 
        :message="error" 
        @retry="fetchPendaftar"
      />
    </div>

    <div v-else class="flex flex-col gap-6">
      
      <!-- Action Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <div>
          <h4 class="text-lg font-bold text-slate-800 mb-1">Detail Pendaftar</h4>
          <p class="text-slate-500 text-sm m-0">Informasi pendaftaran santri baru</p>
        </div>
        <div class="flex flex-wrap gap-2 mt-4 sm:mt-0">
          <button @click="handlePrint" :disabled="isGeneratingPdf" class="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            <template v-if="isGeneratingPdf">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Membuat PDF...
            </template>
            <template v-else>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text mr-2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
              Download PDF
            </template>
          </button>
          
          <button v-if="!pendaftar.isConfirmed" @click="handleConfirmSantri" class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-check mr-2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
            Konfirmasi Santri
          </button>
          
          <router-link to="/admin/pendaftar" class="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors shadow-sm text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left mr-2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Kembali
          </router-link>
        </div>
      </div>

      <!-- Document Container -->
      <div class="bg-white rounded-none sm:rounded-xl shadow-sm border border-slate-200 max-w-4xl mx-auto w-full print:shadow-none print:border-none print:m-0 print:p-0">
        
        <div class="p-8 sm:p-12">
          <!-- Document Header -->
          <div class="text-center border-b-[3px] border-black pb-4 mb-6 relative">
            <h2 class="text-xl font-bold uppercase tracking-wide text-black mb-1">Formulir Pendaftaran Santri Baru</h2>
            <h3 class="text-lg font-bold uppercase tracking-wider text-black mb-2">Pondok Pesantren Santri Pasir</h3>
            <p class="text-sm text-black m-0 font-medium">No. Registrasi: {{ pendaftar.registrationNumber }}</p>
          </div>

          <!-- Dynamic Sections -->
          <div v-for="(section, index) in documentSections" :key="index" class="mb-6">
            <h4 class="text-sm font-bold text-black border-b border-black pb-1 mb-2 uppercase tracking-wide">
              {{ getSectionLetter(index) }}. {{ section.title }}
            </h4>
            <table class="w-full text-sm text-black">
              <tbody>
                <tr v-for="(field, fIndex) in section.fields" :key="fIndex">
                  <td class="py-1.5 w-[35%] font-medium align-top">{{ field.label }}</td>
                  <td class="py-1.5 w-4 text-center align-top">:</td>
                  <td class="py-1.5 leading-relaxed">
                    <template v-if="field.isLink">
                      <a :href="field.url" target="_blank" class="text-blue-600 hover:underline flex items-center gap-1 print:text-black print:no-underline">
                        {{ field.value }}
                      </a>
                    </template>
                    <template v-else>
                      {{ field.value }}
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Signature Section -->
          <div class="mt-12 pt-4 flex justify-between items-end text-sm text-black">
            <div class="text-center">
              <p class="mb-16">Mengetahui,<br/>Panitia Penerimaan</p>
              <p class="font-bold uppercase border-b border-black inline-block min-w-[200px] pb-1">( ........................................ )</p>
            </div>
            <div class="text-center">
              <p class="mb-1">Malang, {{ formatDate(new Date().toISOString()).split(',')[0] }}</p>
              <p class="mb-16">Pendaftar,</p>
              <p class="font-bold uppercase border-b border-black inline-block min-w-[200px] pb-1">{{ pendaftar.nama || '( ........................................ )' }}</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    margin: 1.5cm;
  }
}
</style>
