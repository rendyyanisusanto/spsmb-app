<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { getTargets } from '@/services/formService'
import { getDocumentTypes, createDocumentType, updateDocumentType, getRequirements, createRequirement, updateRequirementRequired, deleteRequirement, reorderRequirements } from '@/services/documentRequirementService'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const router = useRouter()
const { user, hasRole } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))
const adminInstitution = computed(() => user.value?.institutions?.[0] || null)

// TABS
const activeTab = ref('konfigurasi') // 'konfigurasi' | 'pendaftar'

// FILTER / SCOPE
const availableTargets = ref([])
const selectedTargetId = ref(null)

const activeTarget = computed(() => availableTargets.value.find(t => t.id === selectedTargetId.value))

const canManageCurrentTarget = computed(() => {
  if (!activeTarget.value) return false;
  if (isSuperAdmin.value) return true;
  return activeTarget.value.targetType === 'INSTITUTION' && user.value?.institutions?.some(inst => String(inst.id || inst) === String(activeTarget.value.institution?.id));
})

const fetchConfig = async () => {
  try {
    const tRes = await getTargets()
    availableTargets.value = Array.isArray(tRes) ? tRes : (tRes?.data || [])
    if (availableTargets.value.length > 0 && !selectedTargetId.value) {
      if (isSuperAdmin.value) {
        selectedTargetId.value = availableTargets.value[0].id
      } else {
        const myInst = availableTargets.value.find(t => t.targetType === 'INSTITUTION' && user.value?.institutions?.some(inst => String(inst.id || inst) === String(t.institution?.id)))
        selectedTargetId.value = myInst ? myInst.id : availableTargets.value[0].id
      }
    }
  } catch(err) {
    console.error(err)
  }
}

const handleTargetChange = (val) => {
  selectedTargetId.value = parseInt(val)
  fetchRequirements()
}

// --- STATE: REQUIREMENTS & TYPES ---
const requirements = ref([])
const documentTypes = ref([])
const reqLoading = ref(false)

const fetchRequirements = async () => {
  reqLoading.value = true
  try {
    const res = await getRequirements({ targetId: selectedTargetId.value })
    requirements.value = Array.isArray(res) ? res : (res?.data || [])
  } catch(err) {
    console.error(err)
  }
  reqLoading.value = false
}

const fetchDocumentTypes = async () => {
  try {
    const res = await getDocumentTypes({ status: 1 })
    documentTypes.value = Array.isArray(res) ? res : (res?.data || [])
  } catch(err) {
    console.error(err)
  }
}

onMounted(async () => {
  await fetchConfig()
  await fetchDocumentTypes()
  await fetchRequirements()
})

// MODAL REQUIREMENT
const showReqModal = ref(false)
const modalMode = ref('EXISTING') // EXISTING or NEW (Super Admin only)

const reqForm = ref({
  documentTypeId: null,
  isRequired: true,
  // For NEW
  code: '',
  name: '',
  description: '',
  allowedFileTypes: ['pdf', 'jpg', 'png'],
  maxFileSize: 5
})

const fileTypes = ['pdf', 'jpg', 'jpeg', 'png']
const maxSizes = [2, 5, 10]

const openAddReq = () => {
  if (!canManageCurrentTarget.value) return;
  modalMode.value = 'EXISTING'
  reqForm.value = {
    documentTypeId: documentTypes.value[0]?.id || null,
    isRequired: true,
    code: '',
    name: '',
    description: '',
    allowedFileTypes: ['pdf', 'jpg', 'png'],
    maxFileSize: 5
  }
  showReqModal.value = true
}

const toggleFileType = (type) => {
  const idx = reqForm.value.allowedFileTypes.indexOf(type)
  if (idx !== -1) {
    reqForm.value.allowedFileTypes.splice(idx, 1)
  } else {
    reqForm.value.allowedFileTypes.push(type)
  }
}

