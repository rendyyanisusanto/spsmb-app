<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  getAdmissionFilters,
  getAdmissionApplications,
  updateAdmissionAcceptance
} from '@/services/admissionService'
import { formatDate } from '@/utils/date'
import { formatPhoneDisplay } from '@/utils/phone'

import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RotateCcw,
  Search,
  Settings2,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  FileText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Building2,
  GraduationCap
} from 'lucide-vue-next'

const router = useRouter()
const { user, hasRole } = useAuth()

// Role Scoping
const isSuperAdmin = computed(() => {
  return (
    user.value?.primaryRole === 'SUPER_ADMIN' ||
    user.value?.role === 'SUPER_ADMIN' ||
    hasRole('SUPER_ADMIN')
  )
})

const isPondokAdmin = computed(() => {
  if (isSuperAdmin.value) return true
  const userInsts = user.value?.institutions || []
  return userInsts.some(i => {
    const type = (typeof i === 'object' ? i.institution_type : '') || ''
    const code = (typeof i === 'object' ? i.code : '') || ''
    const name = (typeof i === 'object' ? i.name : '') || ''
    return type === 'PONDOK' || code.includes('PPSQ') || name.toLowerCase().includes('pondok')
  })
})

const canChooseInstitution = computed(() => {
  return isSuperAdmin.value || isPondokAdmin.value
})

// States
const loading = ref(true)
const error = ref('')
const applications = ref([])
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
})

const stats = ref({
  totalApplicants: 0,
  totalAccepted: 0,
  totalPending: 0,
  totalCompleted: 0,
  totalIncomplete: 0,
  acceptedIncomplete: 0,
  acceptedCompleted: 0,
  acceptanceRate: 0,
  completionRate: 0
})

// Filter Options
const filterOptions = ref({
  institutions: [],
  academicYears: [],
  waves: []
})

// Active Filters
const filters = ref({
  search: '',
  institutionId: 'ALL',
  academicYear: 'ALL',
  admissionWaveId: 'ALL',
  isAccepted: 'ALL',
  completenessStatus: 'ALL'
})

// Acceptance Modal
const isAcceptanceModalOpen = ref(false)
const selectedApp = ref(null)
const acceptanceForm = ref({
  is_accepted: true,
  notes: ''
})
const submittingAcceptance = ref(false)

// Toast message
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3500)
}

// Load Lookups
const loadFilters = async () => {
  try {
    const res = await getAdmissionFilters()
    filterOptions.value = res
    if (!canChooseInstitution.value && res.institutions.length > 0) {
      filters.value.institutionId = String(res.institutions[0].id)
    }
  } catch (err) {
    console.error('Failed to load filter options:', err)
  }
}

// Load Application Data
const loadApplications = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: filters.value.search.trim(),
      institutionId: filters.value.institutionId !== 'ALL' ? filters.value.institutionId : '',
      academicYear: filters.value.academicYear !== 'ALL' ? filters.value.academicYear : '',
      admissionWaveId: filters.value.admissionWaveId !== 'ALL' ? filters.value.admissionWaveId : '',
      isAccepted: filters.value.isAccepted !== 'ALL' ? filters.value.isAccepted : '',
      completenessStatus: filters.value.completenessStatus !== 'ALL' ? filters.value.completenessStatus : ''
    }

    const res = await getAdmissionApplications(params)
    applications.value = res.data || []
    pagination.value = res.meta || { page: 1, limit: 10, total: 0, totalPages: 0 }
    stats.value = res.stats || stats.value
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Gagal memuat data pendaftar'
  } finally {
    loading.value = false
  }
}

// Reset Filters
const resetFilters = () => {
  filters.value = {
    search: '',
    institutionId: canChooseInstitution.value ? 'ALL' : (filterOptions.value.institutions[0]?.id ? String(filterOptions.value.institutions[0].id) : 'ALL'),
    academicYear: 'ALL',
    admissionWaveId: 'ALL',
    isAccepted: 'ALL',
    completenessStatus: 'ALL'
  }
  pagination.value.page = 1
}

// Watch filters with debounce for search
let searchTimer = null
watch(
  filters,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      pagination.value.page = 1
      loadApplications()
    }, 250)
  },
  { deep: true }
)

const changePage = (p) => {
  if (p < 1 || p > pagination.value.totalPages) return
  pagination.value.page = p
  loadApplications()
}

// Open Acceptance Modal
const openAcceptanceModal = (app, targetAccepted) => {
  selectedApp.value = app
  acceptanceForm.value = {
    is_accepted: targetAccepted,
    notes: ''
  }
  isAcceptanceModalOpen.value = true
}

