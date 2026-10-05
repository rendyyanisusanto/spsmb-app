<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { mockApplicants } from '@/data/mock/applicants'
import { exportToExcel } from '@/utils/exportExcel'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
const adminInstitution = computed(() => user.value?.institution?.name || null)

// Loading States
const loading = ref(false)
const exporting = ref(false)
const rawData = ref([])

onMounted(() => {
  loading.value = true
  setTimeout(() => {
    rawData.value = [...mockApplicants]
    loading.value = false
  }, 400)
})

// Filter Options
const availableInstitutions = ['ALL', 'Non Formal', 'SMP IT Asy-Syadzili', 'SMA IT Asy-Syadzili', 'SMK IT Asy-Syadzili']
const availableGelombang = ['ALL', 'Gelombang 1', 'Gelombang 2', 'Gelombang 3']
const availableStatus = ['ALL', 'Pendaftaran Awal', 'Form Belum Lengkap', 'Form Lengkap', 'Menunggu Verifikasi', 'Perlu Perbaikan', 'Terverifikasi', 'Selesai']
const availableGenders = ['ALL', 'Laki-laki', 'Perempuan']
const availableSources = ['ALL', 'Instagram', 'Brosur / Pamflet', 'Teman / Kerabat', 'WhatsApp', 'Guru / Karyawan', 'Website Sekolah', 'Facebook']

// Active Filters
const filters = ref({
  institution: 'ALL',
  periode: '2027-2028',
  gelombang: 'ALL',
  status: 'ALL',
  gender: 'ALL',
  source: 'ALL',
  startDate: '',
  endDate: ''
})

// Computed Filtered Data
const filteredData = computed(() => {
  let result = rawData.value

  // Role Scope
  if (!isSuperAdmin.value && adminInstitution.value) {
    result = result.filter(p => p.lembaga_pendidikan === adminInstitution.value)
  } else if (isSuperAdmin.value && filters.value.institution !== 'ALL') {
    result = result.filter(p => p.lembaga_pendidikan === filters.value.institution)
  }

  if (filters.value.gelombang !== 'ALL') result = result.filter(p => p.gelombang === filters.value.gelombang)
  if (filters.value.status !== 'ALL') result = result.filter(p => p.status === filters.value.status)
  if (filters.value.gender !== 'ALL') result = result.filter(p => p.jenis_kelamin === filters.value.gender)
  if (filters.value.source !== 'ALL') result = result.filter(p => p.sumber_informasi === filters.value.source)
  
  if (filters.value.startDate && filters.value.endDate) {
    const start = new Date(filters.value.startDate)
    const end = new Date(filters.value.endDate)
    end.setHours(23, 59, 59, 999)
    result = result.filter(p => {
      const d = new Date(p.created_at)
      return d >= start && d <= end
    })
  }

  return result
})

// Summaries
const summary = computed(() => {
  const d = filteredData.value
  return {
    total: d.length,
    male: d.filter(p => p.jenis_kelamin === 'Laki-laki').length,
    female: d.filter(p => p.jenis_kelamin === 'Perempuan').length,
    complete: d.filter(p => ['Form Lengkap', 'Menunggu Verifikasi', 'Terverifikasi', 'Selesai'].includes(p.status)).length,
    incomplete: d.filter(p => ['Pendaftaran Awal', 'Form Belum Lengkap'].includes(p.status)).length,
    verified: d.filter(p => ['Terverifikasi', 'Selesai'].includes(p.status)).length
  }
})

// Aggregate Rekap
const rekapLembaga = computed(() => {
  const map = {}
  filteredData.value.forEach(p => {
    if (!map[p.lembaga_pendidikan]) {
      map[p.lembaga_pendidikan] = { total: 0, male: 0, female: 0, complete: 0, verified: 0 }
    }
    map[p.lembaga_pendidikan].total++
    if (p.jenis_kelamin === 'Laki-laki') map[p.lembaga_pendidikan].male++
    if (p.jenis_kelamin === 'Perempuan') map[p.lembaga_pendidikan].female++
    if (['Form Lengkap', 'Menunggu Verifikasi', 'Terverifikasi', 'Selesai'].includes(p.status)) map[p.lembaga_pendidikan].complete++
    if (['Terverifikasi', 'Selesai'].includes(p.status)) map[p.lembaga_pendidikan].verified++
  })
  return Object.keys(map).map(k => ({ label: k, ...map[k] }))
})