const saveRequirement = async () => {
  try {
    reqLoading.value = true
    let docTypeId = reqForm.value.documentTypeId
    
    if (modalMode.value === 'NEW') {
      if (!reqForm.value.name) {
        alert('Nama dokumen wajib diisi')
        return
      }
      let code = reqForm.value.code || reqForm.value.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      code = code.toUpperCase()
      
      const newDocType = await createDocumentType({
        code,
        name: reqForm.value.name,
        description: reqForm.value.description,
        allowedExtensions: reqForm.value.allowedFileTypes,
        maxSizeMb: reqForm.value.maxFileSize,
        isActive: true
      })
      docTypeId = newDocType.data?.id || newDocType.id
      await fetchDocumentTypes()
    }

    if (!docTypeId) {
      alert('Pilih jenis dokumen')
      return
    }

    const sectionReqs = requirements.value
    const maxOrder = sectionReqs.length > 0 ? Math.max(...sectionReqs.map(f => f.sortOrder)) : 0

    await createRequirement({
      formTargetId: selectedTargetId.value,
      documentTypeId: docTypeId,
      isRequired: reqForm.value.isRequired,
      sortOrder: maxOrder + 1
    })

    showReqModal.value = false
    await fetchRequirements()
  } catch(err) {
    alert(err.response?.data?.message || 'Gagal menyimpan persyaratan')
  } finally {
    reqLoading.value = false
  }
}

const toggleRequired = async (req) => {
  try {
    await updateRequirementRequired(req.id, !req.isRequired)
    await fetchRequirements()
  } catch(err) {
    alert(err.response?.data?.message || 'Gagal mengubah status wajib')
  }
}

const showConfirmModal = ref(false)
const reqToDelete = ref(null)

const confirmDeleteReq = (id) => {
  reqToDelete.value = id
  showConfirmModal.value = true
}

const deleteReq = async () => {
  if (!reqToDelete.value) return
  reqLoading.value = true
  try {
    await deleteRequirement(reqToDelete.value)
    await fetchRequirements()
    showConfirmModal.value = false
    reqToDelete.value = null
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menghapus persyaratan')
  } finally {
    reqLoading.value = false
  }
}

const moveReq = async (index, direction) => {
  const arr = requirements.value
  if (direction === 'up' && index > 0) {
    const tempOrder = arr[index].sortOrder
    arr[index].sortOrder = arr[index-1].sortOrder
    arr[index-1].sortOrder = tempOrder
  } else if (direction === 'down' && index < arr.length - 1) {
    const tempOrder = arr[index].sortOrder
    arr[index].sortOrder = arr[index+1].sortOrder
    arr[index+1].sortOrder = tempOrder
  }
  
  try {
    await reorderRequirements(arr.map(a => ({ id: a.id, sortOrder: a.sortOrder })))
    await fetchRequirements()
  } catch(err) {
    alert(err.response?.data?.message || 'Gagal mengubah urutan')
  }
}

const switchToTab = (tab) => {
  activeTab.value = tab
  if (tab === 'konfigurasi') {
    fetchRequirements()
  }
}
</script>

