<script setup>
import { ref, computed, onMounted } from 'vue'
import * as institutionService from '@/services/institutionService'
import { useAuth } from '@/composables/useAuth'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const { user, hasRole } = useAuth()
const isSuperAdmin = computed(() => {
  return user.value?.primaryRole === 'SUPER_ADMIN' || 
         user.value?.role === 'SUPER_ADMIN' || 
         hasRole('SUPER_ADMIN')
})

const institutions = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')

const showModal = ref(false)
const modalMode = ref('add') // 'add' or 'edit'
const submitting = ref(false)

const showConfirmModal = ref(false)
const itemToDelete = ref(null)

// Preview modal for Kop/Logo full size
const previewModal = ref({
  open: false,
  url: '',
  title: ''
})

// File upload states
const logoFile = ref(null)
const kopFile = ref(null)
const logoPreview = ref('')
const kopPreview = ref('')
const deleteLogo = ref(false)
const deleteKop = ref(false)
const logoInputRef = ref(null)
const kopInputRef = ref(null)

const formData = ref({
  id: null,
  code: '',
  name: '',
  institution_type: 'SMP',
  gender_scope: 'ALL',
  is_active: true
})

const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '')
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`
}

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
  logoFile.value = null
  kopFile.value = null
  logoPreview.value = ''
  kopPreview.value = ''
  deleteLogo.value = false
  deleteKop.value = false
  showModal.value = true
}

const openEditModal = (item) => {
  modalMode.value = 'edit'
  formData.value = {
    id: item.id,
    code: item.code,
    name: item.name,
    institution_type: item.institution_type,
    gender_scope: item.gender_scope || 'ALL',
    is_active: !!item.is_active
  }
  logoFile.value = null
  kopFile.value = null
  deleteLogo.value = false
  deleteKop.value = false
  logoPreview.value = item.logo_url ? getImageUrl(item.logo_url) : ''
  kopPreview.value = item.kop_url ? getImageUrl(item.kop_url) : ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleLogoChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('Hanya file gambar (PNG, JPG, WebP) yang diperbolehkan.')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('Ukuran file logo maksimal 2MB.')
    return
  }
  logoFile.value = file
  deleteLogo.value = false
  logoPreview.value = URL.createObjectURL(file)
}

const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = ''
  deleteLogo.value = true
  if (logoInputRef.value) logoInputRef.value.value = ''
}

const handleKopChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('Hanya file gambar (PNG, JPG, WebP) yang diperbolehkan.')
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    alert('Ukuran file kop surat maksimal 3MB.')
    return
  }
  kopFile.value = file
  deleteKop.value = false
  kopPreview.value = URL.createObjectURL(file)
}

const removeKop = () => {
  kopFile.value = null
  kopPreview.value = ''
  deleteKop.value = true
  if (kopInputRef.value) kopInputRef.value.value = ''
}

const openImagePreview = (url, title) => {
  if (!url) return
  previewModal.value = {
    open: true,
    url: getImageUrl(url),
    title: title || 'Pratinjau Gambar'
  }
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    let res
    const payload = new FormData()
    payload.append('name', formData.value.name.trim())
    
    // Only send code and institution_type if Super Admin or add mode
    if (isSuperAdmin.value || modalMode.value === 'add') {
      payload.append('code', formData.value.code.trim())
      payload.append('institution_type', formData.value.institution_type)
    }
    
    payload.append('gender_scope', formData.value.gender_scope)
    payload.append('is_active', formData.value.is_active ? '1' : '0')

    // Append file or delete flags
    if (logoFile.value) {
      payload.append('logo', logoFile.value)
    } else if (deleteLogo.value) {
      payload.append('delete_logo', 'true')
    }

    if (kopFile.value) {
      payload.append('kop', kopFile.value)
    } else if (deleteKop.value) {
      payload.append('delete_kop', 'true')
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
      alert(res.error || res.message || 'Gagal menyimpan data lembaga')
    }
  } catch (err) {
    alert(err.message || 'Terjadi kesalahan sistem saat menyimpan')
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
      alert(res.error || res.message || 'Gagal menonaktifkan data')
    }
  } catch (err) {
    alert('Terjadi kesalahan sistem saat menonaktifkan')
  } finally {
    submitting.value = false
  }
}

const getTypeBadgeClass = (type) => {
  const classes = {
    'PONDOK': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'SMP': 'bg-blue-100 text-blue-700 border-blue-200',
    'SMA': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'SMK': 'bg-amber-100 text-amber-700 border-amber-200'
  }
  return classes[type] || 'bg-slate-100 text-slate-700 border-slate-200'
}
</script>

<template>
  <div class="institution-container">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Manajemen Lembaga</h1>
        <p class="text-slate-500 m-0">Kelola data lembaga pendidikan, logo, dan kop surat resmi</p>
      </div>
      <button 
        v-if="isSuperAdmin"
        @click="openAddModal" 
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center"
      >
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
          description="Coba ubah kata kunci pencarian Anda atau hubungi Super Admin." 
          class="py-12"
        />

        <table v-else class="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr class="bg-white border-b border-slate-200">
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">Logo</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Lembaga</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipe</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kop Surat</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in institutions" :key="item.id" class="hover:bg-slate-50 transition-colors">
              <!-- Logo Thumbnail -->
              <td class="py-3 px-5 text-center">
                <div class="flex items-center justify-center">
                  <div 
                    v-if="item.logo_url"
                    @click="openImagePreview(item.logo_url, `Logo - ${item.name}`)"
                    class="w-10 h-10 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group relative"
                    title="Klik untuk perbesar logo"
                  >
                    <img :src="getImageUrl(item.logo_url)" alt="Logo" class="max-w-full max-h-full object-contain">
                  </div>
                  <div 
                    v-else 
                    class="w-10 h-10 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300"
                    title="Logo default / belum diset"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  </div>
                </div>
              </td>

              <!-- Kode -->
              <td class="py-3 px-5">
                <span class="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">{{ item.code }}</span>
              </td>

              <!-- Nama Lembaga -->
              <td class="py-3 px-5">
                <div class="font-bold text-slate-800">{{ item.name }}</div>
              </td>

              <!-- Tipe -->
              <td class="py-3 px-5">
                <span class="inline-flex px-2 py-0.5 rounded text-xs font-semibold border" :class="getTypeBadgeClass(item.institution_type)">
                  {{ item.institution_type }}
                </span>
              </td>

              <!-- Gender -->
              <td class="py-3 px-5 text-sm text-slate-600">
                {{ item.gender_scope === 'MALE' ? 'Putra' : item.gender_scope === 'FEMALE' ? 'Putri' : 'Campuran' }}
              </td>

              <!-- Kop Surat Badge -->
              <td class="py-3 px-5">
                <div v-if="item.kop_url" class="flex items-center gap-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1 text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
                    Custom Kop
                  </span>
                  <button 
                    @click="openImagePreview(item.kop_url, `Kop Surat - ${item.name}`)"
                    class="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                    title="Lihat Pratinjau Kop Surat"
                  >
                    Lihat
                  </button>
                </div>
                <div v-else>
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200" title="Menggunakan template kop standar otomatis">
                    Default Standar
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="py-3 px-5">
                <span v-if="item.is_active" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><path d="M20 6 9 17l-5-5"/></svg>
                  Aktif
                </span>
                <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  Non-aktif
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-5 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                  <button 
                    @click="openEditModal(item)" 
                    class="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" 
                    title="Edit Lembaga, Logo & Kop Surat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                  </button>
                  <button 
                    v-if="isSuperAdmin"
                    @click="confirmDelete(item)" 
                    class="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" 
                    title="Nonaktifkan Lembaga"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit Lembaga & Kop) -->
    <BaseModal 
      :open="showModal" 
      :title="modalMode === 'add' ? 'Tambah Lembaga Baru' : 'Edit Lembaga, Logo & Kop Surat'"
      @close="closeModal"
    >
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Section: Data Utama Lembaga -->
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Kode Lembaga <span class="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                v-model="formData.code" 
                :disabled="!isSuperAdmin && modalMode === 'edit'"
                required 
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" 
                placeholder="Contoh: SMK-01"
              >
              <p v-if="!isSuperAdmin && modalMode === 'edit'" class="text-[11px] text-slate-400 mt-1">
                Kode hanya dapat diubah oleh Super Admin.
              </p>
            </div>
            
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Tipe Institusi <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="formData.institution_type" 
                :disabled="!isSuperAdmin && modalMode === 'edit'"
                required 
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="PONDOK">PONDOK</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
                <option value="SMK">SMK</option>
              </select>
            </div>
          </div>
          
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Nama Lembaga <span class="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              v-model="formData.name" 
              required 
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
              placeholder="Masukkan nama resmi lembaga"
            >
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Cakupan Gender <span class="text-red-500">*</span>
              </label>
              <select 
                v-model="formData.gender_scope" 
                required 
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">CAMPURAN (Putra & Putri)</option>
                <option value="MALE">KHUSUS PUTRA</option>
                <option value="FEMALE">KHUSUS PUTRI</option>
              </select>
            </div>

            <div class="pt-4 sm:pt-6">
              <label class="inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  v-model="formData.is_active" 
                  :disabled="!isSuperAdmin"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded disabled:opacity-50"
                >
                <span class="ml-2 text-sm text-slate-700 font-medium">Status Lembaga Aktif</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Section: Identitas Dokumen & Cetak (Logo & Kop Surat) -->
        <div class="border-t border-slate-200 pt-5 space-y-4">
          <div class="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <div class="text-xs text-blue-800 leading-relaxed">
              <strong>Pengaturan Kop & Logo Cetak:</strong> Logo dan Kop Surat ini akan otomatis digunakan saat mencetak <em>Struk Bukti Pendaftaran</em> dan <em>Formulir Pendaftaran Lengkap</em>. Jika tidak diunggah, sistem akan menggunakan kop standar bawaan aplikasi.
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 1. Logo Lembaga -->
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Logo Lembaga</label>
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    <img v-if="logoPreview" :src="logoPreview" alt="Preview Logo" class="max-w-full max-h-full object-contain p-1">
                    <div v-else class="text-center text-slate-400 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto mb-0.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      <span class="text-[10px] block leading-tight">Belum ada</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <input 
                      type="file" 
                      ref="logoInputRef" 
                      accept="image/png,image/jpeg,image/webp" 
                      class="hidden" 
                      @change="handleLogoChange"
                    >
                    <div class="flex flex-wrap gap-2">
                      <button 
                        type="button" 
                        @click="logoInputRef?.click()" 
                        class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        {{ logoPreview ? 'Ganti Logo' : 'Upload Logo' }}
                      </button>
                      <button 
                        v-if="logoPreview" 
                        type="button" 
                        @click="removeLogo" 
                        class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
                        title="Hapus Logo"
                      >
                        Hapus
                      </button>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-2 mb-0 leading-tight">
                      PNG/JPG (maks. 2MB). Rasio 1:1 transparan disarankan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Kop Surat Lembaga (Banner) -->
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Kop Surat (Header Banner)</label>
                <div class="w-full h-20 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden mb-3">
                  <img v-if="kopPreview" :src="kopPreview" alt="Preview Kop" class="w-full h-full object-contain p-1">
                  <div v-else class="text-center text-slate-400 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto mb-0.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/></svg>
                    <span class="text-[10px] block leading-tight">Kop Default Standar (Belum ada banner custom)</span>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <input 
                    type="file" 
                    ref="kopInputRef" 
                    accept="image/png,image/jpeg,image/webp" 
                    class="hidden" 
                    @change="handleKopChange"
                  >
                  <div class="flex gap-2">
                    <button 
                      type="button" 
                      @click="kopInputRef?.click()" 
                      class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      {{ kopPreview ? 'Ganti Banner Kop' : 'Upload Banner Kop' }}
                    </button>
                    <button 
                      v-if="kopPreview" 
                      type="button" 
                      @click="removeKop" 
                      class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
                      title="Hapus Kop Surat"
                    >
                      Hapus
                    </button>
                  </div>
                  <span class="text-[11px] text-slate-500 leading-tight">
                    Format horizontal (Maks. 3MB)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hidden submit to allow enter to submit -->
        <button type="submit" class="hidden"></button>
      </form>
      
      <template #footer>
        <div class="flex justify-end space-x-2">
          <button 
            type="button" 
            @click="closeModal" 
            class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors" 
            :disabled="submitting"
          >
            Batal
          </button>
          <button 
            type="button" 
            @click="handleSubmit" 
            class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm" 
            :disabled="submitting"
          >
            <svg v-if="submitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ submitting ? 'Menyimpan...' : 'Simpan Data Lembaga' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Pratinjau Gambar Penuh -->
    <BaseModal
      :open="previewModal.open"
      :title="previewModal.title"
      @close="previewModal.open = false"
    >
      <div class="p-2 flex items-center justify-center bg-slate-900/5 rounded-xl">
        <img :src="previewModal.url" alt="Preview Full" class="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm">
      </div>
      <template #footer>
        <div class="flex justify-end">
          <button 
            type="button" 
            @click="previewModal.open = false" 
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- Confirm Modal Nonaktifkan -->
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
