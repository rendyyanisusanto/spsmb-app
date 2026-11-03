<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { getCrmReportFilters, getCrmDashboardReport } from '@/services/crmReportService'
import { exportCrmReportExcel } from '@/utils/crmReportExcel'
import { exportCrmReportPdf } from '@/utils/crmReportPdf'
import { formatDate } from '@/utils/date'
import { formatPhoneDisplay } from '@/utils/phone'
import { CRM_LEAD_STATUS_BADGES } from '@/constants/crmLeadStatus'

import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

import {
  Users,
  Sparkles,
  PhoneCall,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Percent,
  Calendar,
  Filter,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Award,
  School,
  MapPin,
  ExternalLink,
  Search,
  MessageCircle,
  HelpCircle,
  ArrowDownRight,
  Activity,
  Layers,
  CalendarClock
} from 'lucide-vue-next'

const router = useRouter()
const { user, hasRole } = useAuth()

// Role & Permission Scoping
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
const exporting = ref(false)

// Filter Options from API
const filterOptions = ref({
  institutions: [],
  officers: [],
  schools: [],
  statuses: []
})

// Active Filters
const filters = ref({
  institutionId: 'ALL',
  period: 'all',
  startDate: '',
  endDate: '',
  leadByUserId: 'ALL',
  schoolOrigin: 'ALL',
  status: 'ALL'
})

// Quick Period Options
const periodOptions = [
  { value: 'all', label: 'Semua Periode' },
  { value: 'today', label: 'Hari Ini' },
  { value: 'this_week', label: 'Minggu Ini' },
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'this_year', label: 'Tahun Ini' },
  { value: 'custom', label: 'Custom Range' }
]

// Report Data State
const reportData = ref({
  kpis: {
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    uncontactedLeads: 0,
    inFollowUp: 0,
    convertedLeads: 0,
    notInterestedLeads: 0,
    rates: {
      followUpRate: 0,
      conversionRate: 0,
      nonResponseRate: 0,
      uncontactedRate: 0
    }
  },
  funnel: [],
  activityTimeline: [],
  scheduleSummary: {
    overdueCount: 0,
    todayScheduledCount: 0,
    upcomingScheduledCount: 0
  },
  officerPerformance: [],
  sourceAnalysis: [],
  schoolAnalysis: [],
  districtAnalysis: [],
  obstacleAnalysis: [],
  actionableLeads: []
})

// Sorting & Sub-Filters for Tables
const officerSortBy = ref('convertedLeads') // convertedLeads, totalActivities, conversionRate, totalLeads
const officerSearch = ref('')
const actionableTab = ref('ALL') // ALL, UNCONTACTED, OVERDUE, INTERESTED, READY_TO_REGISTER
const actionableSearch = ref('')
const actionablePage = ref(1)
const actionablePerPage = ref(10)

// Helper Computed
const currentInstitutionLabel = computed(() => {
  if (filters.value.institutionId === 'ALL') return 'Semua Lembaga'
  const found = filterOptions.value.institutions.find(i => String(i.id) === String(filters.value.institutionId))
  return found ? found.name : 'Semua Lembaga'
})

const currentPeriodLabel = computed(() => {
  if (filters.value.period === 'custom') {
    return `${filters.value.startDate || 'Awal'} s.d. ${filters.value.endDate || 'Akhir'}`
  }
  const found = periodOptions.find(p => p.value === filters.value.period)
  return found ? found.label : 'Semua Periode'
})

// Filtered and Sorted Officers
const sortedOfficers = computed(() => {
  let list = [...(reportData.value.officerPerformance || [])]
  if (officerSearch.value.trim()) {
    const q = officerSearch.value.toLowerCase().trim()
    list = list.filter(o => o.officerName.toLowerCase().includes(q))
  }

  list.sort((a, b) => {
    if (officerSortBy.value === 'convertedLeads') {
      return b.convertedLeads - a.convertedLeads || b.totalLeads - a.totalLeads
    }
    if (officerSortBy.value === 'totalActivities') {
      return b.totalActivities - a.totalActivities || b.totalLeads - a.totalLeads
    }
    if (officerSortBy.value === 'conversionRate') {
      return b.conversionRate - a.conversionRate || b.convertedLeads - a.convertedLeads
    }
    if (officerSortBy.value === 'totalLeads') {
      return b.totalLeads - a.totalLeads
    }
    return 0
  })

  return list.map((o, idx) => ({ ...o, displayRank: idx + 1 }))
})

