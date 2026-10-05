<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSummary } from '@/services/publicApplicationSubmitService'
import publicApplicationFormService from '@/services/publicApplicationFormService'
import { getDocuments } from '@/services/publicDocumentService'
import jsPDF from 'jspdf'

const router = useRouter()

const loading = ref(true)
const error = ref('')
const summary = ref(null)
const formData = ref(null)
const uploadedDocs = ref([])
const isGeneratingPdf = ref(false)

onMounted(async () => {
  const sessionData = localStorage.getItem('spsmb_continue_session')
  if (!sessionData) {
    router.push('/pendaftaran')
    return
  }

  try {
    const parsed = JSON.parse(sessionData)
    
    // Fetch all necessary data concurrently
    const [summaryRes, formRes, docsRes] = await Promise.all([
      getSummary(parsed.registrationNumber, parsed.continueToken),
      publicApplicationFormService.getForm(parsed.registrationNumber, parsed.continueToken),
      getDocuments(parsed.registrationNumber, parsed.continueToken)
    ])
    
    summary.value = summaryRes
    formData.value = formRes.data
    // Only show uploaded documents
    if (docsRes && docsRes.documents) {
      uploadedDocs.value = docsRes.documents.filter(d => d.uploadStatus === 'UPLOADED')
    }
  } catch (err) {
    if (err.status === 401) {
      alert('Sesi berakhir. Silakan login kembali untuk melihat status.')
    } else {
      error.value = 'Gagal memuat data pendaftaran'
    }
    if (err.status === 401) {
      router.push('/pendaftaran')
    }
  } finally {
    loading.value = false
  }
})

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const formatFieldValue = (field) => {
  if (field.value === null || field.value === undefined || field.value === '') {
    return '-'
  }
  if (field.inputType === 'CHECKBOX') {
    try {
      const arr = typeof field.value === 'string' ? JSON.parse(field.value) : field.value
      return Array.isArray(arr) ? arr.join(', ') : field.value
    } catch {
      return field.value
    }
  }
  return field.value
}

