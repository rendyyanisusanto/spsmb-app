<script setup>
import { ref, onMounted, computed } from 'vue'
import * as periodService from '@/services/periodService'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { formatDate } from '@/utils/date'

const activeTab = ref('academicYear') // 'academicYear', 'period', 'wave'

// DATA
const academicYears = ref([])
const periods = ref([])
const waves = ref([])

const loading = ref(true)
const error = ref('')
const search = ref('')

const showModal = ref(false)
const modalMode = ref('add')
const submitting = ref(false)

const showConfirmModal = ref(false)
const itemToDelete = ref(null)

const formData = ref({
  id: null,
  name: '',
  startYear: '',
  endYear: '',
  academicYearId: '',
  registrationPeriodId: '',
  startDate: '',
  endDate: '',
  isActive: true
})

const fetchAcademicYears = async () => {
  try {
    const res = await periodService.getAcademicYears({ search: search.value, limit: 100 })
    if (res.success) academicYears.value = res.data
  } catch (err) {
    console.error(err)
    throw err
  }
}

const fetchPeriods = async () => {
  try {
    const res = await periodService.getPeriods({ search: search.value, limit: 100 })
    if (res.success) periods.value = res.data
  } catch (err) {
    console.error(err)
    throw err
  }
}

const fetchWaves = async () => {
  try {
    const res = await periodService.getWaves({ search: search.value, limit: 100 })
    if (res.success) waves.value = res.data
  } catch (err) {
    console.error(err)
    throw err
  }
}

