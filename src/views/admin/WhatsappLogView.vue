<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { getWhatsappLogsMock } from '@/data/mock/whatsappLogs'

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
const adminInstitution = computed(() => user.value?.institution?.name || null)

// Constants
const availableInstitutions = [
  { value: 'ALL', label: 'Semua Lembaga' },
  { value: 'Non Formal', label: 'Non Formal' },
  { value: 'SMP IT Asy-Syadzili', label: 'SMP IT Asy-Syadzili' },
  { value: 'SMA IT Asy-Syadzili', label: 'SMA IT Asy-Syadzili' },
  { value: 'SMK IT Asy-Syadzili', label: 'SMK IT Asy-Syadzili' }
]

const eventTypes = [
  { value: 'ALL', label: 'Semua Event' },
  { value: 'INITIAL_REGISTRATION_SUCCESS', label: 'Pendaftaran Awal Berhasil' },
  { value: 'FORM_INCOMPLETE', label: 'Form Belum Lengkap' },
  { value: 'FULL_REGISTRATION_SUBMITTED', label: 'Pendaftaran Berhasil Dikirim' },
  { value: 'DOCUMENT_REVISION_REQUIRED', label: 'Dokumen Perlu Diperbaiki' },
  { value: 'DOCUMENTS_VERIFIED', label: 'Berkas Terverifikasi' },
  { value: 'APPLICATION_STATUS_CHANGED', label: 'Status Pendaftaran Berubah' },
  { value: 'ANNOUNCEMENT', label: 'Pengumuman / Informasi' }
]

const statuses = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'SENT', label: 'Terkirim' },
  { value: 'DELIVERED', label: 'Diterima' },
  { value: 'FAILED', label: 'Gagal' }
]

const dateFilters = [
  { value: 'ALL', label: 'Semua Waktu' },
  { value: 'TODAY', label: 'Hari Ini' },
  { value: 'LAST_7', label: '7 Hari Terakhir' },
  { value: 'LAST_30', label: '30 Hari Terakhir' },
  { value: 'CUSTOM', label: 'Custom' }
]

// State
const loading = ref(true)
const allLogs = ref([])

// Filters
const search = ref('')
const filterEvent = ref('ALL')
const filterStatus = ref('ALL')
const filterInstitution = ref('ALL')
const filterDateType = ref('ALL')
const customDateStart = ref('')
const customDateEnd = ref('')

// Pagination
const currentPage = ref(1)
const perPage = ref(10)
const perPageOptions = [10, 25, 50, 100]

// Fetch data
const fetchLogs = async () => {
  loading.value = true
  const res = await getWhatsappLogsMock()
  if (res.success) {
    allLogs.value = res.data
  }
  loading.value = false
}

onMounted(() => {
  fetchLogs()
})

// Filter Logic
const filteredLogs = computed(() => {
  let result = allLogs.value

  // Role Security Filter
  if (!isSuperAdmin.value && adminInstitution.value) {
    result = result.filter(log => log.institutionName === adminInstitution.value)
  }

  // Super Admin Institution Filter
  if (isSuperAdmin.value && filterInstitution.value !== 'ALL') {
    result = result.filter(log => log.institutionName === filterInstitution.value)
  }

  // Event & Status Filters
  if (filterEvent.value !== 'ALL') {
    result = result.filter(log => log.event === filterEvent.value)
  }
  if (filterStatus.value !== 'ALL') {
    result = result.filter(log => log.status === filterStatus.value)
  }

  // Search Filter
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(log => 
      (log.studentName && log.studentName.toLowerCase().includes(s)) ||
      (log.recipientName && log.recipientName.toLowerCase().includes(s)) ||
      (log.registrationNumber && log.registrationNumber.toLowerCase().includes(s)) ||
      (log.whatsapp && log.whatsapp.toLowerCase().includes(s))
    )
  }

  // Date Filter (Frontend Mock)
  // Since mock dates are '2026-09-XX HH:mm', we'll simulate logic
  // For 'TODAY', we'll pretend today is '2026-09-30'
  const mockTodayStr = '2026-09-30'
  if (filterDateType.value === 'TODAY') {
    result = result.filter(log => log.createdAt.startsWith(mockTodayStr))
  } else if (filterDateType.value === 'CUSTOM' && customDateStart.value && customDateEnd.value) {
    const start = new Date(customDateStart.value)
    const end = new Date(customDateEnd.value)
    end.setHours(23, 59, 59, 999)
    result = result.filter(log => {
      const logDate = new Date(log.createdAt.split(' ')[0])
      return logDate >= start && logDate <= end
    })
  }

  return result
})

// Pagination Logic
const totalItems = computed(() => filteredLogs.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage.value))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredLogs.value.slice(start, end)
})

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Watch filters to reset page
import { watch } from 'vue'
watch([search, filterEvent, filterStatus, filterInstitution, filterDateType, customDateStart, customDateEnd, perPage], () => {
  currentPage.value = 1
})

