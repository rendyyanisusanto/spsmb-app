<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { getAuditLogsMock } from '@/data/mock/auditLogs'
import { exportToExcel } from '@/utils/exportExcel'

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
const adminInstitution = computed(() => user.value?.institution?.name || null)

// Loading State
const loading = ref(false)
const exporting = ref(false)
const allLogs = ref([])

onMounted(async () => {
  loading.value = true
  const res = await getAuditLogsMock()
  if (res.success) {
    allLogs.value = res.data
  }
  loading.value = false
})

// Constants for UI
const modules = [
  { value: 'ALL', label: 'Semua Module' },
  { value: 'AUTH', label: 'Autentikasi' },
  { value: 'APPLICANT', label: 'Pendaftar' },
  { value: 'DOCUMENT', label: 'Dokumen' },
  { value: 'FORM', label: 'Form Pendaftaran' },
  { value: 'REQUIREMENT', label: 'Persyaratan' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'USER', label: 'User' },
  { value: 'INSTITUTION', label: 'Lembaga' },
  { value: 'PERIOD', label: 'Periode' },
  { value: 'PROGRAM', label: 'Program/Jurusan' },
  { value: 'REPORT', label: 'Laporan' },
  { value: 'SETTING', label: 'Pengaturan' }
]

const actions = [
  { value: 'ALL', label: 'Semua Aktivitas' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'CREATE', label: 'Tambah Data' },
  { value: 'UPDATE', label: 'Edit Data' },
  { value: 'DELETE', label: 'Hapus Data' },
  { value: 'STATUS_CHANGE', label: 'Perubahan Status' },
  { value: 'DOCUMENT_VERIFY', label: 'Verifikasi Dokumen' },
  { value: 'DOCUMENT_REVISION', label: 'Perbaikan Dokumen' },
  { value: 'FORM_CONFIG_UPDATE', label: 'Perubahan Form' },
  { value: 'DOCUMENT_REQUIREMENT_UPDATE', label: 'Perubahan Persyaratan' },
  { value: 'WHATSAPP_TEMPLATE_UPDATE', label: 'Perubahan Template WA' },
  { value: 'EXPORT', label: 'Export Data' }
]

const roles = [
  { value: 'ALL', label: 'Semua Role' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN_SPSMB', label: 'Admin Lembaga' }
]

const institutions = [
  { value: 'ALL', label: 'Semua Lembaga / Global' },
  { value: 'Non Formal', label: 'Non Formal' },
  { value: 'SMP IT Asy-Syadzili', label: 'SMP IT Asy-Syadzili' },
  { value: 'SMA IT Asy-Syadzili', label: 'SMA IT Asy-Syadzili' },
  { value: 'SMK IT Asy-Syadzili', label: 'SMK IT Asy-Syadzili' }
]

const dateFilters = [
  { value: 'ALL', label: 'Semua Waktu' },
  { value: 'TODAY', label: 'Hari Ini' },
  { value: 'LAST_7', label: '7 Hari Terakhir' },
  { value: 'CUSTOM', label: 'Custom Date' }
]

// Filters state
const search = ref('')
const filterModule = ref('ALL')
const filterAction = ref('ALL')
const filterRole = ref('ALL')
const filterInstitution = ref('ALL')
const filterDateType = ref('ALL')
const customDateStart = ref('')
const customDateEnd = ref('')

// Computed Filtered Logs
const filteredLogs = computed(() => {
  let result = allLogs.value

  // Security Scope Filter
  if (!isSuperAdmin.value) {
    result = result.filter(log => log.institutionName === adminInstitution.value)
  } else if (isSuperAdmin.value && filterInstitution.value !== 'ALL') {
    if (filterInstitution.value === 'Global') {
      result = result.filter(log => !log.institutionName || log.institutionName === 'Global')
    } else {
      result = result.filter(log => log.institutionName === filterInstitution.value)
    }
  }

  // General Filters
  if (filterModule.value !== 'ALL') result = result.filter(log => log.module === filterModule.value)
  if (filterAction.value !== 'ALL') result = result.filter(log => log.action === filterAction.value)
  if (filterRole.value !== 'ALL') result = result.filter(log => log.role === filterRole.value)
  
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(log => 
      (log.userName && log.userName.toLowerCase().includes(s)) ||
      (log.description && log.description.toLowerCase().includes(s)) ||
      (log.targetName && String(log.targetName).toLowerCase().includes(s)) ||
      (log.targetId && String(log.targetId).toLowerCase().includes(s))
    )
  }
  
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

// Pagination
const currentPage = ref(1)
const perPage = ref(25)
const perPageOptions = [10, 25, 50, 100]
const totalItems = computed(() => filteredLogs.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage.value))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredLogs.value.slice(start, end)
})