const fetchData = async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([
      fetchAcademicYears(),
      fetchPeriods(),
      fetchWaves()
    ])
  } catch (err) {
    error.value = 'Terjadi kesalahan sistem saat memuat data'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const handleSearch = () => {
  fetchData()
}

const switchTab = (tab) => {
  activeTab.value = tab
  search.value = ''
  fetchData()
}

const openAddModal = () => {
  modalMode.value = 'add'
  const currentYear = new Date().getFullYear()
  
  if (activeTab.value === 'academicYear') {
    formData.value = { id: null, name: `${currentYear}/${currentYear + 1}`, startYear: currentYear, endYear: currentYear + 1, isActive: true }
  } else if (activeTab.value === 'period') {
    formData.value = { id: null, name: 'SPSMB', academicYearId: academicYears.value[0]?.id || '', startDate: '', endDate: '', isActive: true }
  } else {
    formData.value = { id: null, name: 'Gelombang 1', registrationPeriodId: periods.value[0]?.id || '', startDate: '', endDate: '', isActive: true }
  }
  
  showModal.value = true
}

const openEditModal = (item) => {
  modalMode.value = 'edit'
  if (activeTab.value === 'academicYear') {
    formData.value = { id: item.id, name: item.name, startYear: item.startYear, endYear: item.endYear, isActive: item.isActive }
  } else if (activeTab.value === 'period') {
    formData.value = { id: item.id, name: item.name, academicYearId: item.academicYear?.id || '', startDate: item.startDate, endDate: item.endDate, isActive: item.isActive }
  } else {
    formData.value = { id: item.id, name: item.name, registrationPeriodId: item.period?.id || '', startDate: item.startDate, endDate: item.endDate, isActive: item.isActive }
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    let res;
    
    if (activeTab.value === 'academicYear') {
      const payload = { name: formData.value.name, startYear: formData.value.startYear, endYear: formData.value.endYear, isActive: formData.value.isActive }
      res = modalMode.value === 'add' ? await periodService.createAcademicYear(payload) : await periodService.updateAcademicYear(formData.value.id, payload)
    } else if (activeTab.value === 'period') {
      const payload = { name: formData.value.name, academicYearId: formData.value.academicYearId, startDate: formData.value.startDate, endDate: formData.value.endDate, isActive: formData.value.isActive }
      res = modalMode.value === 'add' ? await periodService.createPeriod(payload) : await periodService.updatePeriod(formData.value.id, payload)
    } else {
      const payload = { name: formData.value.name, registrationPeriodId: formData.value.registrationPeriodId, startDate: formData.value.startDate, endDate: formData.value.endDate, isActive: formData.value.isActive }
      res = modalMode.value === 'add' ? await periodService.createWave(payload) : await periodService.updateWave(formData.value.id, payload)
    }

    if (res.success) {
      closeModal()
      fetchData()
    } else {
      alert(res.error || res.message || 'Gagal menyimpan data')
    }
  } catch (err) {
    alert(err?.response?.data?.message || err?.response?.data?.error || 'Terjadi kesalahan sistem saat menyimpan')
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (item) => {
  try {
    if (activeTab.value === 'academicYear') {
      await periodService.updateAcademicYearStatus(item.id, !item.isActive)
    } else if (activeTab.value === 'period') {
      await periodService.updatePeriodStatus(item.id, !item.isActive)
    } else {
      await periodService.updateWaveStatus(item.id, !item.isActive)
    }
    fetchData()
  } catch (err) {
    alert(err?.response?.data?.message || err?.response?.data?.error || 'Gagal mengubah status')
  }
}

</script>

<template>
  <div class="period-container">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Periode & Gelombang</h1>
        <p class="text-slate-500 m-0">Kelola tahun ajaran, periode SPSMB, dan gelombang pendaftaran.</p>
      </div>
      <button @click="openAddModal" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle mr-2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        Tambah {{ activeTab === 'academicYear' ? 'Tahun Ajaran' : activeTab === 'period' ? 'Periode' : 'Gelombang' }}
      </button>
    </div>

    <!-- Error state -->
    <BaseErrorState v-if="error" :message="error" @retry="fetchData" class="mb-6" />

    <!-- Tabs -->
    <div class="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
      <button @click="switchTab('academicYear')" :class="['px-4 py-2 text-sm font-medium rounded-md transition-all', activeTab === 'academicYear' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900']">Tahun Ajaran</button>
      <button @click="switchTab('period')" :class="['px-4 py-2 text-sm font-medium rounded-md transition-all', activeTab === 'period' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900']">Periode SPSMB</button>
      <button @click="switchTab('wave')" :class="['px-4 py-2 text-sm font-medium rounded-md transition-all', activeTab === 'wave' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900']">Gelombang Pendaftaran</button>
    </div>

    <!-- Filters & Table Card -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Toolbar -->
      <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
        <div class="relative w-full max-w-sm">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input 
            type="text" 
            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
            placeholder="Cari..." 
            v-model="search"
            @keyup.enter="handleSearch"
            @input="handleSearch"
          >
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <BaseLoading v-if="loading" text="Memuat data..." class="py-12" />
        
        <BaseEmptyState 
          v-else-if="(activeTab === 'academicYear' && academicYears.length === 0) || (activeTab === 'period' && periods.length === 0) || (activeTab === 'wave' && waves.length === 0)" 
          title="Tidak ada data ditemukan" 
          description="Coba ubah kata kunci pencarian Anda atau tambah data baru." 
          class="py-12"
        />

        <table v-else class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr class="bg-white">
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Nama</th>
              <th v-if="activeTab === 'academicYear'" class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Mulai - Akhir</th>
              <th v-if="activeTab === 'period'" class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tahun Ajaran</th>
              <th v-if="activeTab === 'wave'" class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Periode</th>
              <th v-if="activeTab !== 'academicYear'" class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tanggal</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template v-if="activeTab === 'academicYear'">
              <tr v-for="item in academicYears" :key="item.id" class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-5 font-semibold text-slate-800">{{ item.name }}</td>
                <td class="py-3 px-5 text-sm text-slate-600">{{ item.startYear }} - {{ item.endYear }}</td>
                <td class="py-3 px-5">
                  <span v-if="item.isActive" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                  <span v-else class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Non-aktif</span>
                </td>
                <td class="py-3 px-5 text-center">
                  <div class="flex items-center justify-center space-x-1.5">
                    <button @click="toggleStatus(item)" class="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors" title="Toggle Status">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-power"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>
                    </button>
                    <button @click="openEditModal(item)" class="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <template v-if="activeTab === 'period'">
              <tr v-for="item in periods" :key="item.id" class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-5 font-semibold text-slate-800">{{ item.name }}</td>
                <td class="py-3 px-5 text-sm text-slate-600"><span class="inline-flex px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 font-medium">{{ item.academicYear?.name }}</span></td>
                <td class="py-3 px-5 text-sm text-slate-600">
                  {{ formatDate(item.startDate) }} s/d {{ formatDate(item.endDate) }}
                </td>
                <td class="py-3 px-5">
                  <span v-if="item.isActive" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                  <span v-else class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Non-aktif</span>
                </td>
                <td class="py-3 px-5 text-center">
                  <div class="flex items-center justify-center space-x-1.5">
                    <button @click="toggleStatus(item)" class="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors" title="Toggle Status">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-power"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>
                    </button>
                    <button @click="openEditModal(item)" class="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <template v-if="activeTab === 'wave'">
              <tr v-for="item in waves" :key="item.id" class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-5 font-semibold text-slate-800">{{ item.name }}</td>
                <td class="py-3 px-5 text-sm text-slate-600"><span class="inline-flex px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 font-medium">{{ item.period?.name }}</span></td>
                <td class="py-3 px-5 text-sm text-slate-600">
                  {{ formatDate(item.startDate) }} s/d {{ formatDate(item.endDate) }}
                </td>
                <td class="py-3 px-5">
                  <span v-if="item.isActive" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                  <span v-else class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Non-aktif</span>
                </td>
                <td class="py-3 px-5 text-center">
                  <div class="flex items-center justify-center space-x-1.5">
                    <button @click="toggleStatus(item)" class="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors" title="Toggle Status">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-power"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>
                    </button>
                    <button @click="openEditModal(item)" class="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form -->
    <BaseModal 
      :open="showModal" 
      :title="modalMode === 'add' ? 'Tambah Data Baru' : 'Edit Data'"
      @close="closeModal"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nama <span class="text-red-500">*</span></label>
          <input type="text" v-model="formData.name" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Contoh: 2024/2025 atau Gelombang 1">
        </div>
        
        <template v-if="activeTab === 'academicYear'">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tahun Awal <span class="text-red-500">*</span></label>
              <input type="number" v-model="formData.startYear" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tahun Akhir <span class="text-red-500">*</span></label>
              <input type="number" v-model="formData.endYear" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>
          </div>
        </template>

        <template v-if="activeTab === 'period'">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran <span class="text-red-500">*</span></label>
            <select v-model="formData.academicYearId" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option v-for="a in academicYears" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>
        </template>

        <template v-if="activeTab === 'wave'">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Periode <span class="text-red-500">*</span></label>
            <select v-model="formData.registrationPeriodId" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option v-for="p in periods" :key="p.id" :value="p.id">{{ p.name }} ({{ p.academicYear?.name }})</option>
            </select>
          </div>
        </template>
        
        <template v-if="activeTab !== 'academicYear'">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai <span class="text-red-500">*</span></label>
              <input type="date" v-model="formData.startDate" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai <span class="text-red-500">*</span></label>
              <input type="date" v-model="formData.endDate" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>
          </div>
        </template>

        <div class="flex items-center mt-4">
          <input type="checkbox" id="isActive" v-model="formData.isActive" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded">
          <label for="isActive" class="ml-2 block text-sm text-slate-700 font-medium">
            Status Aktif
          </label>
        </div>

        <button type="submit" class="hidden"></button>
      </form>
      
      <template #footer>
        <div class="flex justify-end space-x-2">
          <button type="button" @click="closeModal" class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors" :disabled="submitting">
            Batal
          </button>
          <button type="button" @click="handleSubmit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center" :disabled="submitting">
            <svg v-if="submitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ submitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </template>
    </BaseModal>

  </div>
</template>