const rekapGelombang = computed(() => {
  const map = {}
  filteredData.value.forEach(p => {
    map[p.gelombang] = (map[p.gelombang] || 0) + 1
  })
  return Object.keys(map).map(k => ({ label: k, total: map[k] }))
})

const rekapStatus = computed(() => {
  const map = {}
  filteredData.value.forEach(p => {
    map[p.status] = (map[p.status] || 0) + 1
  })
  return Object.keys(map).map(k => ({ label: k, total: map[k] }))
})

const rekapSumber = computed(() => {
  const map = {}
  const total = filteredData.value.length
  filteredData.value.forEach(p => {
    map[p.sumber_informasi] = (map[p.sumber_informasi] || 0) + 1
  })
  return Object.keys(map).map(k => {
    const sum = map[k]
    return { label: k, total: sum, percentage: total > 0 ? ((sum / total) * 100).toFixed(1) : 0 }
  }).sort((a, b) => b.total - a.total)
})

// Table Pagination
const currentPage = ref(1)
const perPage = ref(10)
const totalPages = computed(() => Math.ceil(filteredData.value.length / perPage.value))

const paginatedTable = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredData.value.slice(start, start + perPage.value)
})

watch([filters, perPage], () => {
  currentPage.value = 1
}, { deep: true })

// Export Action
const handleExport = async () => {
  if (filteredData.value.length === 0) return
  
  exporting.value = true
  
  // Format sheet data
  const mainData = filteredData.value.map((p, index) => ({
    'No': index + 1,
    'Nomor Pendaftaran': `SPSMB-2027-${String(p.id).padStart(5, '0')}`,
    'Nama Lengkap': p.nama,
    'Jenis Kelamin': p.jenis_kelamin,
    'Nomor WhatsApp': p.no_hp,
    'Nama Orang Tua / Wali': p.nama_wali,
    'Sekolah Asal': p.asal_sekolah,
    'Lembaga': p.lembaga_pendidikan,
    'Gelombang': p.gelombang,
    'Status': p.status,
    'Sumber Informasi': p.sumber_informasi,
    'Tanggal Pendaftaran': p.created_at.split('T')[0]
  }))

  const sheets = [
    { name: 'Data Pendaftar', data: mainData }
  ]

  // Add summary sheets if Super Admin
  if (isSuperAdmin.value) {
    sheets.push({
      name: 'Rekap Lembaga',
      data: rekapLembaga.value.map(r => ({
        'Lembaga': r.label,
        'Total': r.total,
        'Laki-laki': r.male,
        'Perempuan': r.female,
        'Lengkap': r.complete,
        'Terverifikasi': r.verified
      }))
    })
    
    sheets.push({
      name: 'Rekap Status',
      data: rekapStatus.value.map(r => ({ 'Status': r.label, 'Jumlah': r.total }))
    })
    
    sheets.push({
      name: 'Sumber Informasi',
      data: rekapSumber.value.map(r => ({ 'Sumber': r.label, 'Jumlah': r.total, 'Persentase': r.percentage + '%' }))
    })
  }

  let fileName = 'SPSMB_Pendaftar_2027-2028'
  if (isSuperAdmin.value && filters.value.institution !== 'ALL') {
    fileName = `SPSMB_${filters.value.institution.replace(/ /g, '_')}_2027-2028`
  } else if (!isSuperAdmin.value) {
    fileName = `SPSMB_${adminInstitution.value.replace(/ /g, '_')}_2027-2028`
  }
  if (filters.value.gelombang !== 'ALL') {
    fileName += `_${filters.value.gelombang.replace(/ /g, '')}`
  }

  setTimeout(() => {
    try {
      exportToExcel(fileName, sheets)
    } catch (e) {
      console.error(e)
      alert('Terjadi kesalahan saat mengekspor Excel.')
    }
    exporting.value = false
  }, 1000)
}

const printPage = () => {
  window.print()
}
</script>

