<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import '@/assets/styles/receipt.css'
import publicRegistrationService from '@/services/publicRegistrationService'

const router = useRouter()
const registrationData = ref(null)
const isGeneratingPdf = ref(false)

onMounted(async () => {
  const sessionData = localStorage.getItem('spsmb_continue_session')
  if (sessionData) {
    try {
      const { registrationNumber, continueToken } = JSON.parse(sessionData)
      const response = await publicRegistrationService.getRegistrationReceipt(registrationNumber, continueToken)
      if (response && response.data) {
        registrationData.value = {
          ...response.data,
          continueToken
        }
      } else {
        router.push('/pendaftaran')
      }
    } catch (error) {
      console.error(error)
      router.push('/pendaftaran')
    }
  } else {
    // If no data, redirect to registration
    router.push('/pendaftaran')
  }
})

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getResumeHash = () => {
  if (!registrationData.value) return '';
  const combined = `${registrationData.value.registrationNumber}::${registrationData.value.continueToken}`
  return btoa(combined).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

const continueRegistration = () => {
  router.push(`/pendaftaran/lanjut/${getResumeHash()}`)
}

const printReceipt = async () => {
  try {
    isGeneratingPdf.value = true
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    // Config
    const margin = 20
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 20
    
    // Header
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('BUKTI PENDAFTARAN AWAL SANTRI BARU', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
    
    pdf.setFontSize(14)
    pdf.text('PONDOK PESANTREN ASY-SYADZILI', pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
    
    // Line separator
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 15
    
    // ID Pendaftaran
    pdf.setFontSize(12)
    pdf.text(`ID Pendaftaran: ${registrationData.value.registrationNumber}`, margin, yPos)
    yPos += 12
    
    // Data Table
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    const drawRow = (label, value) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label, margin, yPos)
      pdf.setFont('helvetica', 'normal')
      
      // Multiline support for value
      const splitValue = pdf.splitTextToSize(value || '-', 100)
      pdf.text(splitValue, margin + 50, yPos)
      yPos += (splitValue.length * 6) + 4
    }
    
    drawRow('Nama Lengkap', registrationData.value.studentName)
    drawRow('Jenis Kelamin', registrationData.value.gender === 'MALE' ? 'Laki-laki' : 'Perempuan')
    drawRow('Nomor HP/WA', registrationData.value.whatsapp)
    drawRow('Nama Wali', registrationData.value.parentName)
    drawRow('Alamat', registrationData.value.address)
    if (registrationData.value.previousSchool) {
      drawRow('Sekolah Asal', registrationData.value.previousSchool)
    }
    drawRow('Lembaga Tujuan', registrationData.value.institution?.name || 'Non Formal')
    drawRow('Tanggal Daftar', formatDate(registrationData.value.createdAt))
    
    yPos += 10
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 15
    
    // Next Step Info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Informasi Penting:', margin, yPos)
    yPos += 8
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Pendaftaran Anda belum selesai. Silakan lanjutkan pengisian data lengkap.', margin, yPos)
    yPos += 8
    
    const nextStepUrl = window.location.origin + '/pendaftaran/lanjut/' + getResumeHash()
    pdf.text('Akses link berikut untuk melanjutkan pendaftaran dari perangkat manapun:', margin, yPos)
    yPos += 6
    
    pdf.setTextColor(0, 0, 255)
    pdf.text(nextStepUrl, margin, yPos)
    pdf.setTextColor(0, 0, 0)
    yPos += 10
    
    // Generate QR Code
    const qrDataUrl = await QRCode.toDataURL(nextStepUrl, { width: 100, margin: 1 })
    pdf.addImage(qrDataUrl, 'PNG', margin, yPos, 40, 40)
    
    // Footer
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, margin, pdf.internal.pageSize.getHeight() - 15)
    
    pdf.save(`Bukti_Pendaftaran_${registrationData.value.registrationNumber}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Gagal membuat dokumen PDF. Silakan coba lagi.')
  } finally {
    isGeneratingPdf.value = false
  }
}
</script>

<template>
  <div v-if="registrationData" class="w-full" style="min-height: calc(100vh - 40px); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
    <div class="receiptWrapper" style="width: 100%; max-width: 420px; margin: 0 auto; overflow: hidden;">
      
      <!-- Area to be printed as PDF -->
      <div id="receipt-printable-area" style="background-color: white;">
        <div class="receipt" style="width: 100%; max-width: 100%;">
          <!-- Header -->
          <div class="header">
            <h1 class="title">PONDOK PESANTREN ASY-SYADZILI</h1>
            <h2 class="subtitle">BUKTI PENDAFTARAN SANTRI BARU</h2>
            <div class="divider"></div>
          </div>

          <!-- Content -->
          <div class="content">
            <div class="registrationId">
              <strong>ID Pendaftaran: {{ registrationData.registrationNumber }}</strong>
            </div>

            <div class="dataSection">
              <h3 class="sectionTitle">Data Pendaftar</h3>
              
              <div class="dataRow">
                <span class="label">Nama Lengkap:</span>
                <span class="value">{{ registrationData.studentName }}</span>
              </div>
              
              <div class="dataRow">
                <span class="label">Jenis Kelamin:</span>
                <span class="value">{{ registrationData.gender === 'MALE' ? 'Laki-laki' : 'Perempuan' }}</span>
              </div>
              
              <div class="dataRow">
                <span class="label">Nomor HP/WA:</span>
                <span class="value">{{ registrationData.whatsapp }}</span>
              </div>
              
              <div class="dataRow">
                <span class="label">Nama Wali:</span>
                <span class="value">{{ registrationData.parentName }}</span>
              </div>
              
              <div class="dataRow">
                <span class="label">Alamat:</span>
                <span class="value">{{ registrationData.address }}</span>
              </div>
              
              <div class="dataRow" v-if="registrationData.previousSchool">
                <span class="label">Sekolah Asal:</span>
                <span class="value">{{ registrationData.previousSchool }}</span>
              </div>

              <div class="dataRow">
                <span class="label">Pendidikan:</span>
                <span class="value">{{ registrationData.institution?.name || 'Non Formal' }}</span>
              </div>
              
              <div class="dataRow">
                <span class="label">Tanggal Daftar:</span>
                <span class="value">{{ formatDate(registrationData.createdAt) }}</span>
              </div>
            </div>

            <div class="notice">
              <h3 class="noticeTitle">📋 Informasi Penting</h3>
              <ul class="noticeList">
                <li><strong>Pendaftaran Anda belum selesai.</strong></li>
                <li>Silakan lanjutkan pengisian data lengkap calon santri/murid.</li>
                <li>Simpan bukti pendaftaran ini dengan baik.</li>
              </ul>
            </div>

            <div class="footer">
              <p>Terima kasih telah mendaftar di Pondok Pesantren Asy-Syadzili</p>
              <p class="footerDate">
                Dicetak pada: {{ new Date().toLocaleString('id-ID') }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="pt-2 pb-6 px-6" data-html2canvas-ignore="true">
        <div class="border-t-2 border-dashed border-emerald-800/30 pt-6">
          <h3 class="text-center font-bold text-emerald-900 mb-4 text-sm sm:text-base">Silakan Lanjutkan Proses Pendaftaran Anda:</h3>
          <div class="actions" style="margin-top: 0;">
            <button @click="printReceipt" class="printButton" :disabled="isGeneratingPdf">
              <span v-if="isGeneratingPdf">Mempersiapkan PDF...</span>
              <span v-else>🖨️ Cetak Pendaftaran</span>
            </button>
            
            <button @click="continueRegistration" class="newRegistrationButton">
              Lanjutkan Pendaftaran &rarr;
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
