<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  getAdmissionFilters,
  getAdmissionRequirements,
  createAdmissionRequirement,
  updateAdmissionRequirement,
  deleteAdmissionRequirement
} from '@/services/admissionService'

import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileCheck,
  CheckCircle2,
  XCircle,
  Building2,
  UploadCloud,
  FileText,
  CreditCard,
  Package,
  Layers,
  HelpCircle,
  AlertTriangle
} from 'lucide-vue-next'

const router = useRouter()
const { user, hasRole } = useAuth()

// Role check
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
const institutions = ref([])
const selectedInstitutionId = ref('')
const requirements = ref([])

// Form Modal State
const isFormModalOpen = ref(false)
const isEditMode = ref(false)
const submitting = ref(false)
const formError = ref('')
const currentForm = ref({
  id: null,
  institution_id: '',
  name: '',
  description: '',
  requirement_type: 'DOCUMENT',
  is_required: true,
  requires_upload: true,
  sort_order: 1,
  is_active: true
})

// Delete Modal State
const isDeleteModalOpen = ref(false)
const deleting = ref(false)
const itemToDelete = ref(null)

// Toast message
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3500)
}

// Requirement Type Labels & Badges
const typeMeta = {
  DOCUMENT: { label: 'Dokumen', class: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
  PAYMENT: { label: 'Pembayaran', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CreditCard },
  EQUIPMENT: { label: 'Perlengkapan', class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Package },
  ADMINISTRATION: { label: 'Administrasi', class: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Layers },
  OTHER: { label: 'Lainnya', class: 'bg-slate-100 text-slate-700 border-slate-200', icon: HelpCircle }
}

const loadInstitutions = async () => {
  try {
    const res = await getAdmissionFilters()
    institutions.value = res.institutions || []
    if (institutions.value.length > 0) {
      selectedInstitutionId.value = String(institutions.value[0].id)
    }
  } catch (err) {
    console.error('Failed to load institutions:', err)
  }
}

const loadRequirements = async () => {
  if (!selectedInstitutionId.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await getAdmissionRequirements({
      institutionId: selectedInstitutionId.value
    })
    requirements.value = res || []
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Gagal memuat komponen kelengkapan'
  } finally {
    loading.value = false
  }
}

watch(selectedInstitutionId, () => {
  loadRequirements()
})

// Modal Openers
const openAddModal = () => {
  isEditMode.value = false
  formError.value = ''
  currentForm.value = {
    id: null,
    institution_id: selectedInstitutionId.value,
    name: '',
    description: '',
    requirement_type: 'DOCUMENT',
    is_required: true,
    requires_upload: true,
    sort_order: requirements.value.length + 1,
    is_active: true
  }
  isFormModalOpen.value = true
}

const openEditModal = (item) => {
  isEditMode.value = true
  formError.value = ''
  currentForm.value = {
    id: item.id,
    institution_id: item.institutionId,
    name: item.name,
    description: item.description || '',
    requirement_type: item.requirementType,
    is_required: item.isRequired,
    requires_upload: item.requiresUpload,
    sort_order: item.sortOrder,
    is_active: item.isActive
  }
  isFormModalOpen.value = true
}

const submitForm = async () => {
  if (!currentForm.value.name.trim()) {
    formError.value = 'Nama komponen wajib diisi.'
    return
  }

  submitting.value = true
  formError.value = ''
  try {
    if (isEditMode.value) {
      await updateAdmissionRequirement(currentForm.value.id, currentForm.value)
      showToast('Komponen kelengkapan berhasil diperbarui!')
    } else {
      await createAdmissionRequirement(currentForm.value)
      showToast('Komponen kelengkapan baru berhasil ditambahkan!')
    }
    isFormModalOpen.value = false
    await loadRequirements()
  } catch (err) {
    formError.value = err.response?.data?.message || err.message || 'Gagal menyimpan komponen'
  } finally {
    submitting.value = false
  }
}

// Delete / Deactivate
const openDeleteModal = (item) => {
  itemToDelete.value = item
  isDeleteModalOpen.value = true
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    const res = await deleteAdmissionRequirement(itemToDelete.value.id)
    if (res.softDeleted) {
      showToast('Komponen dinonaktifkan karena sudah memiliki riwayat pendaftar.', 'success')
    } else {
      showToast('Komponen berhasil dihapus permanen.', 'success')
    }
    isDeleteModalOpen.value = false
    await loadRequirements()
  } catch (err) {
    showToast(err.response?.data?.message || err.message || 'Gagal menghapus komponen', 'error')
  } finally {
    deleting.value = false
  }
}

