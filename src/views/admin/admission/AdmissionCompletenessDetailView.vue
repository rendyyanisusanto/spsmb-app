<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAdmissionApplicationDetail,
  updateAdmissionAcceptance,
  updateAdmissionCompletion,
  uploadAdmissionCompletionFile,
  removeAdmissionCompletionFile
} from '@/services/admissionService'
import { formatDate } from '@/utils/date'
import { formatPhoneDisplay } from '@/utils/phone'
import { resolveStorageUrl } from '@/utils/imageUrl'

import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  School,
  Building2,
  Calendar,
  MessageCircle,
  FileCheck,
  Upload,
  Download,
  Trash2,
  FileText,
  CreditCard,
  Package,
  Layers,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Save,
  Check,
  X
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const applicationId = route.params.id

// States
const loading = ref(true)
const error = ref('')
const application = ref(null)
const completions = ref([])
const summary = ref({
  totalRequired: 0,
  completedRequired: 0,
  totalAll: 0,
  completedAll: 0,
  isComplete: false,
  progressPercentage: 0
})

// Acceptance Modal State
const isAcceptanceModalOpen = ref(false)
const acceptanceForm = ref({
  is_accepted: true,
  notes: ''
})
const submittingAcceptance = ref(false)

// Action loading states
const updatingCompletionId = ref(null)
const uploadingRequirementId = ref(null)
const fileInputs = ref({})

// Toast message
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3500)
}

// Requirement Type Badges
const typeMeta = {
  DOCUMENT: { label: 'Dokumen', class: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
  PAYMENT: { label: 'Pembayaran', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CreditCard },
  EQUIPMENT: { label: 'Perlengkapan', class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Package },
  ADMINISTRATION: { label: 'Administrasi', class: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Layers },
  OTHER: { label: 'Lainnya', class: 'bg-slate-100 text-slate-700 border-slate-200', icon: HelpCircle }
}

const loadDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getAdmissionApplicationDetail(applicationId)
    application.value = res.application
    completions.value = res.completions || []
    summary.value = res.summary || summary.value
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Gagal memuat detail kelengkapan pendaftar'
  } finally {
    loading.value = false
  }
}

// Toggle Acceptance Modal
const openAcceptanceModal = (targetAccepted) => {
  acceptanceForm.value = {
    is_accepted: targetAccepted,
    notes: ''
  }
  isAcceptanceModalOpen.value = true
}

const submitAcceptance = async () => {
  submittingAcceptance.value = true
  try {
    const res = await updateAdmissionAcceptance(applicationId, acceptanceForm.value)
    application.value = res.application
    showToast(
      acceptanceForm.value.is_accepted
        ? 'Status calon siswa berhasil DITERIMA!'
        : 'Status penerimaan calon siswa berhasil dibatalkan.'
    )
    isAcceptanceModalOpen.value = false
    await loadDetail()
  } catch (err) {
    showToast(err.response?.data?.message || err.message || 'Gagal memperbarui status penerimaan', 'error')
  } finally {
    submittingAcceptance.value = false
  }
}

// Toggle Completion Status
const toggleCompletionStatus = async (item) => {
  updatingCompletionId.value = item.requirementId
  const nextStatus = !item.isCompleted
  try {
    const res = await updateAdmissionCompletion(applicationId, item.requirementId, {
      is_completed: nextStatus,
      notes: item.notes
    })
    application.value = res.application
    completions.value = res.completions
    summary.value = res.summary
    showToast(`Komponen "${item.requirementName}" ditandai ${nextStatus ? 'Lengkap' : 'Belum Lengkap'}`)
  } catch (err) {
    showToast(err.response?.data?.message || err.message || 'Gagal memperbarui komponen', 'error')
  } finally {
    updatingCompletionId.value = null
  }
}

// Save Notes
const saveNote = async (item) => {
  updatingCompletionId.value = item.requirementId
  try {
    const res = await updateAdmissionCompletion(applicationId, item.requirementId, {
      is_completed: item.isCompleted,
      notes: item.notes
    })
    application.value = res.application
    completions.value = res.completions
    summary.value = res.summary
    showToast(`Catatan untuk "${item.requirementName}" tersimpan`)
  } catch (err) {
    showToast(err.response?.data?.message || err.message || 'Gagal menyimpan catatan', 'error')
  } finally {
    updatingCompletionId.value = null
  }
}

// File Upload Handler
const triggerFileInput = (requirementId) => {
  const el = fileInputs.value[requirementId]
  if (el) el.click()
}