<template>
  <div class="requirements-management pb-20">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Management Persyaratan & Dokumen</h1>
      <p class="text-slate-500 m-0">Atur dokumen yang wajib atau optional dan periksa upload pendaftar.</p>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-6 border-b border-slate-200 mb-6">
      <button 
        @click="switchToTab('konfigurasi')"
        class="pb-3 text-sm font-bold border-b-2 transition-colors px-1"
        :class="activeTab === 'konfigurasi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
      >
        Persyaratan Dokumen
      </button>
      <button 
        @click="switchToTab('pendaftar')"
        class="pb-3 text-sm font-bold border-b-2 transition-colors px-1"
        :class="activeTab === 'pendaftar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
      >
        Dokumen Pendaftar
      </button>
    </div>

    <!-- TAB 1: KONFIGURASI PERSYARATAN -->
    <div v-if="activeTab === 'konfigurasi'" class="space-y-6">
      
      <!-- Filter Card -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-800 mb-1">Konfigurasi Persyaratan</h2>
          <p class="text-xs text-slate-500 m-0">
            Pilih form target untuk melihat persyaratan dokumen.
          </p>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div class="w-full sm:w-80">
            <select 
              v-model="selectedTargetId"
              @change="handleTargetChange($event.target.value)"
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700"
            >
              <option v-for="opt in availableTargets" :key="opt.id" :value="opt.id">{{ opt.name }} ({{ opt.targetType }})</option>
            </select>
          </div>
          
          <button v-if="canManageCurrentTarget" @click="openAddReq" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap inline-flex items-center justify-center gap-2 w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Tambah Persyaratan
          </button>
        </div>
      </div>
      
      <div v-if="!canManageCurrentTarget && activeTarget" class="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-lg flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <div class="text-sm font-medium">Anda hanya memiliki akses <i>Read-Only</i> pada target form ini.</div>
      </div>

      <!-- Table Card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <BaseLoading v-if="reqLoading" text="Memuat persyaratan dokumen..." class="py-12" />
        
        <BaseEmptyState 
          v-else-if="requirements.length === 0" 
          title="Belum ada persyaratan" 
          description="Belum ada persyaratan dokumen di target ini." 
          class="py-12"
        />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th class="p-4 w-16 text-center">Urutan</th>
                <th class="p-4">Nama Dokumen</th>
                <th class="p-4 w-32">Target</th>
                <th class="p-4 w-32">Format</th>
                <th class="p-4 w-24">Required</th>
                <th class="p-4 w-24">Status Master</th>
                <th class="p-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(req, idx) in requirements" :key="req.id" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                <td class="p-4">
                  <div class="flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button v-if="canManageCurrentTarget" @click="moveReq(idx, 'up')" :disabled="idx === 0" class="text-slate-400 hover:text-slate-700 disabled:opacity-20"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg></button>
                    <span class="text-xs font-bold text-slate-700">{{ req.sortOrder }}</span>
                    <button v-if="canManageCurrentTarget" @click="moveReq(idx, 'down')" :disabled="idx === requirements.length - 1" class="text-slate-400 hover:text-slate-700 disabled:opacity-20"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>
                  </div>
                </td>
                <td class="p-4">
                  <p class="font-bold text-slate-800 m-0">{{ req.documentType?.name }}</p>
                  <p class="text-xs text-slate-500 mt-1 line-clamp-1" :title="req.documentType?.description">{{ req.documentType?.description || 'Tidak ada deskripsi' }}</p>
                  <p class="text-[10px] font-mono text-slate-400 mt-1">{{ req.documentType?.code }}</p>
                </td>
                <td class="p-4">
                  <span v-if="req.target?.targetType === 'COMMON'" class="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase tracking-widest">
                    GLOBAL
                  </span>
                  <span v-else-if="req.target?.targetType === 'PONDOK_COMMON'" class="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 uppercase tracking-widest">
                    PONDOK
                  </span>
                  <span v-else class="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 uppercase tracking-widest" :title="req.target?.name">
                    LEMBAGA
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="ext in req.documentType?.allowedExtensions" :key="ext" class="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-bold uppercase rounded">{{ ext }}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 font-semibold">Max: {{ req.documentType?.maxSizeMb }}MB</div>
                </td>
                <td class="p-4">
                  <button v-if="canManageCurrentTarget" @click="toggleRequired(req)" class="hover:bg-slate-100 px-2 py-1 rounded transition-colors -ml-2" title="Klik untuk mengubah">
                    <span v-if="req.isRequired" class="text-xs font-bold text-slate-700">Wajib</span>
                    <span v-else class="text-xs font-semibold text-slate-400">Optional</span>
                  </button>
                  <span v-else>
                    <span v-if="req.isRequired" class="text-xs font-bold text-slate-700">Wajib</span>
                    <span v-else class="text-xs font-semibold text-slate-400">Optional</span>
                  </span>
                </td>
                <td class="p-4">
                  <span v-if="req.documentType?.isActive" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Aktif
                  </span>
                  <span v-else class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <span class="w-2 h-2 rounded-full bg-slate-300"></span> Nonaktif
                  </span>
                </td>
                <td class="p-4 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <template v-if="!canManageCurrentTarget">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded border border-slate-200">Read Only</span>
                    </template>
                    <template v-else>
                      <button @click="confirmDeleteReq(req.id)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Hapus Mapping Requirement">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: DOKUMEN PENDAFTAR -->
    <div v-if="activeTab === 'pendaftar'" class="space-y-6">
      
      <!-- Filter Card -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-800 mb-1">Dokumen Pendaftar</h2>
          <p class="text-xs text-slate-500 m-0">Menu ini akan tersedia pada Sprint 12 (Upload & Verifikasi Dokumen).</p>
        </div>
      </div>

      <!-- Table Card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-slate-300 mb-4"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3 class="text-lg font-bold text-slate-700 mb-2">Segera Hadir</h3>
        <p class="text-slate-500 text-sm max-w-md mx-auto">Fitur pemeriksaan dokumen pendaftar akan dikerjakan pada Backend Sprint 12.</p>
      </div>
    </div>
    
    <!-- MODAL TAMBAH PERSYARATAN -->
    <BaseModal 
      :open="showReqModal" 
      title="Tambah Persyaratan"
      @close="showReqModal = false"
    >
      <div class="space-y-5">
        
        <div class="flex gap-4 p-1 bg-slate-100 rounded-lg">
          <button @click="modalMode = 'EXISTING'" class="flex-1 py-1.5 text-sm font-bold rounded-md transition-colors" :class="modalMode === 'EXISTING' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'">Pilih Master Dokumen</button>
          <button @click="modalMode = 'NEW'" class="flex-1 py-1.5 text-sm font-bold rounded-md transition-colors" :class="modalMode === 'NEW' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'">Buat Master Baru</button>
        </div>
        
        <div v-if="modalMode === 'EXISTING'">
          <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Pilih Jenis Dokumen *</label>
          <select v-model="reqForm.documentTypeId" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800 font-semibold text-slate-700">
            <option :value="null" disabled>Pilih Dokumen...</option>
            <option v-for="doc in documentTypes" :key="doc.id" :value="doc.id">{{ doc.name }} ({{ doc.code }})</option>
          </select>
          <p class="text-xs text-slate-500 mt-2">Hanya master dokumen berstatus aktif yang ditampilkan.</p>
        </div>

        <template v-if="modalMode === 'NEW'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nama Dokumen *</label>
              <input type="text" v-model="reqForm.name" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800" placeholder="Contoh: Kartu Keluarga">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Kode Dokumen</label>
              <input type="text" v-model="reqForm.code" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none font-mono text-slate-700" placeholder="(Otomatis uppercase)">
            </div>
          </div>
          
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Deskripsi / Instruksi</label>
            <textarea v-model="reqForm.description" rows="2" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800" placeholder="Keterangan singkat tentang dokumen ini..."></textarea>
          </div>

          <!-- Format & Size -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Format File Diizinkan</label>
              <div class="flex flex-wrap gap-2">
                <label v-for="ft in fileTypes" :key="ft" class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50 transition-colors" :class="{ 'border-slate-800 ring-1 ring-slate-800 bg-slate-50': reqForm.allowedFileTypes.includes(ft) }">
                  <input type="checkbox" :checked="reqForm.allowedFileTypes.includes(ft)" @change="toggleFileType(ft)" class="sr-only">
                  <span class="text-xs font-bold uppercase" :class="reqForm.allowedFileTypes.includes(ft) ? 'text-slate-800' : 'text-slate-500'">{{ ft }}</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Maksimal Ukuran File</label>
              <select v-model="reqForm.maxFileSize" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
                <option v-for="sz in maxSizes" :key="sz" :value="sz">{{ sz }} MB</option>
              </select>
            </div>
          </div>
        </template>

        <div class="p-4 bg-slate-50 border border-slate-100 rounded-xl mt-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="reqForm.isRequired" class="w-4 h-4 rounded text-slate-800 focus:ring-slate-800">
            <span class="text-sm font-bold text-slate-700">Wajib Diupload (Required) untuk target ini</span>
          </label>
        </div>

      </div>
      
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showReqModal = false" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Batal</button>
          <button @click="saveRequirement" class="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm transition-colors" :disabled="reqLoading">Simpan</button>
        </div>
      </template>
    </BaseModal>

    <!-- Confirm Modal -->
    <BaseConfirmModal 
      :open="showConfirmModal"
      title="Hapus Persyaratan"
      confirmText="Ya, Hapus"
      :loading="reqLoading"
      @close="showConfirmModal = false"
      @confirm="deleteReq"
    >
      Apakah Anda yakin ingin menghapus persyaratan ini dari form target?
    </BaseConfirmModal>

  </div>
</template>
