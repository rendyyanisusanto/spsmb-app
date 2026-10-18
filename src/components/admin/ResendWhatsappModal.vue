<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { getResendPreview, resendApplicationWhatsapp } from '@/services/applicationService'
import { generateReceiptPdf } from '@/utils/receiptPdf'
import { 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Printer, 
  Link as LinkIcon, 
  Phone, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  MessageSquare
} from 'lucide-vue-next'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  applicantId: {
    type: [Number, String],
    default: null
  },
  applicant: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'sent'])

const loading = ref(false)
const isSending = ref(false)
const isPrintingReceipt = ref(false)
const copiedLink = ref(false)
const showMessagePreview = ref(true)

const previewData = ref(null)
const feedback = ref({ type: '', text: '' })

// Message customization options
const includeReceipt = ref(true)
const includeContinueLink = ref(true)
const customNote = ref('')

const formatPhoneDisplay = (phone) => {
  if (!phone) return '-'
  let cleaned = String(phone).replace(/[^\d+]/g, '')
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2)
  }
  return cleaned
}

const loadPreview = async () => {
  if (!props.applicantId) return
  loading.value = true
  feedback.value = { type: '', text: '' }
  try {
    const res = await getResendPreview(props.applicantId)
    if (res && res.data) {
      previewData.value = res.data
    } else {
      previewData.value = res
    }
  } catch (err) {
    console.error('Failed to load resend preview:', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.applicantId],
  ([isOpen, id]) => {
    if (isOpen && id) {
      copiedLink.value = false
      customNote.value = ''
      feedback.value = { type: '', text: '' }
      loadPreview()
    } else {
      previewData.value = null
    }
  },
  { immediate: true }
)

const effectiveContinueUrl = computed(() => {
  if (previewData.value?.continueUrl) return previewData.value.continueUrl
  if (previewData.value?.resumeHash) {
    return `${window.location.origin}/pendaftaran/lanjut/${previewData.value.resumeHash}`
  }
  return ''
})

const effectiveReceiptUrl = computed(() => {
  if (previewData.value?.receiptUrl) return previewData.value.receiptUrl
  if (previewData.value?.resumeHash) {
    return `${window.location.origin}/pendaftaran/lanjut/${previewData.value.resumeHash}?to=struk`
  }
  return ''
})

const liveComposedMessage = computed(() => {
  if (!previewData.value?.previewMessage) return ''
  let baseMsg = previewData.value.previewMessage

  if (!includeReceipt.value) {
    baseMsg = baseMsg.replace(/\n*📄 \*BUKTI \/ STRUK PENDAFTARAN:\*[\s\S]*?(?=\n\n|$)/g, '')
  }

  if (!includeContinueLink.value) {
    baseMsg = baseMsg.replace(/\n*🔗 \*LINK PENDAFTARAN LENGKAP:\*[\s\S]*?(?=\n\n|$)/g, '')
  }

  // Apply customNote if user typed one and it is not in previewMessage yet
  if (customNote.value && customNote.value.trim() && !baseMsg.includes(customNote.value.trim())) {
    baseMsg = `${baseMsg}\n\n📌 *Catatan Panitia:*\n${customNote.value.trim()}`
  }

  return baseMsg.trim()
})

const handleCopyLink = async () => {
  if (!effectiveContinueUrl.value) return
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(effectiveContinueUrl.value)
    } else {
      const el = document.createElement('textarea')
      el.value = effectiveContinueUrl.value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    copiedLink.value = true
    setTimeout(() => {
      copiedLink.value = false
    }, 2500)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

const handleOpenLink = () => {
  if (effectiveContinueUrl.value) {
    window.open(effectiveContinueUrl.value, '_blank')
  }
}

const handleOpenReceipt = () => {
  if (effectiveReceiptUrl.value) {
    window.open(effectiveReceiptUrl.value, '_blank')
  }
}

const handleDownloadReceipt = async () => {
  try {
    isPrintingReceipt.value = true
    const receiptToPrint = {
      ...(previewData.value?.receipt || {}),
      registrationNumber: previewData.value?.registrationNumber || props.applicant?.no_registrasi || props.applicant?.registrationNumber,
      studentName: previewData.value?.studentName || props.applicant?.nama || props.applicant?.studentName,
      whatsapp: previewData.value?.phone || props.applicant?.no_hp || props.applicant?.whatsapp,
      continueUrl: effectiveContinueUrl.value,
      resumeHash: previewData.value?.resumeHash
    }

    await generateReceiptPdf(receiptToPrint)
  } catch (err) {
    console.error('Error printing receipt PDF:', err)
    alert('Gagal membuat dokumen Struk Pendaftaran PDF: ' + (err.message || 'Terjadi kesalahan'))
  } finally {
    isPrintingReceipt.value = false
  }
}

const handleSend = async () => {
  if (!props.applicantId) return
  isSending.value = true
  feedback.value = { type: '', text: '' }

  try {
    const payload = {
      includeReceipt: includeReceipt.value,
      includeContinueLink: includeContinueLink.value,
      customNote: customNote.value ? customNote.value.trim() : '',
      customMessage: liveComposedMessage.value ? liveComposedMessage.value.trim() : ''
    }

    const res = await resendApplicationWhatsapp(props.applicantId, payload)
    
    // Update local preview data if response returns new URLs
    if (res?.data) {
      previewData.value = {
        ...previewData.value,
        ...res.data
      }
    }

    feedback.value = {
      type: 'success',
      text: res.message || 'Pesan WhatsApp beserta struk dan link pendaftaran berhasil dikirimkan.'
    }

    emit('sent', {
      applicantId: props.applicantId,
      result: res
    })

    // Auto close after 2 seconds on success
    setTimeout(() => {
      if (feedback.value.type === 'success') {
        emit('close')
      }
    }, 2200)

  } catch (err) {
    console.error('Error sending WhatsApp resend:', err)
    const errorMsg = err.response?.data?.message || err.message || 'Gagal mengirim ulang pesan WhatsApp'
    feedback.value = {
      type: 'error',
      text: errorMsg
    }
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Kirim Ulang WhatsApp & Berkas Pendaftaran"
    size="2xl"
    @close="emit('close')"
  >
    <div class="space-y-5 py-1">
      
      <!-- Top Alert Feedback -->
      <div 
        v-if="feedback.text" 
        :class="[
          'p-3.5 rounded-xl text-sm flex items-start space-x-2.5 transition-all shadow-sm',
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        ]"
      >
        <CheckCircle2 v-if="feedback.type === 'success'" class="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <AlertCircle v-else class="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div class="flex-1 font-medium text-sm leading-relaxed">
          {{ feedback.text }}
        </div>
      </div>

      <!-- Applicant Quick Summary Card -->
      <div class="bg-gradient-to-r from-slate-50 to-slate-100/70 p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <User class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">Calon Santri</span>
              <span class="font-bold text-slate-900 truncate block">
                {{ previewData?.studentName || applicant?.nama || applicant?.studentName || '-' }}
              </span>
            </div>
          </div>

          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-800 flex items-center justify-center flex-shrink-0">
              <FileText class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">No. Registrasi</span>
              <span class="font-mono font-bold text-blue-900 truncate block">
                {{ previewData?.registrationNumber || applicant?.no_registrasi || applicant?.registrationNumber || '-' }}
              </span>
            </div>
          </div>

          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <Phone class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">WhatsApp Santri/Wali</span>
              <span class="font-mono font-medium text-emerald-700 truncate block">
                {{ formatPhoneDisplay(previewData?.phone || applicant?.no_hp || applicant?.whatsapp) }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
          <span class="text-slate-500">Status Pengiriman WA Terakhir:</span>
          <span 
            class="px-2 py-0.5 rounded-full font-semibold text-xs inline-flex items-center space-x-1"
            :class="[
              (previewData?.whatsappStatus === 'SENT' || applicant?.whatsappStatus === 'SENT')
                ? 'bg-emerald-100 text-emerald-800'
                : ((previewData?.whatsappStatus === 'FAILED' || applicant?.whatsappStatus === 'FAILED')
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700')
            ]"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="[
              (previewData?.whatsappStatus === 'SENT' || applicant?.whatsappStatus === 'SENT') ? 'bg-emerald-600' : ((previewData?.whatsappStatus === 'FAILED' || applicant?.whatsappStatus === 'FAILED') ? 'bg-rose-600' : 'bg-slate-500')
            ]"></span>
            <span>
              {{ (previewData?.whatsappStatus === 'SENT' || applicant?.whatsappStatus === 'SENT') ? 'Sudah Terkirim' : ((previewData?.whatsappStatus === 'FAILED' || applicant?.whatsappStatus === 'FAILED') ? 'Gagal Terkirim' : 'Belum Pernah Terkirim') }}
            </span>
          </span>
        </div>
      </div>

      <!-- Feature 1: Link Pendaftaran Lengkap -->
      <div class="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition-colors">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="p-1 rounded-md bg-emerald-100 text-emerald-800">
              <LinkIcon class="w-4 h-4" />
            </span>
            <h4 class="font-bold text-slate-800 text-sm m-0">Link Pendaftaran Lengkap</h4>
          </div>
          <span class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Akses Form Otomatis
          </span>
        </div>

        <p class="text-xs text-slate-600 mb-3 leading-relaxed">
          Tautan langsung ini digunakan calon santri atau wali untuk melanjutkan pengisian formulir pendaftaran lengkap dari HP atau laptop manapun tanpa perlu login ulang.
        </p>

        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input 
              type="text" 
              readonly 
              :value="effectiveContinueUrl || (loading ? 'Menyiapkan tautan...' : '-')"
              class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="button"
            @click="handleCopyLink"
            :disabled="!effectiveContinueUrl || loading"
            class="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors border shadow-2xs"
            :class="[
              copiedLink 
                ? 'bg-emerald-600 text-white border-emerald-600' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            ]"
            title="Salin Tautan ke Clipboard"
          >
            <Check v-if="copiedLink" class="w-3.5 h-3.5 mr-1" />
            <Copy v-else class="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span>{{ copiedLink ? 'Tersalin!' : 'Salin Link' }}</span>
          </button>

          <button
            type="button"
            @click="handleOpenLink"
            :disabled="!effectiveContinueUrl || loading"
            class="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
            title="Buka Formulir Pendaftaran di Tab Baru"
          >
            <ExternalLink class="w-3.5 h-3.5 mr-1" />
            <span>Buka</span>
          </button>
        </div>
      </div>

      <!-- Feature 2: Lampiran Ulang Struk Pendaftaran -->
      <div class="bg-white p-4 rounded-xl border border-blue-100 shadow-xs hover:border-blue-300 transition-colors">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="p-1 rounded-md bg-blue-100 text-blue-800">
              <FileText class="w-4 h-4" />
            </span>
            <h4 class="font-bold text-slate-800 text-sm m-0">Lampiran Ulang Struk Pendaftaran</h4>
          </div>
          <span class="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            Tanda Bukti Resmi
          </span>
        </div>

        <p class="text-xs text-slate-600 mb-3 leading-relaxed">
          Tanda bukti pendaftaran resmi SPSMB lengkap dengan nomor registrasi, identitas santri, lembaga pilihan, asrama pondok, dan QR Code akses.
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="handleDownloadReceipt"
            :disabled="loading || isPrintingReceipt"
            class="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <svg v-if="isPrintingReceipt" class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
            <Printer v-else class="w-3.5 h-3.5 mr-1.5" />
            <span>{{ isPrintingReceipt ? 'Menyiapkan PDF...' : 'Cetak / Unduh Struk (PDF)' }}</span>
          </button>

          <button
            type="button"
            @click="handleOpenReceipt"
            :disabled="!effectiveReceiptUrl || loading"
            class="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
          >
            <ExternalLink class="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>Buka Halaman Struk Online</span>
          </button>
        </div>
      </div>

      <!-- Feature 3: Pengaturan Kirim Ulang WA -->
      <div class="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
        <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
          Opsi Notifikasi WhatsApp
        </h4>

        <div class="space-y-2">
          <label class="flex items-start space-x-2.5 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="includeReceipt" 
              class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5" 
            />
            <span class="text-xs text-slate-700 leading-normal">
              <strong>Lampirkan Rincian & Tautan Struk Pendaftaran</strong>
              <span class="block text-slate-500 text-[11px]">Sertakan data ringkas tanda bukti dan link unduh/cetak struk pendaftaran santri baru.</span>
            </span>
          </label>

          <label class="flex items-start space-x-2.5 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="includeContinueLink" 
              class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5" 
            />
            <span class="text-xs text-slate-700 leading-normal">
              <strong>Sertakan Link Pendaftaran Lengkap</strong>
              <span class="block text-slate-500 text-[11px]">Sertakan link formulir untuk melanjutkan pengisian data dan unggah dokumen santri.</span>
            </span>
          </label>
        </div>

        <div class="pt-2 border-t border-slate-200/60">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Tambahan untuk Santri/Wali (Opsional)
          </label>
          <textarea
            v-model="customNote"
            rows="2"
            placeholder="Contoh: Mohon segera melengkapi berkas pas foto dan rapor sebelum tanggal verifikasi berakhir."
            class="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          ></textarea>
        </div>
      </div>

      <!-- Feature 4: Live Preview Pesan WhatsApp -->
      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          @click="showMessagePreview = !showMessagePreview"
          class="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 transition-colors text-xs font-bold text-slate-700"
        >
          <div class="flex items-center space-x-2">
            <MessageSquare class="w-4 h-4 text-emerald-700" />
            <span>Pratinjau Pesan WhatsApp yang Akan Dikirim</span>
          </div>
          <component :is="showMessagePreview ? ChevronUp : ChevronDown" class="w-4 h-4 text-slate-500" />
        </button>

        <div v-if="showMessagePreview" class="p-3 bg-[#EFEAE2] border-t border-slate-200">
          <div class="bg-white rounded-lg p-3.5 shadow-sm max-w-full text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap select-text border-l-4 border-l-emerald-600">
            <div v-if="loading" class="text-slate-400 py-3 text-center">
              Memuat pratinjau pesan...
            </div>
            <div v-else>
              {{ liveComposedMessage }}
            </div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <span class="text-xs text-slate-500 hidden sm:inline">
          Pesan akan dikirim langsung via Gateway WhatsApp GOWA
        </span>

        <div class="flex justify-end space-x-2 w-full sm:w-auto">
          <button 
            type="button" 
            @click="emit('close')" 
            class="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            :disabled="isSending"
          >
            Tutup
          </button>

          <button 
            type="button" 
            @click="handleSend" 
            class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
            :disabled="isSending || loading"
          >
            <svg v-if="isSending" class="animate-spin w-4 h-4 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <Send v-else class="w-3.5 h-3.5 mr-1" />
            <span>
              {{ isSending ? 'Mengirim WhatsApp...' : (applicant?.whatsappStatus === 'SENT' ? 'Kirim Ulang WhatsApp' : 'Kirim WhatsApp Sekarang') }}
            </span>
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>