const handleFileUpload = async (event, item) => {
  const file = event.target.files?.[0]
  if (!file) return

  uploadingRequirementId.value = item.requirementId
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (item.notes) formData.append('notes', item.notes)

    const res = await uploadAdmissionCompletionFile(applicationId, item.requirementId, formData)
    application.value = res.application
    completions.value = res.completions
    summary.value = res.summary
    showToast(`Berkas "${file.name}" berhasil diunggah!`)
  } catch (err) {
    showToast(err.response?.data?.message || err.message || 'Gagal mengunggah berkas', 'error')
  } finally {
    uploadingRequirementId.value = null
    // Reset input
    event.target.value = ''
  }
}

// Remove File Handler
const handleRemoveFile = async (item) => {
  if (!confirm(`Hapus berkas lampiran untuk "${item.requirementName}"?`)) return

  uploadingRequirementId.value = item.requirementId
  try {
    const res = await removeAdmissionCompletionFile(applicationId, item.requirementId)
    application.value = res.application
    completions.value = res.completions
    summary.value = res.summary
    showToast(`Berkas untuk "${item.requirementName}" berhasil dihapus`)
  } catch (err) {
    showToast(err.response?.data?.message || err.message || 'Gagal menghapus berkas', 'error')
  } finally {
    uploadingRequirementId.value = null
  }
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const goBack = () => {
  router.push('/admin/kelengkapan-pendaftar')
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Toast Notification -->
    <div
      v-if="toast.show"
      class="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold"
      :class="toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'"
    >
      <span>{{ toast.message }}</span>
    </div>

    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <button
          @click="goBack"
          class="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">
              Kelengkapan: {{ application?.fullName || 'Memuat...' }}
            </h1>
            <span
              v-if="application"
              class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border"
              :class="application.isAccepted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
            >
              {{ application.isAccepted ? 'DITERIMA' : 'BELUM DITERIMA' }}
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
            {{ application?.registrationNumber }} &bull; {{ application?.institutionName }}
          </p>
        </div>
      </div>

      <div v-if="application" class="flex items-center gap-2">
        <BaseButton
          v-if="!application.isAccepted"
          @click="openAcceptanceModal(true)"
          variant="primary"
          size="sm"
          class="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 class="w-4 h-4 mr-1.5" />
          Tetapkan Diterima
        </BaseButton>

        <BaseButton
          v-else
          @click="openAcceptanceModal(false)"
          variant="outline"
          size="sm"
          class="border-rose-200 text-rose-600 hover:bg-rose-50"
        >
          <XCircle class="w-4 h-4 mr-1.5" />
          Batalkan Terima
        </BaseButton>

        <BaseButton
          @click="loadDetail"
          variant="outline"
          size="sm"
          :disabled="loading"
          class="border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
          Segarkan
        </BaseButton>
      </div>
    </div>

    <!-- Error State -->
    <BaseErrorState
      v-if="error"
      :message="error"
      @retry="loadDetail"
    />

    <!-- Loading Skeleton -->
    <div v-if="loading" class="py-16 text-center">
      <BaseLoading message="Memuat kelengkapan dokumen pendaftar..." />
    </div>

    <div v-else-if="application" class="space-y-6">
      <!-- ========================================== -->
      <!-- DATA PENDAFTAR & PROGRES SUMMARY           -->
      <!-- ========================================== -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Card 1: Data Diri & Asal Sekolah -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
            <User class="w-4 h-4 text-emerald-600" />
            <span>Identitas Calon Siswa</span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500">Nama Lengkap:</span>
              <span class="font-bold text-slate-800 text-right">{{ application.fullName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Jenis Kelamin:</span>
              <span class="font-medium text-slate-700">{{ application.gender === 'MALE' ? 'Laki-laki' : 'Perempuan' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Asal Sekolah:</span>
              <span class="font-medium text-slate-700 text-right">{{ application.previousSchool || '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Kontak WhatsApp:</span>
              <a
                v-if="application.whatsapp"
                :href="`https://wa.me/${application.whatsapp.replace(/[^0-9]/g, '')}`"
                target="_blank"
                class="font-mono font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <MessageCircle class="w-3 h-3 text-emerald-600" />
                {{ formatPhoneDisplay(application.whatsapp) }}
              </a>
              <span v-else>-</span>
            </div>
            <div v-if="application.guardians && application.guardians.length > 0" class="pt-2 border-t border-slate-100 space-y-1">
              <span class="text-slate-500 font-semibold">Orang Tua / Wali:</span>
              <div v-for="g in application.guardians" :key="g.id" class="text-slate-700 flex justify-between">
                <span>{{ g.relationship || 'Wali' }}: <strong>{{ g.name }}</strong></span>
                <span class="text-slate-500 font-mono">{{ g.phone || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Pendaftaran & Status Penerimaan -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
            <Building2 class="w-4 h-4 text-emerald-600" />
            <span>Pendaftaran & Status Penerimaan</span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500">Lembaga Tujuan:</span>
              <span class="font-bold text-slate-800">{{ application.institutionName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Tahun Ajaran:</span>
              <span class="font-medium text-slate-700">{{ application.academicYear }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Gelombang:</span>
              <span class="font-medium text-slate-700">{{ application.waveName }}</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-100">
              <span class="text-slate-500">Status Penerimaan:</span>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                :class="application.isAccepted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
              >
                {{ application.isAccepted ? 'DITERIMA' : 'BELUM DITERIMA' }}
              </span>
            </div>
            <div v-if="application.isAccepted" class="text-[11px] text-slate-500 space-y-0.5 pt-1">
              <div>Ditetapkan: <strong>{{ formatDate(application.acceptedAt) }}</strong></div>
              <div>Oleh: <strong>{{ application.acceptedByName || 'Admin Sistem' }}</strong></div>
            </div>
          </div>
        </div>

        <!-- Card 3: Progres Kelengkapan Administrasi -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileCheck class="w-4 h-4 text-teal-600" />
                Progres Administrasi
              </span>
              <span
                class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                :class="summary.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ summary.isComplete ? 'LENGKAP' : 'BELUM LENGKAP' }}
              </span>
            </div>

            <div class="space-y-3">
              <div>
                <div class="flex items-center justify-between text-xs font-semibold mb-1">
                  <span class="text-slate-600">Komponen Wajib:</span>
                  <span class="text-slate-800 font-mono font-bold">{{ summary.completedRequired }} dari {{ summary.totalRequired }} Selesai</span>
                </div>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="summary.isComplete ? 'bg-emerald-500' : 'bg-amber-500'"
                    :style="{ width: `${summary.progressPercentage}%` }"
                  ></div>
                </div>
              </div>

              <div class="text-[11px] text-slate-500 flex justify-between pt-1">
                <span>Total Komponen Aktif:</span>
                <span class="font-mono font-semibold">{{ summary.completedAll }} / {{ summary.totalAll }}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            *Status "Lengkap" ditentukan oleh seluruh komponen yang ditandai WAJIB. Komponen opsional tidak menghambat kelulusan administrasi.
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- DAFTAR KOMPONEN KELENGKAPAN (SPRINT 4)     -->
      <!-- ========================================== -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileCheck class="w-4 h-4 text-emerald-600" />
              Checklist Komponen Kelengkapan ({{ application.institutionName }})
            </h3>
            <p class="text-xs text-slate-500">
              Perbarui status pemenuhan dan unggah bukti fisik/berkas pendukung calon siswa.
            </p>
          </div>
        </div>

        <BaseEmptyState
          v-if="completions.length === 0"
          title="Belum ada komponen yang dikonfigurasi untuk lembaga ini"
          description="Silakan buka menu Master Komponen Kelengkapan untuk menambahkan persyaratan."
          class="py-12"
        />

        <div v-else class="space-y-3.5">
          <div
            v-for="item in completions"
            :key="item.requirementId"
            class="p-4 rounded-xl border transition-all"
            :class="item.isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'"
          >
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <!-- Left: Component Info -->
              <div class="space-y-1.5 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
                    :class="item.isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
                  >
                    <Check v-if="item.isCompleted" class="w-3 h-3" />
                    <span v-else>{{ item.sortOrder }}</span>
                  </span>

                  <h4 class="text-xs font-bold text-slate-800">{{ item.requirementName }}</h4>

                  <!-- Type Badge -->
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    :class="typeMeta[item.requirementType]?.class || 'bg-slate-100 text-slate-700'"
                  >
                    <component :is="typeMeta[item.requirementType]?.icon" class="w-3 h-3" />
                    {{ typeMeta[item.requirementType]?.label || item.requirementType }}
                  </span>

                  <!-- Required / Optional -->
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                    :class="item.isRequired ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ item.isRequired ? 'WAJIB' : 'OPSIONAL' }}
                  </span>

                  <!-- Completion Status Badge -->
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    :class="item.isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'"
                  >
                    {{ item.isCompleted ? 'SUDAH LENGKAP' : 'BELUM' }}
                  </span>
                </div>

                <p v-if="item.description" class="text-xs text-slate-500">
                  {{ item.description }}
                </p>

                <!-- File preview if exists -->
                <div v-if="item.filePath" class="flex items-center gap-2 pt-1">
                  <span class="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <FileText class="w-3.5 h-3.5 text-blue-600" />
                    {{ item.fileName || 'Berkas Terlampir' }}
                  </span>
                  <span v-if="item.fileSize" class="text-[10px] text-slate-400 font-mono">
                    ({{ formatFileSize(item.fileSize) }})
                  </span>
                  <a
                    :href="resolveStorageUrl(item.filePath)"
                    target="_blank"
                    class="text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-0.5 ml-1"
                  >
                    <ExternalLink class="w-3 h-3" />
                    Lihat / Unduh
                  </a>
                  <button
                    @click="handleRemoveFile(item)"
                    :disabled="uploadingRequirementId === item.requirementId"
                    class="text-xs text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5 ml-2"
                  >
                    <Trash2 class="w-3 h-3" />
                    Hapus Berkas
                  </button>
                </div>
              </div>

              <!-- Right: Actions & File Upload -->
              <div class="flex flex-wrap items-center gap-2 self-start lg:self-center">
                <!-- Hidden file input -->
                <input
                  type="file"
                  :ref="el => fileInputs[item.requirementId] = el"
                  @change="e => handleFileUpload(e, item)"
                  class="hidden"
                />

                <!-- Upload / Ganti file button if requires_upload -->
                <button
                  v-if="item.requiresUpload"
                  type="button"
                  @click="triggerFileInput(item.requirementId)"
                  :disabled="uploadingRequirementId === item.requirementId"
                  class="px-2.5 py-1.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Upload class="w-3.5 h-3.5 text-blue-600" :class="{ 'animate-bounce': uploadingRequirementId === item.requirementId }" />
                  <span>{{ item.filePath ? 'Ganti Berkas' : 'Unggah Berkas' }}</span>
                </button>

                <!-- Status Toggle Button -->
                <button
                  type="button"
                  @click="toggleCompletionStatus(item)"
                  :disabled="updatingCompletionId === item.requirementId"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  :class="item.isCompleted ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'"
                >
                  <CheckCircle2 v-if="item.isCompleted" class="w-3.5 h-3.5" />
                  <Clock v-else class="w-3.5 h-3.5 text-slate-400" />
                  <span>{{ item.isCompleted ? 'Sudah Lengkap' : 'Tandai Lengkap' }}</span>
                </button>
              </div>
            </div>

            <!-- Notes Section per Component -->
            <div class="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                type="text"
                v-model="item.notes"
                placeholder="Catatan petugas (nomor kwitansi, nomor berkas, verifikasi fisik)..."
                class="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
              />
              <button
                @click="saveNote(item)"
                :disabled="updatingCompletionId === item.requirementId"
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                <Save class="w-3 h-3 text-slate-500" />
                <span>Simpan Catatan</span>
              </button>
              <div v-if="item.completedByName" class="text-[10px] text-slate-400 ml-auto whitespace-nowrap">
                Diperiksa oleh: {{ item.completedByName }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL PENETAPAN PENERIMAAN                 -->
    <!-- ========================================== -->
    <BaseModal
      :open="isAcceptanceModalOpen"
      :title="acceptanceForm.is_accepted ? 'Konfirmasi Penetapan Diterima' : 'Batalkan Penerimaan Siswa'"
      size="md"
      @close="isAcceptanceModalOpen = false"
    >
      <div v-if="application" class="space-y-4">
        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div class="text-slate-500">Nama Calon Siswa:</div>
          <div class="font-bold text-slate-800 text-sm">{{ application.fullName }}</div>
          <div class="text-slate-500 mt-1">Nomor Pendaftaran:</div>
          <div class="font-mono font-bold text-slate-700">{{ application.registrationNumber }}</div>
          <div class="text-slate-500 mt-1">Lembaga Tujuan:</div>
          <div class="font-semibold text-slate-800">{{ application.institutionName }}</div>
        </div>

        <div
          class="p-3 rounded-xl border text-xs leading-relaxed"
          :class="acceptanceForm.is_accepted ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'"
        >
          <p v-if="acceptanceForm.is_accepted">
            Calon siswa ini akan ditetapkan berstatus <strong>DITERIMA</strong> pada {{ application.institutionName }}.
          </p>
          <p v-else>
            Status penerimaan calon siswa ini akan dibatalkan menjadi <strong>BELUM DITERIMA</strong>.
          </p>
        </div>

        <div>
          <BaseTextarea
            v-model="acceptanceForm.notes"
            label="Catatan Penerimaan (Opsional)"
            placeholder="Tambahkan catatan keputusan penerimaan atau hasil seleksi..."
            rows="3"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2.5">
          <BaseButton
            type="button"
            variant="outline"
            @click="isAcceptanceModalOpen = false"
            :disabled="submittingAcceptance"
          >
            Batal
          </BaseButton>

          <BaseButton
            type="button"
            :variant="acceptanceForm.is_accepted ? 'primary' : 'danger'"
            :loading="submittingAcceptance"
            @click="submitAcceptance"
            :class="acceptanceForm.is_accepted ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''"
          >
            {{ acceptanceForm.is_accepted ? 'Ya, Tetapkan Diterima' : 'Ya, Batalkan Penerimaan' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

