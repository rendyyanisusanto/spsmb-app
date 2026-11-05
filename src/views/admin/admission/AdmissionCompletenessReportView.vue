<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  getAdmissionFilters,
  getAdmissionReport
} from '@/services/admissionService'
import { exportAdmissionCompletenessPdf } from '@/utils/admissionReportPdf'
import { formatDate } from '@/utils/date'

import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

import {
  FileText,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RotateCcw,
  Search,
  Printer,
  Download,
  ArrowLeft,
  RefreshCw,
  Building2,
  GraduationCap,
  Calendar,
  AlertTriangle,
  UserCheck,
  Check
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
const exporting = ref(false)
const error = ref('')
const reportData = ref({
  applications: [],
  requirementsList: [],
  stats: {
    totalApplicants: 0,
    totalAccepted: 0,
    totalPending: 0,
    totalCompleted: 0,
    totalIncomplete: 0,
    acceptedIncomplete: 0,
    acceptedCompleted: 0,
    acceptanceRate: 0,
    completionRate: 0
  },
  generatedAt: ''
})

// Filter Options
const filterOptions = ref({
  institutions: [],
  academicYears: [],
  waves: []
})

// Filters
const filters = ref({
  search: '',
  institutionId: 'ALL',
  academicYear: 'ALL',
  admissionWaveId: 'ALL',
  isAccepted: 'ALL',
  completenessStatus: 'ALL'
})

const selectedInstitutionName = computed(() => {
  if (filters.value.institutionId === 'ALL') return 'Semua Lembaga'
  const match = filterOptions.value.institutions.find(i => String(i.id) === String(filters.value.institutionId))
  return match ? `${match.name} (${match.code})` : 'Semua Lembaga'
})

const selectedWaveName = computed(() => {
  if (filters.value.admissionWaveId === 'ALL') return 'Semua Gelombang'
  const match = filterOptions.value.waves.find(w => String(w.id) === String(filters.value.admissionWaveId))
  return match ? match.name : 'Semua Gelombang'
})

const acceptanceFilterLabel = computed(() => {
  if (filters.value.isAccepted === '1') return 'Diterima'
  if (filters.value.isAccepted === '0') return 'Belum Diterima'
  return 'Semua Status'
})

const completenessFilterLabel = computed(() => {
  if (filters.value.completenessStatus === 'COMPLETE') return 'Berkas Lengkap'
  if (filters.value.completenessStatus === 'INCOMPLETE') return 'Belum Lengkap'
  if (filters.value.completenessStatus === 'ACCEPTED_INCOMPLETE') return 'Diterima Tapi Belum Lengkap'
  return 'Semua Status'
})

const filteredWaves = computed(() => {
  if (filters.value.academicYear === 'ALL') return filterOptions.value.waves
  return filterOptions.value.waves.filter(w => w.academic_year === filters.value.academicYear)
})

// Load Filter Lookups
const loadFilters = async () => {
  try {
    const res = await getAdmissionFilters()
    const filterData = res?.data || res
    if (filterData) {
      filterOptions.value = {
        institutions: filterData.institutions || [],
        academicYears: filterData.academicYears || [],
        waves: filterData.waves || []
      }

      if (!canChooseInstitution.value && filterOptions.value.institutions.length > 0) {
        filters.value.institutionId = String(filterOptions.value.institutions[0].id)
      }
    }
  } catch (err) {
    console.error('Failed to load filter options:', err)
  }
}

// Load Report Data
const fetchReport = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      search: filters.value.search || undefined,
      institutionId: filters.value.institutionId,
      academicYear: filters.value.academicYear,
      admissionWaveId: filters.value.admissionWaveId,
      isAccepted: filters.value.isAccepted,
      completenessStatus: filters.value.completenessStatus
    }

    const res = await getAdmissionReport(params)
    const payload = res?.data || res
    if (payload && (payload.applications || Array.isArray(payload))) {
      reportData.value = {
        applications: payload.applications || [],
        requirementsList: payload.requirementsList || [],
        stats: payload.stats || {
          totalApplicants: 0,
          totalAccepted: 0,
          totalPending: 0,
          totalCompleted: 0,
          totalIncomplete: 0,
          acceptedIncomplete: 0,
          acceptedCompleted: 0,
          acceptanceRate: 0,
          completionRate: 0
        },
        generatedAt: payload.generatedAt || ''
      }
    } else if (res?.success === false) {
      error.value = res?.message || 'Gagal memuat laporan kelengkapan dokumen.'
    }
  } catch (err) {
    console.error('Error fetching report:', err)
    error.value = err.response?.data?.message || err.message || 'Terjadi kesalahan sistem saat memuat laporan.'
  } finally {
    loading.value = false
  }
}

