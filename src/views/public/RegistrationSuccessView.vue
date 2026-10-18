<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import '@/assets/styles/receipt.css'
import publicRegistrationService from '@/services/publicRegistrationService'
import { generateReceiptPdf } from '@/utils/receiptPdf'

const router = useRouter()
const registrationData = ref(null)
const isGeneratingPdf = ref(false)

onMounted(async () => {
  const sessionData = localStorage.getItem('spsmb_continue_session')
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData)
      const { registrationNumber, continueToken, receipt } = parsed

      // Gunakan cached receipt jika tersedia dari submit pendaftaran awal
      if (receipt) {
        registrationData.value = {
          ...receipt,
          continueToken
        }
      }

      // Coba fetch receipt terbaru dari API
      try {
        const response = await publicRegistrationService.getRegistrationReceipt(registrationNumber, continueToken)
        if (response && response.data) {
          registrationData.value = {
            ...response.data,
            continueToken
          }
        }
      } catch (fetchErr) {
        console.warn('Gagal mengambil data tanda bukti dari server, menggunakan data tersimpan:', fetchErr)
        if (!registrationData.value) {
          router.push('/pendaftaran')
        }
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
    const resumeHash = getResumeHash()
    await generateReceiptPdf({
      ...registrationData.value,
      resumeHash,
      continueUrl: resumeHash ? `${window.location.origin}/pendaftaran/lanjut/${resumeHash}` : ''
    })
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
            <h2 class="subtitle">BUKTI FORM PENDAFTARAN AWAL</h2>
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
                <li><strong>Tahap 1 (Form Pendaftaran Awal) Berhasil!</strong></li>
                <li>Silakan lanjutkan ke <strong>Form Pendaftaran Lengkap</strong> untuk melengkapi biodata dan berkas calon santri.</li>
                <li>Simpan bukti pendaftaran awal ini dengan baik.</li>
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
          <h3 class="text-center font-bold text-emerald-900 mb-4 text-sm sm:text-base">Silakan Lanjutkan ke Form Pendaftaran Lengkap:</h3>
          <div class="actions" style="margin-top: 0;">
            <button @click="printReceipt" class="printButton" :disabled="isGeneratingPdf">
              <span v-if="isGeneratingPdf">Mempersiapkan PDF...</span>
              <span v-else>🖨️ Cetak Bukti Pendaftaran Awal</span>
            </button>
            
            <button @click="continueRegistration" class="newRegistrationButton">
              Isi Form Pendaftaran Lengkap &rarr;
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