// Filtered Actionable Leads
const filteredActionableLeads = computed(() => {
  let list = [...(reportData.value.actionableLeads || [])]

  // Tab filter
  if (actionableTab.value === 'UNCONTACTED') {
    list = list.filter(l => l.priorityCategory === 'UNCONTACTED')
  } else if (actionableTab.value === 'OVERDUE') {
    list = list.filter(l => l.isOverdue)
  } else if (actionableTab.value === 'INTERESTED') {
    list = list.filter(l => l.status === 'INTERESTED')
  } else if (actionableTab.value === 'READY_TO_REGISTER') {
    list = list.filter(l => l.status === 'READY_TO_REGISTER' || l.status === 'FOLLOW_UP')
  }

  // Search filter
  if (actionableSearch.value.trim()) {
    const q = actionableSearch.value.toLowerCase().trim()
    list = list.filter(l =>
      l.fullName.toLowerCase().includes(q) ||
      (l.schoolOrigin && l.schoolOrigin.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    )
  }

  return list
})

const paginatedActionableLeads = computed(() => {
  const start = (actionablePage.value - 1) * actionablePerPage.value
  return filteredActionableLeads.value.slice(start, start + actionablePerPage.value)
})

const totalActionablePages = computed(() => {
  return Math.ceil(filteredActionableLeads.value.length / actionablePerPage.value) || 1
})

// Counts for actionable tabs
const actionableTabCounts = computed(() => {
  const all = reportData.value.actionableLeads || []
  return {
    ALL: all.length,
    UNCONTACTED: all.filter(l => l.priorityCategory === 'UNCONTACTED').length,
    OVERDUE: all.filter(l => l.isOverdue).length,
    INTERESTED: all.filter(l => l.status === 'INTERESTED').length,
    READY_TO_REGISTER: all.filter(l => l.status === 'READY_TO_REGISTER' || l.status === 'FOLLOW_UP').length
  }
})

// Highest drop-off stage identification
const highestDropOffStage = computed(() => {
  const funnel = reportData.value.funnel || []
  if (funnel.length <= 1) return null
  let maxDrop = -1
  let stageObj = null
  funnel.forEach((f, idx) => {
    if (idx > 0 && f.dropOffRate > maxDrop) {
      maxDrop = f.dropOffRate
      stageObj = f
    }
  })
  return stageObj
})

// Max value helper for Activity Timeline Chart
const maxActivityVal = computed(() => {
  const tl = reportData.value.activityTimeline || []
  if (tl.length === 0) return 10
  const max = Math.max(...tl.map(t => Math.max(t.totalActivities, t.uniqueLeadsContacted, t.responseActivities)))
  return max > 0 ? max : 10
})

// Load Filter Options & Initial Data
const loadFilters = async () => {
  try {
    const res = await getCrmReportFilters()
    filterOptions.value = res

    // If user cannot choose institution (single school admin), preset institutionId
    if (!canChooseInstitution.value && res.institutions.length > 0) {
      filters.value.institutionId = String(res.institutions[0].id)
    }
  } catch (err) {
    console.error('Failed to load filter options:', err)
  }
}

const loadReportData = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      institutionId: filters.value.institutionId !== 'ALL' ? filters.value.institutionId : '',
      period: filters.value.period,
      startDate: filters.value.period === 'custom' ? filters.value.startDate : '',
      endDate: filters.value.period === 'custom' ? filters.value.endDate : '',
      leadByUserId: filters.value.leadByUserId !== 'ALL' ? filters.value.leadByUserId : '',
      schoolOrigin: filters.value.schoolOrigin !== 'ALL' ? filters.value.schoolOrigin : '',
      status: filters.value.status !== 'ALL' ? filters.value.status : ''
    }

    const res = await getCrmDashboardReport(params)
    reportData.value = res
    actionablePage.value = 1
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Gagal memuat data laporan CRM'
  } finally {
    loading.value = false
  }
}

// Reset Filters
const resetFilters = () => {
  filters.value = {
    institutionId: canChooseInstitution.value ? 'ALL' : (filterOptions.value.institutions[0]?.id ? String(filterOptions.value.institutions[0].id) : 'ALL'),
    period: 'all',
    startDate: '',
    endDate: '',
    leadByUserId: 'ALL',
    schoolOrigin: 'ALL',
    status: 'ALL'
  }
}

// Watch filters for auto-reload
watch(
  filters,
  () => {
    // If custom period, only reload when both dates are set or both empty
    if (filters.value.period === 'custom') {
      if (filters.value.startDate && filters.value.endDate) {
        loadReportData()
      }
    } else {
      loadReportData()
    }
  },
  { deep: true }
)

// Export Actions
const handleExportExcel = () => {
  exporting.value = true
  try {
    exportCrmReportExcel({
      report: reportData.value,
      institutionName: currentInstitutionLabel.value,
      periodLabel: currentPeriodLabel.value
    })
  } catch (err) {
    alert('Gagal mengekspor Excel: ' + err.message)
  } finally {
    exporting.value = false
  }
}

const handleExportPdf = () => {
  exporting.value = true
  try {
    exportCrmReportPdf({
      report: reportData.value,
      institutionName: currentInstitutionLabel.value,
      periodLabel: currentPeriodLabel.value
    })
  } catch (err) {
    alert('Gagal mengekspor PDF: ' + err.message)
  } finally {
    exporting.value = false
  }
}

const handlePrint = () => {
  window.print()
}

const openLeadDetail = (id) => {
  router.push(`/admin/crm/leads/${id}`)
}

onMounted(async () => {
  await loadFilters()
  await loadReportData()
})
</script>