const handleFilterChange = () => {
  fetchReport()
}

const resetFilters = () => {
  filters.value = {
    search: '',
    institutionId: canChooseInstitution.value ? 'ALL' : (filterOptions.value.institutions[0]?.id ? String(filterOptions.value.institutions[0].id) : 'ALL'),
    academicYear: 'ALL',
    admissionWaveId: 'ALL',
    isAccepted: 'ALL',
    completenessStatus: 'ALL'
  }
  fetchReport()
}

// PDF Export
const handleExportPdf = () => {
  try {
    exporting.value = true
    exportAdmissionCompletenessPdf({
      applications: reportData.value.applications,
      institutionName: selectedInstitutionName.value,
      academicYear: filters.value.academicYear === 'ALL' ? 'Semua Tahun Ajaran' : filters.value.academicYear,
      waveName: selectedWaveName.value,
      acceptanceFilter: acceptanceFilterLabel.value,
      completenessFilter: completenessFilterLabel.value,
      stats: reportData.value.stats
    })
  } catch (err) {
    console.error('Failed to export PDF:', err)
    alert('Gagal membuat dokumen PDF: ' + (err.message || 'Error tidak diketahui'))
  } finally {
    exporting.value = false
  }
}

const handleBrowserPrint = () => {
  window.print()
}

const goBack = () => {
  router.push('/admin/kelengkapan-pendaftar')
}

