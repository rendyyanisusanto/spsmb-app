<script setup>
import { ref, onMounted } from 'vue'
import * as institutionService from '@/services/institutionService'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
const institutions = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')

const showModal = ref(false)
const modalMode = ref('add') // 'add' or 'edit'
const submitting = ref(false)

const showConfirmModal = ref(false)
const itemToDelete = ref(null)

const formData = ref({
  id: null,
  code: '',
  name: '',
  institution_type: 'SMP',
  gender_scope: 'CAMPURAN',
  is_active: 1
})

const fetchInstitutions = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await institutionService.getInstitutions({ search: search.value })
    if (res.success) {
      institutions.value = res.data
    } else {
      error.value = res.error || 'Gagal memuat data lembaga'
    }
  } catch (err) {
    error.value = 'Terjadi kesalahan sistem'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchInstitutions()
})

const handleSearch = () => {
  fetchInstitutions()
}

const openAddModal = () => {
  modalMode.value = 'add'
  formData.value = {
    id: null,
    code: '',
    name: '',
    institution_type: 'SMP',
    gender_scope: 'ALL',
    is_active: true
  }
  showModal.value = true
}

const openEditModal = (item) => {
  modalMode.value = 'edit'
  formData.value = { ...item }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    let res;
    const payload = {
      code: formData.value.code,
      name: formData.value.name,
      institution_type: formData.value.institution_type,
      gender_scope: formData.value.gender_scope,
      is_active: formData.value.is_active
    }
    
    if (modalMode.value === 'add') {
      res = await institutionService.createInstitution(payload)
    } else {
      res = await institutionService.updateInstitution(formData.value.id, payload)
    }

    if (res.success) {
      closeModal()
      fetchInstitutions()
    } else {
      alert(res.error || 'Gagal menyimpan data')
    }
  } catch (err) {
    alert('Terjadi kesalahan sistem saat menyimpan')
  } finally {
    submitting.value = false
  }
}

const confirmDelete = (item) => {
  itemToDelete.value = item
  showConfirmModal.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value) return
  
  submitting.value = true
  try {
    const res = await institutionService.updateInstitutionStatus(itemToDelete.value.id, false)
    if (res.success) {
      fetchInstitutions()
      showConfirmModal.value = false
      itemToDelete.value = null
    } else {
      alert(res.error || 'Gagal menghapus data')
    }
  } catch (err) {
    alert('Terjadi kesalahan sistem saat menghapus')
  } finally {
    submitting.value = false
  }
}

const getTypeBadgeClass = (type) => {
  const classes = {
    'PONDOK': 'bg-emerald-100 text-emerald-700',
    'SMP': 'bg-blue-100 text-blue-700',
    'SMA': 'bg-indigo-100 text-indigo-700',
    'SMK': 'bg-amber-100 text-amber-700'
  }
  return classes[type] || 'bg-slate-100 text-slate-700'
}
</script>

<template>
  <div class="institution-container">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Manajemen Lembaga</h1>
        <p class="text-slate-500 m-0">Kelola data lembaga pendidikan</p>
      </div>
      <button @click="openAddModal" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle mr-2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        Tambah Lembaga
      </button>
    </div>

    <!-- Error state -->
    <BaseErrorState v-if="error" :message="error" @retry="fetchInstitutions" class="mb-6" />

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
            placeholder="Cari kode atau nama lembaga..." 
            v-model="search"
            @keyup.enter="handleSearch"
            @input="handleSearch"
          >
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <BaseLoading v-if="loading" text="Memuat data lembaga..." class="py-12" />
        
        <BaseEmptyState 
          v-else-if="institutions.length === 0" 
          title="Tidak ada data lembaga ditemukan" 
          description="Coba ubah kata kunci pencarian Anda atau tambah lembaga baru." 
          class="py-12"
        />

        <table v-else class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr class="bg-white">
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Kode</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Nama Lembaga</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tipe</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Gender</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in institutions" :key="item.id" class="hover:bg-slate-50 transition-colors">
              <td class="py-3 px-5">
                <span class="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{{ item.code }}</span>
              </td>
              <td class="py-3 px-5">
                <div class="font-semibold text-slate-800">{{ item.name }}</div>
              </td>
              <td class="py-3 px-5">
                <span class="inline-flex px-2 py-1 rounded text-xs font-medium" :class="getTypeBadgeClass(item.institution_type)">
                  {{ item.institution_type }}
                </span>
              </td>
              <td class="py-3 px-5 text-sm text-slate-600">
                {{ item.gender_scope === 'MALE' ? 'Putra' : item.gender_scope === 'FEMALE' ? 'Putri' : 'Campuran' }}
              </td>
              <td class="py-3 px-5">
                <span v-if="item.is_active" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check mr-1"><path d="M20 6 9 17l-5-5"/></svg>
                  Aktif
                </span>
                <span v-else class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x mr-1"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  Non-aktif
                </span>
              </td>
              <td class="py-3 px-5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                  <button @click="openEditModal(item)" class="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                  </button>
                  <button @click="confirmDelete(item)" class="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form -->
    <BaseModal 
      :open="showModal" 
      :title="modalMode === 'add' ? 'Tambah Lembaga Baru' : 'Edit Data Lembaga'"
      @close="closeModal"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Kode Lembaga <span class="text-red-500">*</span></label>
          <input type="text" v-model="formData.code" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Contoh: SMK-01">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nama Lembaga <span class="text-red-500">*</span></label>
          <input type="text" v-model="formData.name" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Masukkan nama lembaga lengkap">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tipe Institusi <span class="text-red-500">*</span></label>
            <select v-model="formData.institution_type" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="PONDOK">PONDOK</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Cakupan Gender <span class="text-red-500">*</span></label>
            <select v-model="formData.gender_scope" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="MALE">PUTRA</option>
              <option value="FEMALE">PUTRI</option>
              <option value="ALL">CAMPURAN</option>
            </select>
          </div>
        </div>

        <div class="flex items-center mt-4">
          <input type="checkbox" id="isActive" v-model="formData.is_active" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded">
          <label for="isActive" class="ml-2 block text-sm text-slate-700 font-medium">
            Status Aktif
          </label>
        </div>

        <!-- Hidden submit to allow enter to submit -->
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

    <!-- Confirm Modal -->
    <BaseConfirmModal 
      :open="showConfirmModal"
      title="Nonaktifkan Lembaga"
      confirmText="Ya, Nonaktifkan"
      :loading="submitting"
      @close="showConfirmModal = false"
      @confirm="handleDelete"
    >
      Apakah Anda yakin ingin menonaktifkan lembaga <strong>{{ itemToDelete?.name }}</strong>?
    </BaseConfirmModal>
  </div>
</template>