<template>
  <div class="report-view pb-20">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Laporan SPSMB</h1>
        <p class="text-slate-500 m-0 text-sm">Lihat rekap pendaftaran dan export data SPSMB berdasarkan filter yang dibutuhkan.</p>
      </div>
      <div class="flex gap-2">
        <button @click="printPage" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          Cetak Rekap
        </button>
        <button 
          @click="handleExport" 
          :disabled="exporting || filteredData.length === 0"
          :class="['px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all', (exporting || filteredData.length === 0) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white']"
        >
          <svg v-if="!exporting" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          <svg v-else class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ exporting ? 'Exporting...' : 'Export Excel' }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <BaseLoading v-if="loading" text="Memuat data laporan..." class="py-20" />

    <template v-else>
      <!-- Filters (Hidden on Print) -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6 print:hidden">
        <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Filter Data Laporan</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-if="isSuperAdmin">
            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Lembaga</label>
            <select v-model="filters.institution" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
              <option v-for="v in availableInstitutions" :key="v" :value="v">{{ v === 'ALL' ? 'Semua Lembaga' : v }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Periode</label>
            <select v-model="filters.periode" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
              <option value="2027-2028">2027/2028</option>
              <option value="2026-2027">2026/2027</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Gelombang</label>
            <select v-model="filters.gelombang" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
              <option v-for="v in availableGelombang" :key="v" :value="v">{{ v === 'ALL' ? 'Semua Gelombang' : v }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status</label>
            <select v-model="filters.status" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
              <option v-for="v in availableStatus" :key="v" :value="v">{{ v === 'ALL' ? 'Semua Status' : v }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Jenis Kelamin</label>
            <select v-model="filters.gender" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
              <option v-for="v in availableGenders" :key="v" :value="v">{{ v === 'ALL' ? 'Semua' : v }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Sumber Info</label>
            <select v-model="filters.source" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
              <option v-for="v in availableSources" :key="v" :value="v">{{ v === 'ALL' ? 'Semua Sumber' : v }}</option>
            </select>
          </div>
          <div class="sm:col-span-2 md:col-span-2 flex items-center gap-2">
            <div class="w-1/2">
              <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tgl Daftar (Dari)</label>
              <input type="date" v-model="filters.startDate" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
            </div>
            <div class="w-1/2">
              <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tgl Daftar (Sampai)</label>
              <input type="date" v-model="filters.endDate" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold focus:outline-none focus:border-slate-800">
            </div>
          </div>
        </div>
      </div>

      <!-- Print Title -->
      <div class="hidden print:block mb-6 text-center">
        <h2 class="text-xl font-bold uppercase border-b-2 border-black inline-block pb-1 mb-2">Laporan Pendaftaran SPSMB 2027/2028</h2>
        <p class="text-sm font-mono mt-2">Dicetak pada: {{ new Date().toLocaleString('id-ID') }}</p>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Pendaftar</div>
          <div class="text-2xl font-black text-slate-800">{{ summary.total }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <div class="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Laki-laki</div>
          <div class="text-2xl font-black text-blue-700">{{ summary.male }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <div class="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1">Perempuan</div>
          <div class="text-2xl font-black text-pink-700">{{ summary.female }}</div>
        </div>
        <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm text-center">
          <div class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Form Lengkap</div>
          <div class="text-2xl font-black text-emerald-700">{{ summary.complete }}</div>
        </div>
        <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm text-center">
          <div class="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Belum Lengkap</div>
          <div class="text-2xl font-black text-amber-700">{{ summary.incomplete }}</div>
        </div>
        <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm text-center">
          <div class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Terverifikasi</div>
          <div class="text-2xl font-black text-indigo-700">{{ summary.verified }}</div>
        </div>
      </div>

      <!-- Grid Laporan -->
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        
        <!-- Rekap Lembaga -->
        <div v-if="isSuperAdmin" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800 uppercase tracking-wider">Rekap Per Lembaga</div>
          <div class="p-0 flex-grow overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100 text-slate-500 font-bold">
                  <th class="p-2 pl-4">Lembaga</th>
                  <th class="p-2 text-right">Total</th>
                  <th class="p-2 text-right">L / P</th>
                  <th class="p-2 text-right pr-4">Lengkap</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rekapLembaga" :key="r.label" class="border-b border-slate-50">
                  <td class="p-2 pl-4 font-semibold text-slate-700 truncate max-w-[120px]">{{ r.label }}</td>
                  <td class="p-2 text-right font-mono font-bold">{{ r.total }}</td>
                  <td class="p-2 text-right text-slate-500">{{ r.male }} / {{ r.female }}</td>
                  <td class="p-2 text-right pr-4 text-emerald-600 font-bold">{{ r.complete }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Rekap Gelombang & Status -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800 uppercase tracking-wider">Status & Gelombang</div>
          <div class="p-0 flex-grow grid grid-rows-2">
            <div class="overflow-x-auto border-b border-slate-100">
              <table class="w-full text-left border-collapse text-xs">
                <tbody>
                  <tr v-for="r in rekapGelombang" :key="r.label" class="border-b border-slate-50 hover:bg-slate-50">
                    <td class="p-2 pl-4 font-semibold text-slate-700">{{ r.label }}</td>
                    <td class="p-2 text-right pr-4 font-mono font-bold">{{ r.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <tbody>
                  <tr v-for="r in rekapStatus" :key="r.label" class="border-b border-slate-50 hover:bg-slate-50">
                    <td class="p-2 pl-4 font-semibold text-slate-700">{{ r.label }}</td>
                    <td class="p-2 text-right pr-4 font-mono font-bold">{{ r.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Rekap Sumber -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800 uppercase tracking-wider">Sumber Informasi</div>
          <div class="p-0 flex-grow overflow-x-auto max-h-64">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100 text-slate-500 font-bold">
                  <th class="p-2 pl-4">Sumber</th>
                  <th class="p-2 text-right">Jumlah</th>
                  <th class="p-2 text-right pr-4">%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rekapSumber" :key="r.label" class="border-b border-slate-50 hover:bg-slate-50">
                  <td class="p-2 pl-4 font-semibold text-slate-700">{{ r.label }}</td>
                  <td class="p-2 text-right font-mono font-bold">{{ r.total }}</td>
                  <td class="p-2 text-right pr-4 text-slate-500">
                    <div class="flex items-center justify-end gap-2">
                      <div class="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div class="bg-blue-500 h-full" :style="{ width: r.percentage + '%' }"></div>
                      </div>
                      {{ r.percentage }}%
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Data Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Data Pendaftar ({{ summary.total }})</h3>
        </div>
        
        <BaseEmptyState 
          v-if="filteredData.length === 0" 
          title="Tidak ada pendaftar" 
          description="Tidak ada data yang sesuai dengan filter." 
          class="py-12"
        />
        
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm min-w-[1000px]">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                <th class="p-3 pl-5">No. Pendaftaran</th>
                <th class="p-3">Nama Lengkap</th>
                <th class="p-3">L/P</th>
                <th class="p-3">Kontak WA</th>
                <th class="p-3">Asal Sekolah</th>
                <th class="p-3">Lembaga & Gelombang</th>
                <th class="p-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in paginatedTable" :key="p.id" class="border-b border-slate-100 hover:bg-slate-50/50">
                <td class="p-3 pl-5 font-mono font-bold text-slate-700">SPSMB-2027-{{ String(p.id).padStart(5, '0') }}</td>
                <td class="p-3 font-semibold text-slate-800">{{ p.nama }}</td>
                <td class="p-3 text-slate-600">{{ p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P' }}</td>
                <td class="p-3 font-mono text-slate-600">{{ p.no_hp }}</td>
                <td class="p-3 text-slate-600 truncate max-w-[150px]">{{ p.asal_sekolah }}</td>
                <td class="p-3">
                  <div class="font-semibold text-slate-700">{{ p.lembaga_pendidikan }}</div>
                  <div class="text-xs text-slate-500">{{ p.gelombang }}</div>
                </td>
                <td class="p-3 pr-5">
                  <span class="inline-block px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{{ p.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination (Hidden on print) -->
        <div v-if="filteredData.length > 0" class="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 print:hidden">
          <div class="flex items-center gap-2 text-sm text-slate-500">
            Tampilkan
            <select v-model="perPage" class="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            baris per halaman
          </div>
          
          <div class="flex items-center gap-4 text-sm">
            <span class="text-slate-500">Menampilkan {{ (currentPage - 1) * perPage + 1 }}-{{ Math.min(currentPage * perPage, summary.total) }} dari {{ summary.total }}</span>
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
    </template>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: landscape;
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
  .shadow-sm {
    box-shadow: none !important;
  }
  .border-slate-200 {
    border-color: #e2e8f0 !important;
  }
  .overflow-x-auto {
    overflow: visible !important;
  }
}
</style>