const submitAcceptance = async () => {
  if (!selectedApp.value) return
  submittingAcceptance.value = true
  try {
    await updateAdmissionAcceptance(selectedApp.value.id, acceptanceForm.value)
    showToast(
      acceptanceForm.value.is_accepted
        ? `Calon siswa ${selectedApp.value.fullName} berhasil DITERIMA!`
        : `Penerimaan calon siswa ${selectedApp.value.fullName} berhasil dibatalkan.`
    )
    isAcceptanceModalOpen.value = false
    await loadApplications()
  } catch (err) {
    showToast(err.response?.data?.message || err.message || 'Gagal memperbarui status penerimaan', 'error')
  } finally {
    submittingAcceptance.value = false
  }
}

const goToDetail = (id) => {
  router.push(`/admin/kelengkapan-pendaftar/${id}`)
}

const goToMasterRequirements = () => {
  router.push('/admin/kelengkapan-pendaftar/master-komponen')
}

const goToReport = () => {
  router.push('/admin/kelengkapan-pendaftar/laporan')
}

onMounted(async () => {
  await loadFilters()
  await loadApplications()
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Toast Notification -->
    <div
      v-if="toast.show"
      class="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold transition-all duration-300"
      :class="toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'"
    >
      <span>{{ toast.message }}</span>
    </div>

    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileCheck class="w-6 h-6 text-emerald-600" />
          Kelengkapan Pendaftar & Penerimaan
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Pantau status penerimaan calon siswa dan kelola pemenuhan berkas serta administrasi per lembaga secara terpusat.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <BaseButton
          @click="goToReport"
          variant="outline"
          size="sm"
          class="border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
        >
          <FileText class="w-4 h-4 mr-1.5 text-emerald-600" />
          Laporan Kelengkapan
        </BaseButton>

        <BaseButton
          @click="goToMasterRequirements"
          variant="outline"
          size="sm"
          class="border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <Settings2 class="w-4 h-4 mr-1.5 text-slate-500" />
          Master Komponen
        </BaseButton>

        <BaseButton
          @click="loadApplications"
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
      @retry="loadApplications"
      class="mb-4"
    />

    <!-- ========================================== -->
    <!-- DASHBOARD STATISTIK REKAPITULASI (SPRINT 5)-->
    <!-- ========================================== -->
    <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <!-- 1. Total Pendaftar -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold text-slate-500">Total Pendaftar</span>
          <span class="p-1 bg-slate-100 text-slate-600 rounded-lg">
            <Users class="w-3.5 h-3.5" />
          </span>
        </div>
        <div class="text-2xl font-extrabold text-slate-800">
          {{ stats.totalApplicants.toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5">Sesuai filter aktif</div>
      </div>

      <!-- 2. Diterima -->
      <div class="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs bg-emerald-50/10">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold text-emerald-700">Diterima</span>
          <span class="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
            <CheckCircle2 class="w-3.5 h-3.5" />
          </span>
        </div>
        <div class="text-2xl font-extrabold text-emerald-600">
          {{ stats.totalAccepted.toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-emerald-600 font-semibold mt-0.5">
          {{ stats.acceptanceRate }}% diterima
        </div>
      </div>

      <!-- 3. Belum Diterima -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold text-slate-600">Belum Diterima</span>
          <span class="p-1 bg-slate-100 text-slate-500 rounded-lg">
            <Clock class="w-3.5 h-3.5" />
          </span>
        </div>
        <div class="text-2xl font-extrabold text-slate-700">
          {{ stats.totalPending.toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5">Dalam proses seleksi</div>
      </div>

      <!-- 4. Administrasi Lengkap -->
      <div class="bg-white rounded-2xl border border-teal-100 p-4 shadow-xs bg-teal-50/10">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold text-teal-700">Berkas Lengkap</span>
          <span class="p-1 bg-teal-100 text-teal-700 rounded-lg">
            <FileCheck class="w-3.5 h-3.5" />
          </span>
        </div>
        <div class="text-2xl font-extrabold text-teal-700">
          {{ stats.totalCompleted.toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-teal-600 font-semibold mt-0.5">
          {{ stats.completionRate }}% memenuhi syarat
        </div>
      </div>

      <!-- 5. Administrasi Belum Lengkap -->
      <div class="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs bg-amber-50/10">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold text-amber-700">Belum Lengkap</span>
          <span class="p-1 bg-amber-100 text-amber-700 rounded-lg">
            <AlertTriangle class="w-3.5 h-3.5" />
          </span>
        </div>
        <div class="text-2xl font-extrabold text-amber-600">
          {{ stats.totalIncomplete.toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-amber-600 font-medium mt-0.5">Perlu dilengkapi</div>
      </div>

      <!-- 6. Diterima & Belum Lengkap -->
      <div class="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs bg-rose-50/20">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold text-rose-700">Diterima - Pending</span>
          <span class="p-1 bg-rose-100 text-rose-700 rounded-lg">
            <AlertTriangle class="w-3.5 h-3.5" />
          </span>
        </div>
        <div class="text-2xl font-extrabold text-rose-600">
          {{ stats.acceptedIncomplete.toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-rose-600 font-medium mt-0.5">Diterima tapi berkas belum</div>
      </div>

      <!-- 7. Diterima & Sudah Lengkap -->
      <div class="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/30">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold text-emerald-800">Diterima & Tuntas</span>
          <span class="p-1 bg-emerald-200 text-emerald-800 rounded-lg">
            <CheckCircle2 class="w-3.5 h-3.5" />
          </span>
        </div>
        <div class="text-2xl font-extrabold text-emerald-700">
          {{ stats.acceptedCompleted.toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-emerald-700 font-bold mt-0.5">Administrasi tuntas</div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- FILTER BAR (SPRINT 2)                      -->
    <!-- ========================================== -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
      <div class="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter class="w-4 h-4 text-emerald-600" />
          <span>Filter & Pencarian Pendaftar</span>
        </div>
        <button
          @click="resetFilters"
          class="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Reset Filter
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <!-- Search Input -->
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Cari Pendaftar</label>
          <div class="relative">
            <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              v-model="filters.search"
              placeholder="Nama, no pendaftaran, asal sekolah..."
              class="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <!-- Filter Lembaga -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Lembaga</label>
          <select
            v-model="filters.institutionId"
            :disabled="!canChooseInstitution"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
          >
            <option v-if="canChooseInstitution" value="ALL">Semua Lembaga</option>
            <option
              v-for="inst in filterOptions.institutions"
              :key="inst.id"
              :value="String(inst.id)"
            >
              {{ inst.name }} ({{ inst.code }})
            </option>
          </select>
        </div>

        <!-- Filter Tahun Ajaran -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Tahun Ajaran</label>
          <select
            v-model="filters.academicYear"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">Semua Tahun</option>
            <option v-for="yr in filterOptions.academicYears" :key="yr" :value="yr">
              {{ yr }}
            </option>
          </select>
        </div>

        <!-- Filter Status Penerimaan -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Status Diterima</label>
          <select
            v-model="filters.isAccepted"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">Semua Status</option>
            <option value="1">Diterima</option>
            <option value="0">Belum Diterima</option>
          </select>
        </div>

        <!-- Filter Kelengkapan -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Kelengkapan</label>
          <select
            v-model="filters.completenessStatus"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">Semua Kelengkapan</option>
            <option value="complete">Lengkap</option>
            <option value="incomplete">Belum Lengkap</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TABEL DATA PENDAFTAR (SPRINT 2)            -->
    <!-- ========================================== -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-800">
          Daftar Kelengkapan Calon Peserta Didik ({{ pagination.total }})
        </h3>
        <span class="text-xs text-slate-400">
          Menampilkan halaman {{ pagination.page }} dari {{ pagination.totalPages || 1 }}
        </span>
      </div>

      <div v-if="loading" class="py-16 text-center">
        <BaseLoading message="Memuat data pendaftar..." />
      </div>

      <BaseEmptyState
        v-else-if="applications.length === 0"
        title="Tidak ada pendaftar ditemukan"
        description="Cobalah mengatur ulang filter pencarian Anda."
        class="py-12"
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <th class="py-3 px-4">No. Pendaftaran</th>
              <th class="py-3 px-4">Nama Calon Siswa</th>
              <th class="py-3 px-3">L/P</th>
              <th class="py-3 px-3">Asal Sekolah</th>
              <th class="py-3 px-3">Lembaga Tujuan</th>
              <th class="py-3 px-3">Tahun / Gelombang</th>
              <th class="py-3 px-3 text-center">Status Penerimaan</th>
              <th class="py-3 px-3">Kelengkapan Administrasi</th>
              <th class="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="app in applications"
              :key="app.id"
              class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
            >
              <!-- No Pendaftaran -->
              <td class="py-3 px-4 font-mono font-bold text-slate-800">
                {{ app.registrationNumber }}
              </td>

              <!-- Nama & Kontak -->
              <td class="py-3 px-4">
                <div class="font-bold text-slate-800">{{ app.fullName }}</div>
                <div class="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                  <a
                    v-if="app.whatsapp"
                    :href="`https://wa.me/${app.whatsapp.replace(/[^0-9]/g, '')}`"
                    target="_blank"
                    class="text-emerald-700 hover:underline flex items-center gap-0.5 font-semibold"
                  >
                    <MessageCircle class="w-3 h-3 text-emerald-600" />
                    {{ formatPhoneDisplay(app.whatsapp) }}
                  </a>
                  <span v-else>-</span>
                </div>
              </td>

              <!-- Gender -->
              <td class="py-3 px-3 text-slate-600">
                {{ app.gender === 'MALE' ? 'L' : app.gender === 'FEMALE' ? 'P' : '-' }}
              </td>

              <!-- Asal Sekolah -->
              <td class="py-3 px-3 text-slate-700 max-w-[150px] truncate" :title="app.previousSchool">
                {{ app.previousSchool || '-' }}
              </td>

              <!-- Lembaga Tujuan -->
              <td class="py-3 px-3">
                <span class="font-semibold text-slate-800">{{ app.institutionName }}</span>
              </td>

              <!-- Periode & Gelombang -->
              <td class="py-3 px-3 text-slate-600">
                <div>{{ app.academicYear || '-' }}</div>
                <div class="text-[10px] text-slate-400">{{ app.waveName || '-' }}</div>
              </td>

              <!-- Status Penerimaan -->
              <td class="py-3 px-3 text-center">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                    :class="app.isAccepted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                  >
                    <CheckCircle2 v-if="app.isAccepted" class="w-3 h-3 text-emerald-600" />
                    <Clock v-else class="w-3 h-3 text-slate-400" />
                    {{ app.isAccepted ? 'DITERIMA' : 'BELUM DITERIMA' }}
                  </span>

                  <!-- Quick Action Button -->
                  <button
                    v-if="!app.isAccepted"
                    @click="openAcceptanceModal(app, true)"
                    class="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    + Tetapkan Diterima
                  </button>
                  <button
                    v-else
                    @click="openAcceptanceModal(app, false)"
                    class="text-[10px] text-rose-600 hover:text-rose-700 font-medium hover:underline"
                  >
                    Batalkan Terima
                  </button>
                </div>
              </td>

              <!-- Progres Kelengkapan -->
              <td class="py-3 px-3 min-w-[160px]">
                <div class="flex items-center justify-between text-[11px] mb-1">
                  <span
                    class="font-bold text-[10px] px-1.5 py-0.2 rounded-sm"
                    :class="app.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                  >
                    {{ app.isComplete ? 'LENGKAP' : 'BELUM LENGKAP' }}
                  </span>
                  <span class="text-slate-500 font-mono font-semibold">
                    {{ app.completedRequired }}/{{ app.totalRequired }} Wajib
                  </span>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="app.isComplete ? 'bg-emerald-500' : 'bg-amber-500'"
                    :style="{ width: `${app.progressPercentage}%` }"
                  ></div>
                </div>
              </td>

              <!-- Aksi -->
              <td class="py-3 px-4 text-center">
                <BaseButton
                  @click="goToDetail(app.id)"
                  variant="outline"
                  size="sm"
                  class="text-xs px-2.5 py-1 text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
                >
                  <span>Kelengkapan</span>
                  <ChevronRight class="w-3.5 h-3.5 ml-1" />
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="applications.length > 0"
        class="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50"
      >
        <div class="text-xs text-slate-500">
          Menampilkan {{ (pagination.page - 1) * pagination.limit + 1 }} -
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }}
          dari {{ pagination.total }} pendaftar
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page === 1"
            class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <div class="px-3 text-xs font-bold text-slate-700">
            {{ pagination.page }} / {{ pagination.totalPages || 1 }}
          </div>
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL PENETAPAN PENERIMAAN (SPRINT 1)      -->
    <!-- ========================================== -->
    <BaseModal
      :open="isAcceptanceModalOpen"
      :title="acceptanceForm.is_accepted ? 'Konfirmasi Penetapan Diterima' : 'Batalkan Penerimaan Siswa'"
      size="md"
      @close="isAcceptanceModalOpen = false"
    >
      <div v-if="selectedApp" class="space-y-4">
        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div class="text-slate-500">Nama Calon Siswa:</div>
          <div class="font-bold text-slate-800 text-sm">{{ selectedApp.fullName }}</div>
          <div class="text-slate-500 mt-1">Nomor Pendaftaran:</div>
          <div class="font-mono font-bold text-slate-700">{{ selectedApp.registrationNumber }}</div>
          <div class="text-slate-500 mt-1">Lembaga Tujuan:</div>
          <div class="font-semibold text-slate-800">{{ selectedApp.institutionName }}</div>
        </div>

        <div
          class="p-3 rounded-xl border text-xs leading-relaxed"
          :class="acceptanceForm.is_accepted ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'"
        >
          <p v-if="acceptanceForm.is_accepted">
            Status penerimaan pendaftar ini akan diubah menjadi <strong>DITERIMA</strong>. Data tetap berada pada tabel pendaftaran tanpa membuat duplikasi data baru.
          </p>
          <p v-else>
            Status penerimaan pendaftar ini akan dikembalikan menjadi <strong>BELUM DITERIMA</strong>.
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