import { watch } from 'vue'
watch([search, filterModule, filterAction, filterRole, filterInstitution, filterDateType, customDateStart, customDateEnd, perPage], () => {
  currentPage.value = 1
})

// Modals
const showDetailModal = ref(false)
const selectedLog = ref(null)

const openDetail = (log) => {
  selectedLog.value = log
  showDetailModal.value = true
}

// Helpers
const getActionLabel = (act) => actions.find(a => a.value === act)?.label || act
const getModuleLabel = (mod) => modules.find(m => m.value === mod)?.label || mod
const getRoleColor = (role) => {
  if (role === 'SUPER_ADMIN') return 'bg-purple-100 text-purple-700 border-purple-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

// Export Audit Log
const handleExport = () => {
  if (filteredLogs.value.length === 0) return
  exporting.value = true
  
  const data = filteredLogs.value.map(log => ({
    'Waktu': log.createdAt,
    'Admin': log.userName,
    'Username': log.username,
    'Role': log.role,
    'Lembaga': log.institutionName,
    'Aktivitas': getActionLabel(log.action),
    'Module': getModuleLabel(log.module),
    'Target Type': log.targetType,
    'Target Name': log.targetName,
    'Deskripsi': log.description
  }))

  const fileName = isSuperAdmin.value ? 'SPSMB_AuditLog_Semua' : `SPSMB_AuditLog_${adminInstitution.value.replace(/ /g, '_')}`

  setTimeout(() => {
    exportToExcel(fileName, [{ name: 'Audit Log', data }])
    exporting.value = false
  }, 800)
}
</script>

<template>
  <div class="audit-log-view pb-20">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Audit Log</h1>
        <p class="text-slate-500 m-0 text-sm">Riwayat aktivitas administrator pada sistem SPSMB. Data bersifat read-only.</p>
      </div>
      <div>
        <button 
          @click="handleExport" 
          :disabled="exporting || filteredLogs.length === 0"
          :class="['px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all', (exporting || filteredLogs.length === 0) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 text-white']"
        >
          <svg v-if="!exporting" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          <svg v-else class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ exporting ? 'Exporting...' : 'Export Log' }}
        </button>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="lg:col-span-2">
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Pencarian</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input type="text" v-model="search" placeholder="Cari nama admin, aktivitas, target..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
          </div>
        </div>
        
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Waktu</label>
          <select v-model="filterDateType" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in dateFilters" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <div v-if="isSuperAdmin">
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Lembaga</label>
          <select v-model="filterInstitution" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in institutions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Module</label>
          <select v-model="filterModule" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in modules" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Aktivitas</label>
          <select v-model="filterAction" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in actions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div v-if="isSuperAdmin">
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Role Admin</label>
          <select v-model="filterRole" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            <option v-for="opt in roles" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
      
      <!-- Custom Date Range -->
      <div v-if="filterDateType === 'CUSTOM'" class="flex gap-4">
        <div class="w-64">
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Dari Tanggal</label>
          <input type="date" v-model="customDateStart" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
        </div>
        <div class="w-64">
          <label class="block text-xs font-bold text-slate-700 mb-1 uppercase">Sampai Tanggal</label>
          <input type="date" v-model="customDateEnd" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
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
        <h3 class="text-lg font-bold text-slate-800 mb-1">Belum ada aktivitas</h3>
        <p class="text-slate-500 text-sm">Tidak ditemukan aktivitas yang sesuai dengan filter.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <th class="p-4 w-40">Waktu</th>
              <th class="p-4 w-56">Admin & Role</th>
              <th class="p-4">Aktivitas & Module</th>
              <th class="p-4">Target & Deskripsi</th>
              <th class="p-4 w-24 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              <td class="p-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                {{ log.createdAt }}
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-800 text-sm flex items-center gap-2">
                  {{ log.userName }}
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span :class="['text-[9px] font-bold px-1.5 py-0.5 rounded uppercase', getRoleColor(log.role)]">
                    {{ log.role === 'SUPER_ADMIN' ? 'SUPER' : 'LEMBAGA' }}
                  </span>
                  <span class="text-xs text-slate-500 truncate max-w-[120px]">{{ log.institutionName || 'Global' }}</span>
                </div>
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-700 text-sm">{{ getActionLabel(log.action) }}</div>
                <div class="text-xs text-slate-500 font-mono mt-0.5">{{ getModuleLabel(log.module) }}</div>
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-700 text-sm truncate max-w-[250px]" :title="log.targetName">{{ log.targetName || '-' }}</div>
                <div class="text-xs text-slate-500 mt-0.5 truncate max-w-[300px]" :title="log.description">{{ log.description }}</div>
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
            <button @click="currentPage > 1 && currentPage--" :disabled="currentPage === 1" class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div class="px-3 font-semibold text-slate-700">{{ currentPage }} / {{ totalPages }}</div>
            <button @click="currentPage < totalPages && currentPage++" :disabled="currentPage === totalPages" class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
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
          <h2 class="text-lg font-bold text-slate-800">Detail Aktivitas</h2>
          <button @click="showDetailModal = false" class="text-slate-400 hover:text-slate-800"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        
        <!-- Body -->
        <div class="p-6 overflow-y-auto flex-grow space-y-6">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Administrator</div>
              <div class="font-bold text-slate-800">{{ selectedLog.userName }} <span class="font-normal text-slate-500 font-mono">(@{{ selectedLog.username }})</span></div>
              <div class="mt-1 flex items-center gap-2">
                <span :class="['text-[10px] font-bold px-1.5 py-0.5 rounded uppercase', getRoleColor(selectedLog.role)]">{{ selectedLog.role }}</span>
                <span class="text-slate-600 font-medium text-xs">{{ selectedLog.institutionName || 'Global' }}</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Aktivitas Sistem</div>
              <div class="font-bold text-slate-800">{{ getActionLabel(selectedLog.action) }}</div>
              <div class="text-slate-600 font-mono text-xs mt-1">Modul: {{ getModuleLabel(selectedLog.module) }}</div>
              <div class="text-slate-500 font-mono text-xs mt-1">{{ selectedLog.createdAt }}</div>
            </div>
          </div>

          <div>
            <div class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Target Perubahan</div>
            <div class="text-slate-800 font-bold">{{ selectedLog.targetName || '-' }} <span v-if="selectedLog.targetId" class="text-slate-400 font-mono text-xs ml-1">(ID: {{ selectedLog.targetId }})</span></div>
            <div class="text-slate-600 mt-1 italic">{{ selectedLog.description }}</div>
          </div>

          <div v-if="selectedLog.before || selectedLog.after" class="border-t border-slate-100 pt-4 mt-4">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Detail Perubahan Data</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-red-50/50 border border-red-100 rounded-xl p-4">
                <div class="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg> Sebelum</div>
                <pre class="text-xs font-mono text-slate-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{{ selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : '-' }}</pre>
              </div>
              <div class="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                <div class="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Sesudah</div>
                <pre class="text-xs font-mono text-slate-800 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{{ selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : '-' }}</pre>
              </div>
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