// Summary Cards Logic
const summary = computed(() => {
  const data = filteredLogs.value
  return {
    total: data.length,
    success: data.filter(log => log.status === 'SENT' || log.status === 'DELIVERED').length,
    pending: data.filter(log => log.status === 'PENDING' || log.status === 'PROCESSING').length,
    failed: data.filter(log => log.status === 'FAILED').length
  }
})

// Helper functions
const getStatusLabel = (status) => {
  return statuses.find(s => s.value === status)?.label || status
}

const getStatusColor = (status) => {
  const colors = {
    'PENDING': 'bg-slate-100 text-slate-700 border-slate-200',
    'PROCESSING': 'bg-blue-50 text-blue-700 border-blue-200',
    'SENT': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'DELIVERED': 'bg-teal-50 text-teal-700 border-teal-200',
    'FAILED': 'bg-red-50 text-red-700 border-red-200'
  }
  return colors[status] || colors['PENDING']
}

// Modal State
const showDetailModal = ref(false)
const selectedLog = ref(null)

const openDetail = (log) => {
  selectedLog.value = log
  showDetailModal.value = true
}

</script>

<template>
  <div class="whatsapp-log-view pb-20">
    
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Riwayat WhatsApp</h1>
        <p class="text-slate-500 m-0 text-sm">Pantau riwayat notifikasi WhatsApp yang dikirim kepada calon santri/murid dan orang tua/wali.</p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div class="text-slate-500 text-sm font-semibold mb-2">Total Pesan</div>
        <div class="text-3xl font-bold text-slate-800">{{ summary.total }}</div>
      </div>
      <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
        <div class="text-emerald-600 text-sm font-semibold mb-2">Berhasil</div>
        <div class="text-3xl font-bold text-emerald-700">{{ summary.success }}</div>
      </div>
      <div class="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
        <div class="text-blue-600 text-sm font-semibold mb-2">Menunggu</div>
        <div class="text-3xl font-bold text-blue-700">{{ summary.pending }}</div>
      </div>
      <div class="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between">
        <div class="text-red-600 text-sm font-semibold mb-2">Gagal</div>
        <div class="text-3xl font-bold text-red-700">{{ summary.failed }}</div>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Search -->
        <div class="lg:col-span-2">
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Pencarian</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input 
              type="text" 
              v-model="search"
              placeholder="Cari nama, no pendaftaran, WA..." 
              class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800"
            >
          </div>
        </div>
        
        <!-- Date Filter Type -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Waktu</label>
          <select v-model="filterDateType" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in dateFilters" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Event Filter -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Event</label>
          <select v-model="filterEvent" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in eventTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Status</label>
          <select v-model="filterStatus" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in statuses" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <!-- Extended Filters -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" v-if="isSuperAdmin || filterDateType === 'CUSTOM'">
        <!-- Super Admin Lembaga Filter -->
        <div v-if="isSuperAdmin">
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Lembaga</label>
          <select v-model="filterInstitution" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in availableInstitutions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Custom Date Range -->
        <div v-if="filterDateType === 'CUSTOM'" class="flex gap-2">
          <div class="w-1/2">
            <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Dari</label>
            <input type="date" v-model="customDateStart" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
          </div>
          <div class="w-1/2">
            <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Sampai</label>
            <input type="date" v-model="customDateEnd" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div v-if="loading" class="p-12 flex justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
      
      <div v-else-if="filteredLogs.length === 0" class="p-12 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" x2="15" y1="10" y2="10"/></svg>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Tidak ada riwayat</h3>
        <p class="text-slate-500 text-sm">Belum ada riwayat WhatsApp atau tidak ada data yang sesuai dengan filter.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <th class="p-4">Waktu</th>
              <th class="p-4">Penerima</th>
              <th class="p-4">Pendaftar & Lembaga</th>
              <th class="p-4">Event & Template</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              <td class="p-4 text-sm font-mono text-slate-600 whitespace-nowrap">
                {{ log.createdAt }}
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-800 text-sm">{{ log.recipientName }}</div>
                <div class="text-xs text-slate-500 font-mono mt-0.5">{{ log.whatsapp }}</div>
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-700 text-sm">{{ log.studentName }}</div>
                <div class="text-xs text-slate-500 mt-0.5 flex gap-2 items-center">
                  <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{{ log.registrationNumber }}</span>
                  <span class="truncate max-w-[150px]">{{ log.institutionName }}</span>
                </div>
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-700 text-sm">{{ eventTypes.find(e => e.value === log.event)?.label || log.event }}</div>
                <div class="text-xs text-slate-500 mt-0.5 truncate max-w-[200px] italic">"{{ log.templateName }}"</div>
              </td>
              <td class="p-4">
                <span :class="['inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold', getStatusColor(log.status)]">
                  {{ getStatusLabel(log.status) }}
                </span>
                <div v-if="log.status === 'FAILED'" class="text-[10px] text-red-500 font-bold mt-1 max-w-[150px] truncate" :title="log.errorMessage">
                  {{ log.errorCode }}
                </div>
              </td>
              <td class="p-4 text-right">
                <button @click="openDetail(log)" class="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-800 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap">
                  Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="filteredLogs.length > 0" class="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
        <div class="flex items-center gap-2 text-sm text-slate-500">
          Tampilkan
          <select v-model="perPage" class="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none">
            <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          baris per halaman
        </div>
        
        <div class="flex items-center gap-4 text-sm">
          <span class="text-slate-500">
            Menampilkan {{ (currentPage - 1) * perPage + 1 }}-{{ Math.min(currentPage * perPage, totalItems) }} dari {{ totalItems }}
          </span>
          <div class="flex items-center gap-1">
            <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div class="px-3 font-semibold text-slate-700">{{ currentPage }} / {{ totalPages }}</div>
            <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- DETAIL MODAL -->
    <div v-if="showDetailModal && selectedLog" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <h2 class="text-lg font-bold text-slate-800">Detail Log WhatsApp</h2>
          <button @click="showDetailModal = false" class="text-slate-400 hover:text-slate-800"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        
        <!-- Body -->
        <div class="p-6 overflow-y-auto flex-grow space-y-6">
          
          <!-- Status Banner -->
          <div :class="['p-4 rounded-xl border flex items-center justify-between', selectedLog.status === 'FAILED' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200']">
            <div>
              <div class="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500">Status Pengiriman</div>
              <div class="flex items-center gap-2">
                <span :class="['inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold', getStatusColor(selectedLog.status)]">
                  {{ getStatusLabel(selectedLog.status) }}
                </span>
                <span v-if="selectedLog.status === 'FAILED'" class="text-red-700 font-bold text-sm ml-2">Pesan Gagal Dikirim</span>
              </div>
            </div>
          </div>
          
          <div v-if="selectedLog.status === 'FAILED'" class="bg-red-50 p-4 rounded-xl border border-red-200">
            <h4 class="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              Detail Error
            </h4>
            <div class="text-sm text-red-700 space-y-1">
              <p><span class="font-semibold inline-block w-24">Error Code:</span> <span class="font-mono font-bold">{{ selectedLog.errorCode }}</span></p>
              <p><span class="font-semibold inline-block w-24 align-top">Pesan Error:</span> <span class="inline-block" style="width: calc(100% - 6rem);">{{ selectedLog.errorMessage }}</span></p>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <div class="text-xs text-slate-400 font-semibold mb-1">Penerima & Kontak</div>
              <div class="font-bold text-slate-800">{{ selectedLog.recipientName }}</div>
              <div class="text-slate-600 font-mono">{{ selectedLog.whatsapp }}</div>
            </div>
            <div>
              <div class="text-xs text-slate-400 font-semibold mb-1">Pendaftar</div>
              <div class="font-bold text-slate-800">{{ selectedLog.studentName }}</div>
              <div class="text-slate-600 font-mono">{{ selectedLog.registrationNumber }}</div>
            </div>
            <div>
              <div class="text-xs text-slate-400 font-semibold mb-1">Event Sistem</div>
              <div class="font-bold text-slate-700">{{ eventTypes.find(e => e.value === selectedLog.event)?.label || selectedLog.event }}</div>
            </div>
            <div>
              <div class="text-xs text-slate-400 font-semibold mb-1">Lembaga</div>
              <div class="font-bold text-slate-700">{{ selectedLog.institutionName }}</div>
            </div>
            <div>
              <div class="text-xs text-slate-400 font-semibold mb-1">Template Info</div>
              <div class="text-slate-700 font-medium">{{ selectedLog.templateName }} <span class="text-xs bg-slate-100 text-slate-500 px-1 rounded ml-1">{{ selectedLog.templateScope }}</span></div>
            </div>
            <div>
              <div class="text-xs text-slate-400 font-semibold mb-1">Waktu</div>
              <div class="text-slate-600"><span class="w-16 inline-block">Dibuat:</span> <span class="font-mono">{{ selectedLog.createdAt || '-' }}</span></div>
              <div class="text-slate-600"><span class="w-16 inline-block">Dikirim:</span> <span class="font-mono">{{ selectedLog.sentAt || '-' }}</span></div>
              <div class="text-slate-600"><span class="w-16 inline-block">Diterima:</span> <span class="font-mono">{{ selectedLog.deliveredAt || '-' }}</span></div>
            </div>
          </div>

          <!-- Final Message -->
          <div>
            <div class="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center justify-between">
              Isi Pesan
              <span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold normal-case">Sudah dirender</span>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 font-sans leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {{ selectedLog.message }}
            </div>
          </div>

        </div>
        
        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button @click="showDetailModal = false" class="px-4 py-2 bg-white border border-slate-200 hover:border-slate-800 text-slate-700 text-sm font-bold rounded-lg shadow-sm transition-colors">Tutup</button>
        </div>
      </div>
    </div>
    
  </div>
</template>
