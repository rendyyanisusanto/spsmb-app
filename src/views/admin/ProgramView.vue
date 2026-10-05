<script setup>
import { ref, onMounted, computed } from 'vue'
import * as programService from '@/services/programService'
import * as institutionService from '@/services/institutionService'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useAuth } from '@/composables/useAuth'

const { user, hasRole } = useAuth()

// DATA
const programs = ref([])
const institutions = ref([])

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
  code: '',
  name: '',
  institutionId: '',
  isActive: true
})

const fetchInstitutions = async () => {
  try {
    const res = await institutionService.getInstitutions()
    if (res.success) {
      if (hasRole('SUPER_ADMIN')) {
        institutions.value = res.data
      } else {
        const allowedIds = user.value?.institutions || []
        institutions.value = res.data.filter(i => allowedIds.includes(i.id))
      }
    }
  } catch (err) {
    console.error(err)
  }
}

const fetchData = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await programService.getPrograms({ search: search.value, limit: 100 })
    if (res.success) {
      programs.value = res.data
    }
  } catch (err) {
    error.value = 'Terjadi kesalahan sistem saat memuat data'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchInstitutions()
  fetchData()
})

const handleSearch = () => {
  fetchData()
}

const openAddModal = () => {
  modalMode.value = 'add'
  formData.value = {
    id: null,
    code: '',
    name: '',
    institutionId: institutions.value.length > 0 ? institutions.value[0].id : '',
    isActive: true
  }
  showModal.value = true
}

const openEditModal = (item) => {
  modalMode.value = 'edit'
  formData.value = {
    id: item.id,
    code: item.code,
    name: item.name,
    institutionId: item.institution?.id || '',
    isActive: item.isActive
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    const payload = {
      code: formData.value.code,
      name: formData.value.name,
      institutionId: formData.value.institutionId,
      isActive: formData.value.isActive
    }
    
    let res;
    if (modalMode.value === 'add') {
      res = await programService.createProgram(payload)
    } else {
      res = await programService.updateProgram(formData.value.id, payload)
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
    await programService.updateProgramStatus(item.id, !item.isActive)
    fetchData()
  } catch (err) {
    alert(err?.response?.data?.message || err?.response?.data?.error || 'Gagal mengubah status')
  }
}

const confirmDelete = (item) => {
  itemToDelete.value = item
  showConfirmModal.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value) return
  try {
    const res = await programService.deleteProgram(itemToDelete.value.id)
    if (res.success) {
      showConfirmModal.value = false
      fetchData()
    }
  } catch (err) {
    alert(err?.response?.data?.message || 'Gagal menghapus data')
  }
}

</script>

<template>
  <div class="program-container">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Program & Jurusan</h1>
        <p class="text-slate-500 m-0">Kelola program studi atau jurusan untuk setiap lembaga.</p>
      </div>
      <button @click="openAddModal" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle mr-2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        Tambah Program
      </button>
    </div>

    <!-- Error state -->
    <BaseErrorState v-if="error" :message="error" @retry="fetchData" class="mb-6" />

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
          v-else-if="programs.length === 0" 
          title="Tidak ada data ditemukan" 
          description="Coba ubah kata kunci pencarian Anda atau tambah data baru." 
          class="py-12"
        />

        <table v-else class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr class="bg-white">
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-24">Kode</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Nama Program</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Lembaga</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in programs" :key="item.id" class="hover:bg-slate-50 transition-colors">
              <td class="py-3 px-5 font-mono text-sm text-slate-600">{{ item.code }}</td>
              <td class="py-3 px-5 font-semibold text-slate-800">{{ item.name }}</td>
              <td class="py-3 px-5 text-sm text-slate-600"><span class="inline-flex px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 font-medium">{{ item.institution?.name }}</span></td>
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
                  <button v-if="hasRole('SUPER_ADMIN')" @click="confirmDelete(item)" class="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors" title="Hapus">
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
      :title="modalMode === 'add' ? 'Tambah Program Baru' : 'Edit Program'"
      @close="closeModal"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Lembaga <span class="text-red-500">*</span></label>
          <select v-model="formData.institutionId" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="" disabled>Pilih Lembaga</option>
            <option v-for="i in institutions" :key="i.id" :value="i.id">{{ i.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Kode Program <span class="text-red-500">*</span></label>
          <input type="text" v-model="formData.code" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Contoh: IPA, IPS, RPL">
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nama Program <span class="text-red-500">*</span></label>
          <input type="text" v-model="formData.name" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Contoh: Ilmu Pengetahuan Alam">
        </div>
        
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

    <!-- Delete Confirmation -->
    <BaseConfirmModal
      :open="showConfirmModal"
      title="Hapus Program"
      :message="`Apakah Anda yakin ingin menghapus program '${itemToDelete?.name}'? Data yang dihapus tidak dapat dikembalikan.`"
      confirmText="Ya, Hapus"
      cancelText="Batal"
      variant="danger"
      @confirm="handleDelete"
      @cancel="showConfirmModal = false"
    />

  </div>
</template>