onMounted(async () => {
  await loadFilters()
  await fetchReport()
})
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Header Section (Screen Only) -->
    <div class="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <button
            @click="goBack"
            class="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            title="Kembali ke Kelengkapan Pendaftar"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText class="w-6 h-6 text-emerald-600" />
            Laporan Kelengkapan Dokumen & Penerimaan
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 ml-7">
          Rekapitulasi lengkap status penerimaan dan rincian verifikasi checklist dokumen calon siswa.
        </p>
      </div>

      <div class="flex items-center flex-wrap gap-2">
        <!-- Cetak PDF -->
        <BaseButton
          @click="handleExportPdf"
          :disabled="loading || exporting || reportData.applications.length === 0"
          variant="primary"
          size="sm"
          class="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Download class="w-4 h-4 mr-1.5" :class="{ 'animate-bounce': exporting }" />
          {{ exporting ? 'Menyiapkan PDF...' : 'Cetak PDF' }}
        </BaseButton>

        <!-- Cetak Langsung (Print) -->
        <BaseButton
          @click="handleBrowserPrint"
          variant="outline"
          size="sm"
          class="border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <Printer class="w-4 h-4 mr-1.5 text-slate-500" />
          Cetak Dokumen
        </BaseButton>

        <!-- Segarkan -->
        <BaseButton
          @click="fetchReport"
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

    <!-- Printable Header (Visible Only When Printing) -->
    <div class="hidden print:block border-b-2 border-emerald-600 pb-3 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-900 uppercase tracking-wide">
            LAPORAN KELENGKAPAN DOKUMEN & PENERIMAAN SISWA
          </h1>
          <p class="text-xs text-slate-600 mt-1">
            Lembaga: <span class="font-bold text-slate-800">{{ selectedInstitutionName }}</span> &bull; 
            Tahun Ajaran: <span class="font-bold text-slate-800">{{ filters.academicYear === 'ALL' ? 'Semua' : filters.academicYear }}</span> &bull; 
            Gelombang: <span class="font-bold text-slate-800">{{ selectedWaveName }}</span>
          </p>
        </div>
        <div class="text-right text-[11px] text-slate-500">
          <div>Dicetak: {{ new Date().toLocaleString('id-ID') }} WIB</div>
          <div class="font-semibold text-emerald-700">SPSMB Terpadu</div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <BaseErrorState
      v-if="error"
      :message="error"
      @retry="fetchReport"
      class="mb-4 print:hidden"
    />

    <!-- ========================================== -->
    <!-- KPI SUMMARY STATS CARDS                    -->
    <!-- ========================================== -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- 1. Total Pendaftar -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div class="text-[11px] font-semibold text-slate-500 mb-1">Total Pendaftar</div>
        <div class="text-2xl font-extrabold text-slate-800">
          {{ (reportData.stats?.totalApplicants || reportData.applications.length).toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5">Sesuai filter aktif</div>
      </div>

      <!-- 2. Diterima -->
      <div class="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs bg-emerald-50/20">
        <div class="text-[11px] font-bold text-emerald-700 mb-1">Diterima</div>
        <div class="text-2xl font-extrabold text-emerald-600">
          {{ (reportData.stats?.totalAccepted || 0).toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-emerald-600 font-semibold mt-0.5">
          {{ reportData.stats?.acceptanceRate || 0 }}% diterima
        </div>
      </div>

      <!-- 3. Belum Diterima -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div class="text-[11px] font-semibold text-slate-600 mb-1">Belum Diterima</div>
        <div class="text-2xl font-extrabold text-slate-700">
          {{ (reportData.stats?.totalPending || 0).toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5">Dalam seleksi</div>
      </div>

      <!-- 4. Berkas Lengkap -->
      <div class="bg-white rounded-2xl border border-teal-100 p-4 shadow-xs bg-teal-50/20">
        <div class="text-[11px] font-bold text-teal-700 mb-1">Berkas Lengkap</div>
        <div class="text-2xl font-extrabold text-teal-700">
          {{ (reportData.stats?.totalCompleted || 0).toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-teal-600 font-semibold mt-0.5">
          {{ reportData.stats?.completionRate || 0 }}% memenuhi syarat
        </div>
      </div>

      <!-- 5. Berkas Belum Lengkap -->
      <div class="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs bg-amber-50/20">
        <div class="text-[11px] font-bold text-amber-700 mb-1">Belum Lengkap</div>
        <div class="text-2xl font-extrabold text-amber-600">
          {{ (reportData.stats?.totalIncomplete || 0).toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-amber-600 font-medium mt-0.5">Perlu dilengkapi</div>
      </div>

      <!-- 6. Diterima & Belum Lengkap -->
      <div class="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs bg-rose-50/20">
        <div class="text-[11px] font-bold text-rose-700 mb-1">Diterima - Pending</div>
        <div class="text-2xl font-extrabold text-rose-600">
          {{ (reportData.stats?.acceptedIncomplete || 0).toLocaleString('id-ID') }}
        </div>
        <div class="text-[10px] text-rose-600 font-medium mt-0.5">Diterima belum lengkap</div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- FILTER BAR (Screen Only)                   -->
    <!-- ========================================== -->
    <div class="print:hidden bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter class="w-4 h-4 text-emerald-600" />
          Filter Data Laporan
        </div>
        <button
          @click="resetFilters"
          class="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Reset Filter
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <!-- 1. Pencarian -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Pencarian</label>
          <div class="relative">
            <input
              v-model="filters.search"
              @keyup.enter="handleFilterChange"
              type="text"
              placeholder="Nama / No. Reg / Asal..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <!-- 2. Lembaga -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Lembaga</label>
          <select
            v-model="filters.institutionId"
            @change="handleFilterChange"
            :disabled="!canChooseInstitution"
            class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition disabled:opacity-60"
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

        <!-- 3. Tahun Ajaran -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Tahun Ajaran</label>
          <select
            v-model="filters.academicYear"
            @change="handleFilterChange"
            class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          >
            <option value="ALL">Semua Tahun</option>
            <option
              v-for="year in filterOptions.academicYears"
              :key="year"
              :value="year"
            >
              {{ year }}
            </option>
          </select>
        </div>

        <!-- 4. Gelombang -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Gelombang</label>
          <select
            v-model="filters.admissionWaveId"
            @change="handleFilterChange"
            class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          >
            <option value="ALL">Semua Gelombang</option>
            <option
              v-for="w in filteredWaves"
              :key="w.id"
              :value="String(w.id)"
            >
              {{ w.name }} ({{ w.academic_year }})
            </option>
          </select>
        </div>

        <!-- 5. Status Diterima -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Status Penerimaan</label>
          <select
            v-model="filters.isAccepted"
            @change="handleFilterChange"
            class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          >
            <option value="ALL">Semua Status</option>
            <option value="1">Diterima</option>
            <option value="0">Belum Diterima</option>
          </select>
        </div>

        <!-- 6. Status Kelengkapan -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Status Kelengkapan</label>
          <select
            v-model="filters.completenessStatus"
            @change="handleFilterChange"
            class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          >
            <option value="ALL">Semua Status</option>
            <option value="COMPLETE">Berkas Lengkap</option>
            <option value="INCOMPLETE">Belum Lengkap</option>
            <option value="ACCEPTED_INCOMPLETE">Diterima Tapi Belum Lengkap</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <BaseLoading
      v-if="loading"
      message="Menyiapkan data laporan kelengkapan dokumen..."
      class="py-16"
    />

    <!-- Empty State -->
    <BaseEmptyState
      v-else-if="reportData.applications.length === 0"
      title="Tidak Ada Data Pendaftar"
      description="Tidak ditemukan data pendaftar yang cocok dengan filter yang dipilih saat ini."
    >
      <BaseButton
        @click="resetFilters"
        variant="outline"
        size="sm"
        class="mt-4"
      >
        <RotateCcw class="w-4 h-4 mr-1.5" />
        Reset Filter
      </BaseButton>
    </BaseEmptyState>

    <!-- ========================================== -->
    <!-- REPORT TABLE                               -->
    <!-- Requested format:                          -->
    <!-- 1. Nama                                    -->
    <!-- 2. Sekolah Asal                            -->
    <!-- 3. L/P                                     -->
    <!-- 4. Status diterima                         -->
    <!-- 5. Kelengkapan (jabarkan & berikan centang)-->
    <!-- ========================================== -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <!-- Table Header Summary Banner -->
      <div class="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div class="font-bold text-slate-800 flex items-center gap-2">
          <span>Menampilkan {{ reportData.applications.length }} Calon Peserta Didik</span>
          <span class="text-slate-400">&bull;</span>
          <span class="text-slate-500 font-normal">{{ selectedInstitutionName }}</span>
        </div>
        <div class="text-[11px] text-slate-500 font-medium">
          Tahun Ajaran: <span class="font-semibold text-slate-700">{{ filters.academicYear === 'ALL' ? 'Semua' : filters.academicYear }}</span>
          &bull; Gelombang: <span class="font-semibold text-slate-700">{{ selectedWaveName }}</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th class="py-3 px-3.5 w-12 text-center">No</th>
              <th class="py-3 px-4 min-w-[200px]">Nama</th>
              <th class="py-3 px-4 min-w-[150px]">Sekolah Asal</th>
              <th class="py-3 px-3.5 w-14 text-center">L/P</th>
              <th class="py-3 px-4 min-w-[140px] text-center">Status Diterima</th>
              <th class="py-3 px-5 min-w-[340px]">Kelengkapan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            <tr
              v-for="(app, index) in reportData.applications"
              :key="app.id"
              class="hover:bg-slate-50/60 transition-colors"
            >
              <!-- 1. No -->
              <td class="py-3.5 px-3.5 text-center font-medium text-slate-400 text-xs">
                {{ index + 1 }}
              </td>

              <!-- 2. Nama & No Registrasi -->
              <td class="py-3.5 px-4">
                <div class="font-bold text-slate-900 leading-snug">
                  {{ app.fullName }}
                </div>
                <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                  <span class="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                    {{ app.registrationNumber }}
                  </span>
                  <span>&bull;</span>
                  <span class="text-slate-600 truncate max-w-[150px]" :title="app.institutionName">
                    {{ app.institutionName }}
                  </span>
                </div>
              </td>

              <!-- 3. Sekolah Asal -->
              <td class="py-3.5 px-4 text-slate-700 font-medium">
                {{ app.previousSchool || '-' }}
              </td>

              <!-- 4. L/P -->
              <td class="py-3.5 px-3.5 text-center">
                <span
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                  :class="app.gender === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'"
                >
                  {{ app.gender || '-' }}
                </span>
              </td>

              <!-- 5. Status Diterima -->
              <td class="py-3.5 px-4 text-center">
                <div v-if="app.isAccepted" class="inline-flex flex-col items-center">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                    DITERIMA
                  </span>
                  <span v-if="app.acceptedAt" class="text-[9.5px] text-slate-400 mt-0.5">
                    {{ formatDate(app.acceptedAt) }}
                  </span>
                </div>
                <div v-else class="inline-flex flex-col items-center">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <Clock class="w-3.5 h-3.5 text-slate-400" />
                    BELUM DITERIMA
                  </span>
                </div>
              </td>

              <!-- 6. Kelengkapan (Dijabarkan dengan centang kalau sudah selesai) -->
              <td class="py-3.5 px-5">
                <div v-if="app.requirements && app.requirements.length > 0" class="space-y-1.5">
                  <!-- Header Summary of Requirements -->
                  <div class="flex items-center justify-between text-[11px] mb-1">
                    <span
                      class="font-bold"
                      :class="app.isComplete ? 'text-teal-700' : 'text-amber-700'"
                    >
                      {{ app.completedRequired }}/{{ app.totalRequired }} Komponen Wajib
                    </span>
                    <span
                      class="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      :class="app.isComplete ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
                    >
                      {{ app.isComplete ? 'Lengkap' : 'Belum Lengkap' }}
                    </span>
                  </div>

                  <!-- Checklist Grid / Breakdown -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                    <div
                      v-for="req in app.requirements"
                      :key="req.id"
                      class="flex items-start gap-1.5 text-[11px]"
                    >
                      <!-- Centang [✓] Icon -->
                      <span
                        v-if="req.isCompleted"
                        class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5"
                        title="Selesai / Terverifikasi"
                      >
                        <Check class="w-3 h-3 stroke-[3]" />
                      </span>
                      <!-- Belum Icon -->
                      <span
                        v-else
                        class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-400 shrink-0 mt-0.5"
                        title="Belum Selesai"
                      >
                        <span class="text-[9px] font-bold">&minus;</span>
                      </span>

                      <!-- Name & Status -->
                      <div class="leading-tight">
                        <span
                          :class="req.isCompleted ? 'text-slate-800 font-medium' : 'text-slate-500'"
                        >
                          {{ req.name }}
                        </span>
                        <span
                          v-if="req.isRequired"
                          class="ml-1 text-[9px] font-semibold"
                          :class="req.isCompleted ? 'text-emerald-700' : 'text-amber-600'"
                        >
                          *
                        </span>
                        <span
                          v-if="!req.isCompleted"
                          class="ml-1 text-[9px] text-slate-400"
                        >
                          (Belum)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty Components State for this Applicant -->
                <div v-else class="text-[11px] text-slate-400 italic">
                  Belum ada master komponen untuk lembaga ini
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Info -->
      <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-1">
        <div>
          Total data: <span class="font-bold text-slate-700">{{ reportData.applications.length }}</span> pendaftar
        </div>
        <div class="text-[11px] text-slate-400">
          Tanda (*) menandakan komponen administrasi yang wajib dipenuhi.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm;
  }

  body {
    background: #ffffff !important;
    color: #000000 !important;
    font-size: 10pt;
  }
}
</style>