const goBack = () => {
  router.push('/admin/kelengkapan-pendaftar')
}

onMounted(async () => {
  await loadInstitutions()
  await loadRequirements()
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Toast -->
    <div
      v-if="toast.show"
      class="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold"
      :class="toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'"
    >
      <span>{{ toast.message }}</span>
    </div>

    <!-- Header Navigation -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <button
          @click="goBack"
          class="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck class="w-6 h-6 text-emerald-600" />
            Master Komponen Kelengkapan
          </h1>
          <p class="text-xs sm:text-sm text-slate-500">
            Konfigurasi komponen berkas, pembayaran, dan administrasi dinamis per lembaga.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton
          @click="openAddModal"
          variant="primary"
          size="sm"
          class="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus class="w-4 h-4 mr-1.5" />
          Tambah Komponen
        </BaseButton>
      </div>
    </div>

    <!-- Information Box -->
    <div class="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 text-xs text-blue-800 leading-relaxed flex items-start gap-3">
      <Building2 class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      <div>
        <p class="font-bold mb-0.5">Konfigurasi Dinamis per Lembaga</p>
        <p class="text-blue-700/90">
          Setiap lembaga (SMK, SMA, SMP, SD, Pondok) memiliki daftar persyaratan kelengkapan yang independen. Menonaktifkan master komponen tidak akan menghilangkan catatan kelengkapan calon siswa yang sudah ada sebelumnya.
        </p>
      </div>
    </div>

    <!-- Lembaga Selector Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
        <Building2 class="w-4 h-4 text-emerald-600" />
        <span>Pilih Lembaga Tujuan:</span>
      </div>

      <div class="w-full sm:w-72">
        <select
          v-model="selectedInstitutionId"
          :disabled="!canChooseInstitution"
          class="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
        >
          <option
            v-for="inst in institutions"
            :key="inst.id"
            :value="String(inst.id)"
          >
            {{ inst.name }} ({{ inst.code }})
          </option>
        </select>
      </div>
    </div>

    <!-- Error State -->
    <BaseErrorState
      v-if="error"
      :message="error"
      @retry="loadRequirements"
    />

    <!-- Loading Skeleton -->
    <div v-if="loading" class="py-16 text-center">
      <BaseLoading message="Memuat master komponen kelengkapan..." />
    </div>

    <!-- Components Table / Cards -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-800">
          Daftar Komponen Kelengkapan ({{ requirements.length }})
        </h3>
      </div>

      <BaseEmptyState
        v-if="requirements.length === 0"
        title="Belum ada komponen kelengkapan"
        description="Klik tombol Tambah Komponen untuk membuat komponen persyaratan baru untuk lembaga ini."
        class="py-12"
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <th class="py-3 px-3 text-center w-14">Urutan</th>
              <th class="py-3 px-4">Nama Komponen</th>
              <th class="py-3 px-3">Jenis</th>
              <th class="py-3 px-3 text-center">Sifat</th>
              <th class="py-3 px-3 text-center">Upload Berkas</th>
              <th class="py-3 px-3 text-center">Status</th>
              <th class="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in requirements"
              :key="r.id"
              class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
              :class="{ 'opacity-60 bg-slate-50/40': !r.isActive }"
            >
              <!-- Sort Order -->
              <td class="py-3 px-3 text-center font-mono font-bold text-slate-600">
                #{{ r.sortOrder }}
              </td>

              <!-- Name & Description -->
              <td class="py-3 px-4">
                <div class="font-bold text-slate-800">{{ r.name }}</div>
                <div v-if="r.description" class="text-[11px] text-slate-400 mt-0.5">
                  {{ r.description }}
                </div>
              </td>

              <!-- Type -->
              <td class="py-3 px-3">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  :class="typeMeta[r.requirementType]?.class || 'bg-slate-100 text-slate-700'"
                >
                  <component :is="typeMeta[r.requirementType]?.icon" class="w-3 h-3" />
                  {{ typeMeta[r.requirementType]?.label || r.requirementType }}
                </span>
              </td>

              <!-- Required / Optional -->
              <td class="py-3 px-3 text-center">
                <span
                  class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                  :class="r.isRequired ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'"
                >
                  {{ r.isRequired ? 'WAJIB' : 'OPSIONAL' }}
                </span>
              </td>

              <!-- Requires Upload -->
              <td class="py-3 px-3 text-center">
                <span
                  v-if="r.requiresUpload"
                  class="inline-flex items-center gap-1 text-[10px] text-blue-700 font-semibold"
                >
                  <UploadCloud class="w-3.5 h-3.5 text-blue-600" />
                  Perlu File
                </span>
                <span v-else class="text-[10px] text-slate-400">
                  Tidak Perlu
                </span>
              </td>

              <!-- Active Status -->
              <td class="py-3 px-3 text-center">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="r.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'"
                >
                  <CheckCircle2 v-if="r.isActive" class="w-3 h-3" />
                  <XCircle v-else class="w-3 h-3" />
                  {{ r.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    @click="openEditModal(r)"
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Edit Komponen"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="openDeleteModal(r)"
                    class="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Hapus / Nonaktifkan"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL FORM TAMBAH / EDIT KOMPONEN          -->
    <!-- ========================================== -->
    <BaseModal
      :open="isFormModalOpen"
      :title="isEditMode ? 'Edit Komponen Kelengkapan' : 'Tambah Komponen Kelengkapan Baru'"
      size="md"
      @close="isFormModalOpen = false"
    >
      <div class="space-y-4">
        <div v-if="formError" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {{ formError }}
        </div>

        <div>
          <BaseInput
            v-model="currentForm.name"
            label="Nama Komponen *"
            placeholder="Contoh: Pembayaran Daftar Ulang, Akta Kelahiran, Seragam..."
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Jenis Komponen</label>
          <select
            v-model="currentForm.requirement_type"
            class="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            <option value="DOCUMENT">Dokumen (Akta, KK, KTP, Ijazah, dll.)</option>
            <option value="PAYMENT">Pembayaran (Daftar Ulang, Biaya Gedung, dll.)</option>
            <option value="EQUIPMENT">Perlengkapan (Seragam, Atribut, dll.)</option>
            <option value="ADMINISTRATION">Administrasi (Surat Pernyataan, Form Fisik, dll.)</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>

        <div>
          <BaseTextarea
            v-model="currentForm.description"
            label="Keterangan / Petunjuk (Opsional)"
            placeholder="Jelaskan ketentuan format berkas atau tata cara penyelesaian komponen ini..."
            rows="2"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <!-- Wajib / Opsional -->
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-slate-800">Sifat Komponen</div>
              <div class="text-[10px] text-slate-500">Apakah harus dipenuhi?</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="currentForm.is_required" class="sr-only peer" />
              <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <!-- Memerlukan Upload File -->
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-slate-800">Upload Berkas</div>
              <div class="text-[10px] text-slate-500">Perlu unggah file lampiran?</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="currentForm.requires_upload" class="sr-only peer" />
              <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Nomor Urutan</label>
            <input
              type="number"
              v-model="currentForm.sort_order"
              min="1"
              class="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Status Komponen</label>
            <select
              v-model="currentForm.is_active"
              class="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option :value="true">Aktif</option>
              <option :value="false">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2.5">
          <BaseButton
            type="button"
            variant="outline"
            @click="isFormModalOpen = false"
            :disabled="submitting"
          >
            Batal
          </BaseButton>

          <BaseButton
            type="button"
            variant="primary"
            :loading="submitting"
            @click="submitForm"
            class="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {{ isEditMode ? 'Simpan Perubahan' : 'Tambahkan Komponen' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ========================================== -->
    <!-- MODAL KONFIRMASI HAPUS                     -->
    <!-- ========================================== -->
    <BaseModal
      :open="isDeleteModalOpen"
      title="Hapus / Nonaktifkan Komponen"
      size="sm"
      @close="isDeleteModalOpen = false"
    >
      <div v-if="itemToDelete" class="space-y-3 text-xs text-slate-600">
        <p>
          Anda akan menghapus komponen <strong>{{ itemToDelete.name }}</strong>.
        </p>
        <p class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          Jika komponen ini sudah pernah diselesaikan oleh calon siswa, sistem akan menonaktifkannya secara aman agar data lampiran dan riwayat pendaftar tidak hilang.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <BaseButton
            variant="outline"
            @click="isDeleteModalOpen = false"
            :disabled="deleting"
          >
            Batal
          </BaseButton>
          <BaseButton
            variant="danger"
            :loading="deleting"
            @click="confirmDelete"
          >
            Ya, Lanjutkan
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

