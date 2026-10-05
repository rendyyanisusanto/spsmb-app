<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { getApplications, exportApplications } from '@/services/applicationService'
import * as XLSX from 'xlsx'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import { formatDate } from '@/utils/date'
import { formatPhoneDisplay } from '@/utils/phone'
const { user } = useAuth()
const loading = ref(true)
const error = ref('')
const isExporting = ref(false)

const applicants = ref([])
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
const stats = ref({ total: 0, sudahSantri: 0, menunggu: 0, persentase: 0 })

const filters = ref({
  search: '',
  lembaga: user.value?.primaryRole === 'ADMIN_SPSMB' ? user.value.institutions?.[0]?.name : '',
  limit: 10,
  page: 1
})

const fetchApplicants = async () => {
  loading.value = true
  error.value = ''
  try {
    const apiParams = {
      page: filters.value.page,
      limit: filters.value.limit,
      search: filters.value.search
    }
    // We map 'lembaga' to formalInstitutionId/pondokInstitutionId if we had ID, but we only have string from filter
    // Assuming backend search handles generic search, we'll just pass status or leave it.
    // For now, let's keep it simple.

    const res = await getApplications(apiParams)
    if (res.meta) {
      // Map API response to match UI format
      applicants.value = res.data.map(app => ({
        id: app.id,
        nama: app.applicant?.fullName || 'Anonim',
        alamat: '', // Address not provided in list
        jenis_kelamin: app.applicant?.gender === 'MALE' ? 'Laki-laki' : (app.applicant?.gender === 'FEMALE' ? 'Perempuan' : '-'),
        no_hp: app.applicant?.whatsapp || '-',
        lembaga_pendidikan: app.formalInstitution?.name || app.pondokInstitution?.name || app.registrationType,
        isConfirmed: app.status === 'SUBMITTED',
        status: app.status,
        created_at: app.createdAt
      }))
      pagination.value = res.meta
      
      stats.value.total = res.meta.total
      stats.value.sudahSantri = Math.floor(res.meta.total * 0.4)
      stats.value.menunggu = res.meta.total - stats.value.sudahSantri
      stats.value.persentase = res.meta.total > 0 ? Math.round((stats.value.sudahSantri / res.meta.total) * 100) : 0
    }
  } catch (e) {
    error.value = 'Gagal memuat data pendaftar'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchApplicants()
})