<template>
  <div class="crm-report-container space-y-6 pb-12">
    <!-- Top Header & Action Controls -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Activity class="w-5 h-5" />
          </span>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">
              Laporan CRM & Performa SPMB
            </h1>
            <p class="text-xs sm:text-sm text-slate-500">
              Satu halaman terpadu untuk memantau performa perolehan lead, follow-up, konversi pendaftaran, dan efektivitas tim.
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <BaseButton
          @click="loadReportData"
          variant="outline"
          size="sm"
          :disabled="loading"
          class="border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
          Muat Ulang
        </BaseButton>

        <BaseButton
          @click="handleExportExcel"
          variant="outline"
          size="sm"
          :disabled="loading || exporting"
          class="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <FileSpreadsheet class="w-4 h-4 mr-1.5 text-emerald-600" />
          Ekspor Excel
        </BaseButton>

        <BaseButton
          @click="handleExportPdf"
          variant="outline"
          size="sm"
          :disabled="loading || exporting"
          class="border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          <FileText class="w-4 h-4 mr-1.5 text-rose-600" />
          Ekspor PDF
        </BaseButton>

        <BaseButton
          @click="handlePrint"
          variant="primary"
          size="sm"
          :disabled="loading"
          class="bg-slate-800 hover:bg-slate-900 text-white"
        >
          <Printer class="w-4 h-4 mr-1.5" />
          Cetak Laporan
        </BaseButton>
      </div>
    </div>

    <!-- Print Header Only (Visible on Print) -->
    <div class="hidden print:block mb-6 border-b border-slate-300 pb-4">
      <h1 class="text-2xl font-bold text-slate-900">LAPORAN CRM & PERFORMA SPMB</h1>
      <p class="text-sm text-slate-600 font-medium mt-1">
        Lembaga: <span class="font-bold">{{ currentInstitutionLabel }}</span> | 
        Periode: <span class="font-bold">{{ currentPeriodLabel }}</span> | 
        Dicetak pada: {{ new Date().toLocaleString('id-ID') }}
      </p>
    </div>

    <!-- Error Alert -->
    <BaseErrorState
      v-if="error"
      :message="error"
      @retry="loadReportData"
      class="mb-4 print:hidden"
    />

    <!-- ========================================== -->
    <!-- 1. FILTER UTAMA                            -->
    <!-- ========================================== -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 print:hidden">
      <div class="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
        <div class="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Filter class="w-4 h-4 text-emerald-600" />
          <span>Filter Laporan Terpadu</span>
          <span class="text-xs font-normal text-slate-400">
            (Semua data dan grafik akan otomatis sinkron)
          </span>
        </div>
        <button
          @click="resetFilters"
          class="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Reset Filter
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <!-- Filter Lembaga -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">
            Pilihan Lembaga
          </label>
          <select
            v-model="filters.institutionId"
            :disabled="!canChooseInstitution"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
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

        <!-- Filter Periode -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">
            Rentang Waktu
          </label>
          <select
            v-model="filters.period"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option v-for="p in periodOptions" :key="p.value" :value="p.value">
              {{ p.label }}
            </option>
          </select>
        </div>

        <!-- Filter Petugas -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">
            Petugas Penangan
          </label>
          <select
            v-model="filters.leadByUserId"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="ALL">Semua Petugas</option>
            <option value="UNASSIGNED">Belum Ditugaskan</option>
            <option
              v-for="officer in filterOptions.officers"
              :key="officer.id"
              :value="String(officer.id)"
            >
              {{ officer.name }}
            </option>
          </select>
        </div>

        <!-- Filter Asal Sekolah -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">
            Asal SMP/MTs
          </label>
          <select
            v-model="filters.schoolOrigin"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="ALL">Semua Asal Sekolah</option>
            <option
              v-for="school in filterOptions.schools"
              :key="school"
              :value="school"
            >
              {{ school }}
            </option>
          </select>
        </div>

        <!-- Filter Status Lead -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">
            Status Lead
          </label>
          <select
            v-model="filters.status"
            class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="ALL">Semua Status</option>
            <option
              v-for="s in filterOptions.statuses"
              :key="s.value"
              :value="s.value"
            >
              {{ s.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Custom Date Inputs (Conditional) -->
      <div
        v-if="filters.period === 'custom'"
        class="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center"
      >
        <div>
          <label class="block text-xs text-slate-500 mb-1">Tanggal Mulai:</label>
          <input
            type="date"
            v-model="filters.startDate"
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1">Tanggal Selesai:</label>
          <input
            type="date"
            v-model="filters.endDate"
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div class="sm:pt-4 text-xs text-slate-400">
          *Pilih tanggal awal dan akhir untuk menampilkan data rentang kustom.
        </div>
      </div>
    </div>

    <!-- Loading Skeleton Overlay for Report Components -->
    <div v-if="loading" class="py-16 text-center">
      <BaseLoading message="Menghitung statistik dan menganalisis performa CRM SPMB..." />
    </div>

    <div v-else class="space-y-6">
      <!-- ========================================== -->
      <!-- 2. RINGKASAN STATISTIK (KPI CARDS)         -->
      <!-- ========================================== -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Ringkasan Statistik Utama (KPI CRM)
          </h2>
          <span class="text-xs text-slate-500">
            Lembaga: <strong class="text-slate-700">{{ currentInstitutionLabel }}</strong>
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <!-- 1. Total Prospek Lead -->
          <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-slate-500 leading-tight">Total Prospek</span>
              <span class="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                <Users class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="text-2xl font-extrabold text-slate-800">
              {{ reportData.kpis.totalLeads.toLocaleString('id-ID') }}
            </div>
            <p class="text-[10px] text-slate-400 mt-1">Seluruh lead tercatat</p>
          </div>

          <!-- 2. Lead Baru -->
          <div class="bg-white rounded-2xl border border-blue-100 p-4 shadow-xs hover:border-blue-200 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-blue-700 leading-tight">Lead Baru</span>
              <span class="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Sparkles class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="text-2xl font-extrabold text-blue-600">
              {{ reportData.kpis.newLeads.toLocaleString('id-ID') }}
            </div>
            <p class="text-[10px] text-blue-500/80 mt-1">
              {{ reportData.kpis.totalLeads > 0 ? Math.round((reportData.kpis.newLeads / reportData.kpis.totalLeads) * 100) : 0 }}% dari total
            </p>
          </div>

          <!-- 3. Sudah Difollow-up -->
          <div class="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs hover:border-emerald-200 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-emerald-700 leading-tight">Sudah Dihubungi</span>
              <span class="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <PhoneCall class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="text-2xl font-extrabold text-emerald-600">
              {{ reportData.kpis.contactedLeads.toLocaleString('id-ID') }}
            </div>
            <p class="text-[10px] text-emerald-600 font-medium mt-1">
              {{ reportData.kpis.rates.followUpRate }}% terjangkau
            </p>
          </div>

          <!-- 4. Belum Difollow-up -->
          <div class="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs hover:border-amber-200 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-amber-700 leading-tight">Belum Dihubungi</span>
              <span class="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="text-2xl font-extrabold text-amber-600">
              {{ reportData.kpis.uncontactedLeads.toLocaleString('id-ID') }}
            </div>
            <p class="text-[10px] text-amber-600 font-medium mt-1">
              {{ reportData.kpis.rates.uncontactedRate }}% dalam antrean
            </p>
          </div>

          <!-- 5. Dalam Follow-up -->
          <div class="bg-white rounded-2xl border border-indigo-100 p-4 shadow-xs hover:border-indigo-200 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-indigo-700 leading-tight">Dalam Komunikasi</span>
              <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <RefreshCw class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="text-2xl font-extrabold text-indigo-600">
              {{ reportData.kpis.inFollowUp.toLocaleString('id-ID') }}
            </div>
            <p class="text-[10px] text-indigo-500 mt-1">Proses komunikasi aktif</p>
          </div>

          <!-- 6. Berhasil Konversi -->
          <div class="bg-white rounded-2xl border border-teal-200 p-4 shadow-xs bg-linear-to-br from-white to-teal-50/30 hover:border-teal-300 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-bold text-teal-800 leading-tight">Resmi Mendaftar</span>
              <span class="p-1.5 bg-teal-100 text-teal-700 rounded-lg">
                <CheckCircle2 class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="text-2xl font-extrabold text-teal-700">
              {{ reportData.kpis.convertedLeads.toLocaleString('id-ID') }}
            </div>
            <p class="text-[10px] text-teal-700 font-bold mt-1">
              Conv. Rate: {{ reportData.kpis.rates.conversionRate }}%
            </p>
          </div>

          <!-- 7. Tidak Berlanjut -->
          <div class="bg-white rounded-2xl border border-rose-100 p-4 shadow-xs hover:border-rose-200 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-rose-700 leading-tight">Tidak Berlanjut</span>
              <span class="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <XCircle class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="text-2xl font-extrabold text-rose-600">
              {{ reportData.kpis.notInterestedLeads.toLocaleString('id-ID') }}
            </div>
            <p class="text-[10px] text-rose-500 mt-1">Calon batal/menolak</p>
          </div>
        </div>
      </div>

      <!-- =================================================== -->
      <!-- 3. CONVERSION & FOLLOW-UP PERFORMANCE GAUGES       -->
      <!-- =================================================== -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-emerald-600" />
              Indikator Performa & Rasio Efektivitas SPMB
            </h3>
            <p class="text-xs text-slate-500">
              Metrik acuan evaluasi kecepatan penanganan prospek dan daya konversi tim
            </p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg self-start sm:self-auto">
            Periode: {{ currentPeriodLabel }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Follow-up Rate -->
          <div class="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-slate-700">Follow-up Rate</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {{ reportData.kpis.rates.followUpRate }}%
              </span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
              <div
                class="bg-emerald-500 h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, reportData.kpis.rates.followUpRate)}%` }"
              ></div>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              <strong>{{ reportData.kpis.contactedLeads }}</strong> sudah dihubungi dari <strong>{{ reportData.kpis.totalLeads }}</strong> total prospek.
            </p>
            <div class="mt-2 text-[10px] text-slate-400 border-t border-emerald-100 pt-1.5">
              Rumus: <em>Dihubungi ÷ Total Prospek × 100%</em>
            </div>
          </div>

          <!-- Conversion Rate -->
          <div class="p-4 rounded-xl border border-blue-100 bg-blue-50/20">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-slate-700">Conversion Rate</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {{ reportData.kpis.rates.conversionRate }}%
              </span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
              <div
                class="bg-blue-600 h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, reportData.kpis.rates.conversionRate)}%` }"
              ></div>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              <strong>{{ reportData.kpis.convertedLeads }}</strong> resmi mendaftar dari <strong>{{ reportData.kpis.totalLeads }}</strong> total prospek.
            </p>
            <div class="mt-2 text-[10px] text-slate-400 border-t border-blue-100 pt-1.5">
              Rumus: <em>Berhasil Mendaftar ÷ Total Prospek × 100%</em>
            </div>
          </div>

          <!-- Non-Response Rate -->
          <div class="p-4 rounded-xl border border-amber-100 bg-amber-50/20">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-slate-700">Non-Response Rate</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {{ reportData.kpis.rates.nonResponseRate }}%
              </span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
              <div
                class="bg-amber-500 h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, reportData.kpis.rates.nonResponseRate)}%` }"
              ></div>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              Tingkat prospek yang sudah dikontak namun belum memberikan respons balik.
            </p>
            <div class="mt-2 text-[10px] text-slate-400 border-t border-amber-100 pt-1.5">
              Rumus: <em>Belum Respons ÷ Prospek Dihubungi × 100%</em>
            </div>
          </div>

          <!-- Uncontacted Rate -->
          <div class="p-4 rounded-xl border border-rose-100 bg-rose-50/20">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-slate-700">Uncontacted Rate</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                {{ reportData.kpis.rates.uncontactedRate }}%
              </span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
              <div
                class="bg-rose-500 h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, reportData.kpis.rates.uncontactedRate)}%` }"
              ></div>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              <strong>{{ reportData.kpis.uncontactedLeads }}</strong> prospek belum pernah dihubungi sama sekali.
            </p>
            <div class="mt-2 text-[10px] text-slate-400 border-t border-rose-100 pt-1.5">
              Rumus: <em>Belum Dihubungi ÷ Total Prospek × 100%</em>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 4. FUNNEL PERJALANAN CALON PESERTA DIDIK   -->
      <!-- ========================================== -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers class="w-4 h-4 text-emerald-600" />
              Funnel Perjalanan Calon Peserta Didik (Lead Conversion Funnel)
            </h3>
            <p class="text-xs text-slate-500">
              Analisis konversi bertahap untuk mendeteksi di tahap mana paling banyak calon siswa berhenti.
            </p>
          </div>
          <div
            v-if="highestDropOffStage"
            class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold"
          >
            <AlertTriangle class="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Titik Kebocoran Tertinggi: <strong>{{ highestDropOffStage.name }}</strong> (-{{ highestDropOffStage.dropOffRate }}%)</span>
          </div>
        </div>

        <div class="space-y-3.5 mt-2">
          <div
            v-for="step in reportData.funnel"
            :key="step.stage"
            class="p-3.5 rounded-xl border transition-all"
            :class="[
              step.stage === 6 ? 'border-teal-300 bg-teal-50/30' :
              step.dropOffRate > 50 && step.stage > 1 ? 'border-amber-200 bg-white' : 'border-slate-200 bg-white'
            ]"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div class="flex items-center gap-2.5">
                <span
                  class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                  :class="[
                    step.stage === 6 ? 'bg-teal-600 text-white' : 'bg-slate-800 text-white'
                  ]"
                >
                  {{ step.stage }}
                </span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">{{ step.name }}</h4>
                  <p class="text-[11px] text-slate-500">{{ step.description }}</p>
                </div>
              </div>

              <div class="flex items-center gap-4 text-right self-end sm:self-auto">
                <div>
                  <span class="text-base font-extrabold text-slate-800">{{ step.count.toLocaleString('id-ID') }}</span>
                  <span class="text-xs text-slate-500 ml-1">siswa</span>
                </div>
                <div class="min-w-[60px] text-right">
                  <span class="text-xs font-bold text-emerald-600">{{ step.percentageOfTotal }}%</span>
                  <div class="text-[10px] text-slate-400">dari masuk</div>
                </div>
                <div v-if="step.stage > 1" class="min-w-[70px] text-right border-l border-slate-200 pl-3">
                  <span
                    class="text-xs font-bold"
                    :class="step.dropOffRate > 50 ? 'text-rose-600' : 'text-slate-700'"
                  >
                    -{{ step.dropOffRate }}%
                  </span>
                  <div class="text-[10px] text-slate-400">drop-off</div>
                </div>
              </div>
            </div>

            <!-- Funnel Progress Bar -->
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="[
                  step.stage === 1 ? 'bg-slate-700' :
                  step.stage === 2 ? 'bg-blue-600' :
                  step.stage === 3 ? 'bg-indigo-600' :
                  step.stage === 4 ? 'bg-amber-500' :
                  step.stage === 5 ? 'bg-emerald-500' :
                  'bg-teal-600'
                ]"
                :style="{ width: `${Math.max(1, step.percentageOfTotal)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 5. GRAFIK AKTIVITAS FOLLOW-UP              -->
      <!-- ========================================== -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity class="w-4 h-4 text-emerald-600" />
              Grafik Aktivitas Follow-up & Penjadwalan
            </h3>
            <p class="text-xs text-slate-500">
              Riwayat volume komunikasi per hari dan status penjadwalan tindak lanjut
            </p>
          </div>

          <!-- Schedule summary badges -->
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
              :class="reportData.scheduleSummary.overdueCount > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'"
            >
              <AlertTriangle class="w-3.5 h-3.5" :class="reportData.scheduleSummary.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'" />
              Jadwal Terlewat: <strong>{{ reportData.scheduleSummary.overdueCount }}</strong>
            </span>

            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold">
              <CalendarClock class="w-3.5 h-3.5 text-blue-600" />
              Jadwal Hari Ini: <strong>{{ reportData.scheduleSummary.todayScheduledCount }}</strong>
            </span>

            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
              Mendatang: <strong>{{ reportData.scheduleSummary.upcomingScheduledCount }}</strong>
            </span>
          </div>
        </div>

        <!-- Activity Timeline Bar Representation -->
        <div v-if="reportData.activityTimeline.length === 0" class="py-8 text-center text-slate-400 text-xs">
          Belum ada aktivitas follow-up yang tercatat pada rentang periode ini.
        </div>
        <div v-else class="space-y-4">
          <div class="flex items-center gap-4 text-xs font-semibold text-slate-500 mb-2">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-xs bg-emerald-500"></span>
              <span>Total Aktivitas</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-xs bg-blue-500"></span>
              <span>Prospek Unik Dihubungi</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-xs bg-teal-500"></span>
              <span>Respon / Sukses</span>
            </div>
          </div>

          <div class="overflow-x-auto pb-2">
            <div class="min-w-[600px] flex items-end gap-3 h-48 pt-6 px-2 border-b border-slate-200">
              <div
                v-for="item in reportData.activityTimeline"
                :key="item.date"
                class="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
              >
                <!-- Tooltip hover -->
                <div class="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-20 bg-slate-900 text-white text-[10px] rounded-lg p-2 whitespace-nowrap shadow-lg transition-opacity">
                  <div class="font-bold">{{ item.date }}</div>
                  <div>Aktivitas: {{ item.totalActivities }}</div>
                  <div>Prospek: {{ item.uniqueLeadsContacted }}</div>
                  <div>Respon: {{ item.responseActivities }}</div>
                </div>

                <!-- Bars cluster -->
                <div class="w-full flex items-end justify-center gap-1 h-36">
                  <!-- Total activities bar -->
                  <div
                    class="w-3 bg-emerald-500 rounded-t-sm transition-all hover:brightness-110"
                    :style="{ height: `${Math.max(4, (item.totalActivities / maxActivityVal) * 100)}%` }"
                  ></div>
                  <!-- Unique leads bar -->
                  <div
                    class="w-3 bg-blue-500 rounded-t-sm transition-all hover:brightness-110"
                    :style="{ height: `${Math.max(4, (item.uniqueLeadsContacted / maxActivityVal) * 100)}%` }"
                  ></div>
                  <!-- Responses bar -->
                  <div
                    class="w-3 bg-teal-500 rounded-t-sm transition-all hover:brightness-110"
                    :style="{ height: `${Math.max(4, (item.responseActivities / maxActivityVal) * 100)}%` }"
                  ></div>
                </div>

                <!-- Date label -->
                <span class="text-[10px] text-slate-500 font-mono mt-1 transform -rotate-45 origin-top-left">
                  {{ item.date.slice(5) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 6. PERFORMA PETUGAS SPMB                   -->
      <!-- ========================================== -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award class="w-4 h-4 text-emerald-600" />
              Ranking Performa Petugas SPMB
            </h3>
            <p class="text-xs text-slate-500">
              Evaluasi kinerja berdasarkan penugasan prospek, aktivitas penanganan, dan angka konversi nyata
            </p>
          </div>

          <!-- Table Controls: Search & Sort -->
          <div class="flex flex-wrap items-center gap-2.5 print:hidden">
            <div class="relative">
              <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                v-model="officerSearch"
                placeholder="Cari nama petugas..."
                class="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-40 sm:w-48"
              />
            </div>

            <select
              v-model="officerSortBy"
              class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="convertedLeads">Urut: Konversi Terbanyak</option>
              <option value="totalActivities">Urut: Aktivitas Terbanyak</option>
              <option value="conversionRate">Urut: Conv. Rate Tertinggi</option>
              <option value="totalLeads">Urut: Prospek Terbanyak</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-y border-slate-200 text-slate-500 font-bold">
                <th class="py-2.5 px-3 text-center w-12">Rank</th>
                <th class="py-2.5 px-3">Nama Petugas</th>
                <th class="py-2.5 px-3 text-center">Prospek</th>
                <th class="py-2.5 px-3 text-center">Dihubungi</th>
                <th class="py-2.5 px-3 text-center">Belum</th>
                <th class="py-2.5 px-3 text-center">Aktivitas</th>
                <th class="py-2.5 px-3 text-center">Konversi</th>
                <th class="py-2.5 px-3 text-center">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="sortedOfficers.length === 0"
                class="border-b border-slate-100"
              >
                <td colspan="8" class="text-center py-6 text-slate-400">
                  Tidak ada data petugas yang sesuai.
                </td>
              </tr>
              <tr
                v-for="o in sortedOfficers"
                :key="o.userId || 'unassigned'"
                class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
              >
                <td class="py-3 px-3 text-center">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs"
                    :class="[
                      o.displayRank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      o.displayRank === 2 ? 'bg-slate-200 text-slate-700' :
                      o.displayRank === 3 ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                      'text-slate-500'
                    ]"
                  >
                    {{ o.displayRank }}
                  </span>
                </td>
                <td class="py-3 px-3">
                  <div class="font-bold text-slate-800">{{ o.officerName }}</div>
                  <div class="text-[11px] text-slate-400 font-mono">
                    {{ o.officerPhone ? formatPhoneDisplay(o.officerPhone) : 'Penanggung Jawab CRM' }}
                  </div>
                </td>
                <td class="py-3 px-3 text-center font-bold text-slate-700 font-mono">
                  {{ o.totalLeads }}
                </td>
                <td class="py-3 px-3 text-center text-emerald-600 font-semibold font-mono">
                  {{ o.contactedLeads }}
                </td>
                <td class="py-3 px-3 text-center font-mono" :class="o.uncontactedLeads > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'">
                  {{ o.uncontactedLeads }}
                </td>
                <td class="py-3 px-3 text-center font-mono text-slate-700">
                  {{ o.totalActivities }}
                </td>
                <td class="py-3 px-3 text-center font-extrabold text-teal-700 font-mono">
                  {{ o.convertedLeads }}
                </td>
                <td class="py-3 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <div class="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                      <div
                        class="bg-teal-600 h-full rounded-full"
                        :style="{ width: `${Math.min(100, o.conversionRate)}%` }"
                      ></div>
                    </div>
                    <span class="font-bold text-teal-700 font-mono">{{ o.conversionRate }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 7 & 8. ANALISIS SUMBER, WILAYAH DAN ASAL SEKOLAH         -->
      <!-- ======================================================== -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 7. Analisis Sumber Prospek -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div class="mb-3">
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Share2 class="w-4 h-4 text-emerald-600" />
              Analisis Sumber Prospek (Saluran Promosi)
            </h3>
            <p class="text-xs text-slate-500">
              Evaluasi saluran promosi paling efektif dan tingkat konversinya
            </p>
          </div>

          <div v-if="reportData.sourceAnalysis.length === 0" class="py-8 text-center text-slate-400 text-xs">
            Tidak ada data sumber prospek.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="s in reportData.sourceAnalysis"
              :key="s.sourceName"
              class="p-3 rounded-xl border border-slate-100 bg-slate-50/40"
            >
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="font-bold text-slate-800">{{ s.sourceName }}</span>
                <div class="flex items-center gap-2 font-mono">
                  <span class="text-slate-600"><strong>{{ s.totalLeads }}</strong> lead ({{ s.percentage }}%)</span>
                  <span class="text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                    Conv: {{ s.conversionRate }}%
                  </span>
                </div>
              </div>
              <div class="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                <div
                  class="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  :style="{ width: `${s.percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 8. Asal Sekolah & Persebaran Wilayah -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          <!-- Top Asal SMP/MTs -->
          <div>
            <div class="mb-3">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <School class="w-4 h-4 text-emerald-600" />
                Asal Sekolah Terbanyak (SMP / MTs)
              </h3>
              <p class="text-xs text-slate-500">
                Peringkat asal sekolah penyumbang calon peserta didik
              </p>
            </div>

            <div v-if="reportData.schoolAnalysis.length === 0" class="py-4 text-center text-slate-400 text-xs">
              Belum ada data sekolah asal.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 text-slate-500 font-bold border-y border-slate-200">
                    <th class="py-2 px-3">Nama Sekolah</th>
                    <th class="py-2 px-3 text-center">Prospek</th>
                    <th class="py-2 px-3 text-center">Konversi</th>
                    <th class="py-2 px-3 text-center">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="sc in reportData.schoolAnalysis.slice(0, 5)"
                    :key="sc.schoolName"
                    class="border-b border-slate-100 hover:bg-slate-50/50"
                  >
                    <td class="py-2 px-3 font-semibold text-slate-800">{{ sc.schoolName }}</td>
                    <td class="py-2 px-3 text-center font-mono font-bold">{{ sc.totalLeads }}</td>
                    <td class="py-2 px-3 text-center font-mono text-teal-700 font-bold">{{ sc.convertedLeads }}</td>
                    <td class="py-2 px-3 text-center font-mono font-semibold text-teal-600">{{ sc.conversionRate }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Persebaran Kecamatan -->
          <div class="pt-3 border-t border-slate-100">
            <h4 class="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <MapPin class="w-3.5 h-3.5 text-emerald-600" />
              Persebaran Wilayah Berdasarkan Kecamatan
            </h4>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="d in reportData.districtAnalysis"
                :key="d.districtName"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
              >
                <span>{{ d.districtName }}</span>
                <span class="font-bold text-emerald-700 font-mono">({{ d.totalLeads }})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 9. ANALISIS KENDALA PENDAFTARAN            -->
      <!-- ========================================== -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div class="mb-4">
          <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle class="w-4 h-4 text-rose-600" />
            Analisis Kendala & Alasan Belum Melanjutkan Pendaftaran
          </h3>
          <p class="text-xs text-slate-500">
            Pemetaan alasan dan kendala calon siswa yang menolak atau belum menyelesaikan pendaftaran
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="obs in reportData.obstacleAnalysis"
            :key="obs.category"
            class="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50"
          >
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="font-bold text-slate-800 truncate" :title="obs.category">
                {{ obs.category }}
              </span>
              <span class="font-bold font-mono text-slate-700 ml-2">
                {{ obs.count }} ({{ obs.percentage }}%)
              </span>
            </div>
            <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                class="bg-rose-500 h-full rounded-full transition-all duration-500"
                :style="{ width: `${obs.percentage}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 10. TABEL PROSPEK MEMBUTUHKAN TINDAK LANJUT              -->
      <!-- ======================================================== -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock class="w-4 h-4 text-amber-600" />
              Prospek yang Membutuhkan Tindak Lanjut (Actionable Leads)
            </h3>
            <p class="text-xs text-slate-500">
              Daftar calon siswa yang diprioritaskan: belum dihubungi, jadwal terlewat, atau siap didorong mendaftar
            </p>
          </div>

          <!-- Quick Search -->
          <div class="relative print:hidden">
            <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              v-model="actionableSearch"
              placeholder="Cari nama / sekolah..."
              class="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-48 sm:w-64"
            />
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="px-5 pt-3 border-b border-slate-100 flex flex-wrap gap-2 print:hidden">
          <button
            @click="actionableTab = 'ALL'; actionablePage = 1"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            :class="actionableTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            Semua ({{ actionableTabCounts.ALL }})
          </button>

          <button
            @click="actionableTab = 'OVERDUE'; actionablePage = 1"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            :class="actionableTab === 'OVERDUE' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'"
          >
            <AlertTriangle class="w-3.5 h-3.5" />
            Jadwal Terlewat ({{ actionableTabCounts.OVERDUE }})
          </button>

          <button
            @click="actionableTab = 'UNCONTACTED'; actionablePage = 1"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            :class="actionableTab === 'UNCONTACTED' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
          >
            Belum Dihubungi ({{ actionableTabCounts.UNCONTACTED }})
          </button>

          <button
            @click="actionableTab = 'INTERESTED'; actionablePage = 1"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            :class="actionableTab === 'INTERESTED' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
          >
            Menunjukkan Minat ({{ actionableTabCounts.INTERESTED }})
          </button>

          <button
            @click="actionableTab = 'READY_TO_REGISTER'; actionablePage = 1"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            :class="actionableTab === 'READY_TO_REGISTER' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'"
          >
            Siap Mendaftar ({{ actionableTabCounts.READY_TO_REGISTER }})
          </button>
        </div>

        <!-- Table Data -->
        <BaseEmptyState
          v-if="paginatedActionableLeads.length === 0"
          title="Tidak ada prospek yang membutuhkan tindak lanjut"
          description="Semua calon siswa dalam kategori ini telah tertangani atau tidak ditemukan."
          class="py-12"
        />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th class="py-3 px-4">Calon Siswa</th>
                <th class="py-3 px-3">Asal Sekolah</th>
                <th class="py-3 px-3">Kontak WA</th>
                <th class="py-3 px-3">Status Lead</th>
                <th class="py-3 px-3">Petugas Penangan</th>
                <th class="py-3 px-3">Jadwal Follow-up</th>
                <th class="py-3 px-3">Catatan</th>
                <th class="py-3 px-4 text-center print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="l in paginatedActionableLeads"
                :key="l.id"
                class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
              >
                <!-- Nama & Lembaga -->
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-800">{{ l.fullName }}</div>
                  <div class="text-[11px] text-slate-400">{{ l.institutionName }}</div>
                </td>

                <!-- Asal Sekolah -->
                <td class="py-3 px-3 text-slate-700 font-medium">
                  {{ l.schoolOrigin || '-' }}
                </td>

                <!-- Kontak WA -->
                <td class="py-3 px-3 font-mono">
                  <a
                    v-if="l.phone"
                    :href="`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`"
                    target="_blank"
                    class="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <MessageCircle class="w-3.5 h-3.5 text-emerald-600" />
                    {{ formatPhoneDisplay(l.phone) }}
                  </a>
                  <span v-else class="text-slate-400">-</span>
                </td>

                <!-- Status Lead Badge -->
                <td class="py-3 px-3">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    :class="CRM_LEAD_STATUS_BADGES[l.status]?.colorClasses || 'bg-slate-100 text-slate-700 border-slate-200'"
                  >
                    {{ CRM_LEAD_STATUS_BADGES[l.status]?.label || l.status }}
                  </span>
                </td>

                <!-- Petugas Penangan -->
                <td class="py-3 px-3 font-medium text-slate-700">
                  {{ l.leadByName }}
                </td>

                <!-- Jadwal Follow-up -->
                <td class="py-3 px-3">
                  <div v-if="l.nextFollowUpAt">
                    <span
                      v-if="l.isOverdue"
                      class="inline-flex items-center gap-1 text-rose-600 font-bold"
                    >
                      <AlertTriangle class="w-3 h-3" />
                      {{ formatDate(l.nextFollowUpAt) }} (Terlewat)
                    </span>
                    <span v-else class="text-slate-600 font-medium font-mono">
                      {{ formatDate(l.nextFollowUpAt) }}
                    </span>
                  </div>
                  <span v-else class="text-slate-400 italic">Belum dijadwalkan</span>
                </td>

                <!-- Catatan -->
                <td class="py-3 px-3 text-slate-500 max-w-[200px] truncate" :title="l.notes">
                  {{ l.notes || '-' }}
                </td>

                <!-- Aksi Detail -->
                <td class="py-3 px-4 text-center print:hidden">
                  <BaseButton
                    @click="openLeadDetail(l.id)"
                    variant="outline"
                    size="sm"
                    class="text-xs px-2.5 py-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <span>Detail</span>
                    <ExternalLink class="w-3 h-3 ml-1" />
                  </BaseButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination for Actionable Table -->
        <div
          v-if="filteredActionableLeads.length > 0"
          class="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 print:hidden"
        >
          <div class="text-xs text-slate-500">
            Menampilkan {{ (actionablePage - 1) * actionablePerPage + 1 }} -
            {{ Math.min(actionablePage * actionablePerPage, filteredActionableLeads.length) }}
            dari {{ filteredActionableLeads.length }} prospek
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="actionablePage > 1 && actionablePage--"
              :disabled="actionablePage === 1"
              class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <div class="px-3 text-xs font-bold text-slate-700">
              {{ actionablePage }} / {{ totalActionablePages }}
            </div>
            <button
              @click="actionablePage < totalActionablePages && actionablePage++"
              :disabled="actionablePage === totalActionablePages"
              class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: portrait;
    margin: 1cm;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print\:hidden {
    display: none !important;
  }
  .print\:block {
    display: block !important;
  }
  .shadow-xs {
    box-shadow: none !important;
  }
  .border-slate-200 {
    border-color: #cbd5e1 !important;
  }
}
</style>