const printPDF = async () => {
  isGeneratingPdf.value = true
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const margin = 20
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPos = 20
    
    const checkPageBreak = (neededSpace) => {
      if (yPos + neededSpace > pageHeight - margin) {
        pdf.addPage()
        yPos = margin
        return true
      }
      return false
    }
    
    // Header
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('BUKTI PENDAFTARAN LENGKAP SANTRI BARU', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
    
    pdf.setFontSize(14)
    pdf.text('PONDOK PESANTREN ASY-SYADZILI', pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Tahun Ajaran ${formData.value.application.academicYear || 'Berjalan'}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
    
    // Line separator
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10
    
    // Helper function to draw rows
    const drawRow = (label, value) => {
      pdf.setFontSize(10)
      
      // Measure label lines
      pdf.setFont('helvetica', 'bold')
      const splitLabel = pdf.splitTextToSize(String(label), 65)
      
      // Measure value lines
      pdf.setFont('helvetica', 'normal')
      const splitValue = pdf.splitTextToSize(String(value || '-'), pageWidth - margin - 75)
      
      const maxLines = Math.max(splitLabel.length, splitValue.length)
      const requiredHeight = (maxLines * 5) + 3
      
      checkPageBreak(requiredHeight + 5)
      
      // Draw Label
      pdf.setFont('helvetica', 'bold')
      pdf.text(splitLabel, margin, yPos)
      
      // Draw Value
      pdf.setFont('helvetica', 'normal')
      pdf.text(splitValue, margin + 70, yPos)
      
      yPos += requiredHeight
    }
    
    // Helper function for Section Titles
    const drawSectionTitle = (title) => {
      checkPageBreak(15)
      yPos += 5
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(26, 77, 46) // Dark green
      pdf.text(title, margin, yPos)
      yPos += 2
      pdf.setLineWidth(0.2)
      pdf.setDrawColor(26, 77, 46)
      pdf.line(margin, yPos, pageWidth - margin, yPos)
      
      // Reset colors
      pdf.setTextColor(0, 0, 0)
      pdf.setDrawColor(0, 0, 0)
      yPos += 8
    }

    // 1. Info Pendaftaran
    drawSectionTitle('INFO PENDAFTARAN')
    drawRow('Nomor Pendaftaran', summary.value.application.registrationNumber)
    drawRow('Status', summary.value.application.status)
    drawRow('Tanggal Kirim', formatDate(summary.value.application.submittedAt))
    drawRow('Tingkat Pendidikan', summary.value.registration.type)
    drawRow('Lembaga Formal', summary.value.registration.formalInstitution?.name)
    drawRow('Pondok Pesantren', summary.value.registration.pondokInstitution?.name)
    if (summary.value.registration.major) {
      drawRow('Jurusan Pilihan', summary.value.registration.major.name)
    }

    // 2. Form Answers
    if (formData.value && formData.value.sections) {
      formData.value.sections.forEach(section => {
        drawSectionTitle(section.name.toUpperCase())
        section.fields.forEach(field => {
          drawRow(field.label, formatFieldValue(field))
        })
      })
    }

    // 3. Uploaded Documents
    drawSectionTitle('DOKUMEN TERSIMPAN')
    if (uploadedDocs.value.length === 0) {
      drawRow('Status', 'Tidak ada dokumen')
    } else {
      uploadedDocs.value.forEach(doc => {
        drawRow(doc.name, doc.file.fileName)
      })
    }
    
    // Footer on all pages
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Dicetak pada: ${new Date().toLocaleString('id-ID')} | Halaman ${i} dari ${pageCount}`,
        margin,
        pageHeight - 10
      );
    }
    
    pdf.save(`Bukti_Pendaftaran_Lengkap_${summary.value.application.registrationNumber}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Gagal membuat dokumen PDF. ' + error.message)
  } finally {
    isGeneratingPdf.value = false
  }
}
</script>

<template>
  <div class="greenPanel text-center max-w-[800px]">
    <div v-if="loading" class="flex justify-center py-12 print:hidden">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
    
    <div v-else-if="error" class="py-8 print:hidden">
      <p class="text-red-300 font-bold mb-4">{{ error }}</p>
      <button @click="router.push('/pendaftaran')" class="submitButton">Kembali ke Beranda</button>
    </div>

    <div v-else-if="summary && formData" class="success-content text-left">
      <!-- Success Header (Hidden in Print) -->
      <div class="text-center print:hidden mb-8">
        <div class="icon-wrapper mb-6 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h1 class="mainTitle mb-2">Pendaftaran Berhasil Dikirim</h1>
        <p class="text-emerald-50 text-sm md:text-base leading-relaxed">
          Terima kasih. Data pendaftaran Anda telah berhasil dikirim kepada panitia SPSMB. 
          Simpan nomor pendaftaran dan bukti pendaftaran untuk keperluan berikutnya.
        </p>
      </div>

      <!-- Printable Document Area -->
      <div id="printArea" class="bg-white text-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <!-- Print Header -->
        <div class="bg-slate-50 border-b border-slate-200 p-6 md:p-8 text-center">
          <h2 class="text-2xl font-bold text-slate-800 mb-1 uppercase tracking-wide">Bukti Pendaftaran SPSMB</h2>
          <p class="text-slate-500">Tahun Ajaran {{ formData.application.academicYear || 'Berjalan' }}</p>
        </div>

        <div class="p-6 md:p-8 space-y-8">
          
          <!-- Registration Info -->
          <div>
            <h3 class="text-lg font-bold text-emerald-800 border-b-2 border-emerald-100 pb-2 mb-4">Info Pendaftaran</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-slate-500 text-xs mb-1">Nomor Pendaftaran</div>
                <div class="font-bold text-slate-800 text-base">{{ summary.application.registrationNumber }}</div>
              </div>
              <div>
                <div class="text-slate-500 text-xs mb-1">Status</div>
                <div class="font-bold text-slate-800">{{ summary.application.status }}</div>
              </div>
              <div>
                <div class="text-slate-500 text-xs mb-1">Tanggal Kirim</div>
                <div class="font-bold text-slate-800">{{ formatDate(summary.application.submittedAt) }}</div>
              </div>
              <div>
                <div class="text-slate-500 text-xs mb-1">Tingkat Pendidikan</div>
                <div class="font-bold text-slate-800">{{ summary.registration.type }}</div>
              </div>
              <div>
                <div class="text-slate-500 text-xs mb-1">Lembaga Formal</div>
                <div class="font-bold text-slate-800">{{ summary.registration.formalInstitution?.name || '-' }}</div>
              </div>
              <div>
                <div class="text-slate-500 text-xs mb-1">Pondok Pesantren</div>
                <div class="font-bold text-slate-800">{{ summary.registration.pondokInstitution?.name || '-' }}</div>
              </div>
              <div v-if="summary.registration.major" class="col-span-1 md:col-span-2">
                <div class="text-slate-500 text-xs mb-1">Jurusan Pilihan</div>
                <div class="font-bold text-slate-800">{{ summary.registration.major.name }}</div>
              </div>
            </div>
          </div>

          <!-- Form Data / Answers -->
          <div v-for="section in formData.sections" :key="section.id">
            <h3 class="text-lg font-bold text-emerald-800 border-b-2 border-emerald-100 pb-2 mb-4">{{ section.name }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div v-for="field in section.fields" :key="field.id" :class="{'md:col-span-2': field.inputType === 'TEXTAREA'}">
                <div class="text-slate-500 text-xs mb-0.5">{{ field.label }}</div>
                <div class="font-medium text-slate-800">{{ formatFieldValue(field) }}</div>
              </div>
            </div>
          </div>

          <!-- Uploaded Documents -->
          <div>
            <h3 class="text-lg font-bold text-emerald-800 border-b-2 border-emerald-100 pb-2 mb-4">Dokumen Tersimpan</h3>
            <div v-if="uploadedDocs.length === 0" class="text-sm text-slate-500 italic">
              Tidak ada dokumen
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div v-for="doc in uploadedDocs" :key="doc.documentTypeId" class="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-600 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <div class="min-w-0">
                  <div class="font-bold text-slate-800 truncate" :title="doc.name">{{ doc.name }}</div>
                  <div class="text-xs text-slate-500 truncate" :title="doc.file.fileName">{{ doc.file.fileName }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="pt-8 mt-8 border-t-2 border-dashed border-slate-300 text-center text-sm text-slate-500">
            Dicetak pada: {{ new Date().toLocaleString('id-ID') }}
          </div>
          
          <!-- Bottom Action Area inside panel -->
          <div id="actionArea" class="mt-8 pt-8 border-t border-slate-200">
            <div class="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-center mb-6">
              <strong class="block text-base mb-1">Pendaftaran Anda akan segera diproses!</strong>
              <p class="text-sm">Panitia akan segera menindaklanjuti data Anda dan akan menghubungi Anda via WhatsApp untuk informasi selanjutnya.</p>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <button @click="router.push('/')" class="px-6 py-3 font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors">
                Kembali ke Beranda
              </button>
              <button @click="printPDF" :disabled="isGeneratingPdf" class="px-6 py-3 font-bold text-white bg-[#1A4D2E] rounded-lg hover:bg-[#153e25] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                <span v-if="isGeneratingPdf" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {{ isGeneratingPdf ? 'Mempersiapkan PDF...' : 'Download Bukti Pendaftaran' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  backdrop-filter: blur(4px);
}
</style>