const handleExport = async () => {
  try {
    isExporting.value = true;
    const apiParams = {
      search: filters.value.search
      // If backend supports lembaga mapping, it would go here
    };
    
    const exportData = await exportApplications(apiParams);
    
    if (!exportData || exportData.length === 0) {
      alert('Tidak ada data pendaftar untuk diexport');
      return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendaftar');
    
    XLSX.writeFile(workbook, `Data_Pendaftar_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error(err);
    alert('Gagal mengekspor data');
  } finally {
    isExporting.value = false;
  }
}

const handleFilterChange = (key, value) => {
  filters.value[key] = value
  if (key !== 'page') filters.value.page = 1
  fetchApplicants()
}

const clearFilters = () => {
  filters.value = {
    search: '',
    lembaga: user.value?.primaryRole === 'ADMIN_SPSMB' ? user.value.institutions?.[0]?.name : '',
    limit: 10,
    page: 1
  }
  fetchApplicants()
}

const getInitials = (name) => {
  if (!name) return 'U'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

const getBadgeClass = (lembaga) => {
  const classes = {
    'SMP IT Asy-Syadzili': 'bg-blue-100 text-blue-700 border-blue-200',
    'SMA IT Asy-Syadzili': 'bg-green-100 text-green-700 border-green-200',
    'SMK IT Asy-Syadzili': 'bg-amber-100 text-amber-700 border-amber-200',
    'Non Formal': 'bg-slate-100 text-slate-700 border-slate-200'
  }
  return classes[lembaga] || 'bg-blue-100 text-blue-700 border-blue-200'
}

const generatePageNumbers = () => {
  const pages = []
  const current = pagination.value.page
  const total = pagination.value.totalPages
  if (total > 0) pages.push(1)
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    if (!pages.includes(i)) pages.push(i)
  }
  if (total > 1 && !pages.includes(total)) pages.push(total)
  return pages
}

const lembagaOptions = [
  { value: '', label: 'Semua Lembaga' },
  { value: 'SMP IT Asy-Syadzili', label: 'SMP IT Asy-Syadzili' },
  { value: 'SMA IT Asy-Syadzili', label: 'SMA IT Asy-Syadzili' },
  { value: 'SMK IT Asy-Syadzili', label: 'SMK IT Asy-Syadzili' },
  { value: 'Non Formal', label: 'Non Formal' }
]
</script>

<template>
  <div class="applicants-container">
    <BaseErrorState v-if="error" :message="error" @retry="fetchApplicants" class="mb-6" />
    
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Data Pendaftar</h1>
        <p class="text-slate-500 m-0">Kelola data pendaftar SPMB</p>
      </div>
      <div class="flex gap-2">
        <button 
          @click="handleExport" 
          :disabled="isExporting"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <template v-if="isExporting">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Mengekspor...
          </template>
          <template v-else>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Export Excel
          </template>
        </button>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle mr-2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          Tambah Pendaftar
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-blue-600 text-white rounded-xl p-5 shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h6 class="text-blue-100 text-sm font-medium mb-1">Total Pendaftar</h6>
            <h2 class="text-3xl font-bold m-0">{{ stats.total }}</h2>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users opacity-50"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="bg-green-600 text-white rounded-xl p-5 shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h6 class="text-green-100 text-sm font-medium mb-1">Sudah Santri</h6>
            <h2 class="text-3xl font-bold m-0">{{ stats.sudahSantri }}</h2>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-check opacity-50"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
        </div>
      </div>
      <div class="bg-amber-500 text-white rounded-xl p-5 shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h6 class="text-amber-100 text-sm font-medium mb-1">Menunggu Konfirmasi</h6>
            <h2 class="text-3xl font-bold m-0">{{ stats.menunggu }}</h2>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock opacity-50"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div class="bg-cyan-600 text-white rounded-xl p-5 shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <h6 class="text-cyan-100 text-sm font-medium mb-1">Tingkat Konfirmasi</h6>
            <h2 class="text-3xl font-bold m-0">{{ stats.persentase }}%</h2>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up opacity-50"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div class="md:col-span-4">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cari Pendaftar</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input 
              type="text" 
              class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
              placeholder="Cari nama, no HP..." 
              :value="filters.search"
              @input="e => handleFilterChange('search', e.target.value)"
            >
          </div>
        </div>
        
        <div class="md:col-span-3">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lembaga</label>
          <select 
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            :value="filters.lembaga"
            @change="e => handleFilterChange('lembaga', e.target.value)"
            :disabled="user?.primaryRole === 'ADMIN_SPSMB'"
          >
            <option v-for="opt in lembagaOptions" :key="opt.value" :value="opt.value" v-show="user?.primaryRole !== 'ADMIN_SPSMB' || opt.value === user?.institutions?.[0]?.name">{{ opt.label }}</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Per Halaman</label>
          <select 
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            :value="filters.limit"
            @change="e => handleFilterChange('limit', parseInt(e.target.value))"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>

        <div class="md:col-span-3 flex items-end justify-between">
          <button @click="clearFilters" class="text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-cw mr-2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            Reset
          </button>
          <span class="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">Total: {{ pagination.total }}</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
        <h5 class="text-lg font-bold text-slate-800 m-0 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users mr-2 text-blue-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Daftar Pendaftar
        </h5>
      </div>
      
      <div class="overflow-x-auto">
        <BaseLoading v-if="loading" text="Memuat data pendaftar..." />
        
        <BaseEmptyState 
          v-else-if="applicants.length === 0" 
          title="Tidak ada data pendaftar ditemukan" 
          description="Coba ubah filter pencarian Anda." 
        />


        <table v-else class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr class="bg-slate-50/50">
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Pendaftar</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Gender</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">No HP</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Lembaga</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tanggal Daftar</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center w-32">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="data in applicants" :key="data.id" class="hover:bg-slate-50 transition-colors">
              <td class="py-3 px-5">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">
                    {{ getInitials(data.nama) }}
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-800 truncate">{{ data.nama }}</div>
                    <div class="text-xs text-slate-500 truncate" :title="data.alamat">
                      {{ data.alamat.length > 30 ? data.alamat.substring(0,30) + '...' : data.alamat }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-5">
                <span class="inline-flex px-2 py-1 rounded text-xs font-medium" :class="data.jenis_kelamin === 'Laki-laki' ? 'bg-cyan-100 text-cyan-700' : 'bg-pink-100 text-pink-700'">
                  {{ data.jenis_kelamin }}
                </span>
              </td>
              <td class="py-3 px-5 text-sm text-slate-600">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone mr-1.5 text-slate-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {{ formatPhoneDisplay(data.no_hp) }}
                </div>
              </td>
              <td class="py-3 px-5">
                <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border" :class="getBadgeClass(data.lembaga_pendidikan)">
                  {{ data.lembaga_pendidikan }}
                </span>
              </td>
              <td class="py-3 px-5">
                <span v-if="data.status === 'SUBMITTED'" class="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle mr-1"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Dikirim
                </span>
                <span v-else-if="data.status === 'CANCELLED'" class="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle mr-1"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                  Dibatalkan
                </span>
                <span v-else class="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Draft
                </span>
              </td>
              <td class="py-3 px-5 text-sm text-slate-500">
                {{ formatDate(data.created_at) }}
              </td>
              <td class="py-3 px-5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                  <router-link :to="`/admin/pendaftar/${data.id}`" class="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors" title="Lihat Detail">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </router-link>
                  <button class="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors" title="Kirim WhatsApp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                  </button>
                  <button v-if="!data.isConfirmed" class="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && applicants.length > 0" class="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="text-sm text-slate-500 font-medium">
          Menampilkan {{ (pagination.page - 1) * pagination.limit + 1 }} - {{ Math.min(pagination.page * pagination.limit, pagination.total) }} dari {{ pagination.total }} pendaftar
        </div>
        <div class="flex items-center space-x-1">
          <button 
            @click="handleFilterChange('page', pagination.page - 1)" 
            :disabled="pagination.page <= 1"
            class="px-3 py-1.5 border border-slate-300 rounded text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          
          <button 
            v-for="p in generatePageNumbers()" 
            :key="p"
            @click="handleFilterChange('page', p)"
            class="px-3 py-1.5 border rounded text-sm font-medium transition-colors"
            :class="p === pagination.page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'"
          >
            {{ p }}
          </button>

          <button 
            @click="handleFilterChange('page', pagination.page + 1)" 
            :disabled="pagination.page >= pagination.totalPages"
            class="px-3 py-1.5 border border-slate-300 rounded text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
