<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import {
  getCrmTemplates,
  getCrmTemplate,
  createCrmTemplate,
  updateCrmTemplate,
  toggleCrmTemplateStatus,
  deleteCrmTemplate,
  getCrmTemplateCategories,
  getCrmTemplatePlaceholders,
  previewCrmTemplate
} from '@/services/crmTemplateService'
import { getInstitutions } from '@/services/institutionService'
import {
  CRM_TEMPLATE_CATEGORIES,
  CRM_TEMPLATE_CATEGORY_LABELS,
  CRM_TEMPLATE_CATEGORY_BADGES
} from '@/constants/crmTemplate'
import { formatDate } from '@/utils/date'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'

import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  HelpCircle,
  Building2,
  Globe,
  CheckCircle,
  XCircle,
  Tag,
  Copy,
  Send,
  Info
} from 'lucide-vue-next'

const { user, hasRole } = useAuth()

// State
const templates = ref([])
const loading = ref(false)
const error = ref('')
const totalItems = ref(0)
const totalPages = ref(1)

// Lookups
const categories = ref([])
const placeholders = ref([])
const institutions = ref([])

// Toast
const notification = ref({ show: false, type: 'success', message: '' })
const showToast = (message, type = 'success') => {
  notification.value = { show: true, type, message }
  setTimeout(() => {
    notification.value.show = false
  }, 4000)
}

// Filters & Query
const queryParams = ref({
  page: 1,
  limit: 10,
  search: '',
  institutionId: '',
  eventKey: '',
  isActive: ''
})

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

const userInstitution = computed(() => {
  const insts = user.value?.institutions || []
  return insts.length > 0 ? (typeof insts[0] === 'object' ? insts[0] : null) : null
})

// Modals
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isPreviewModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isForkMode = ref(false)
const submitting = ref(false)

const templateForm = ref({
  id: null,
  institution_id: '',
  name: '',
  event_key: 'INTRO',
  message_body: '',
  is_active: true
})

const templateToDelete = ref(null)
const previewData = ref({
  title: '',
  renderedText: '',
  usedVariables: [],
  missingVariables: []
})

// Permissions helpers
const isGlobal = (tpl) => !tpl.institutionId && !tpl.institution

const canManage = (tpl) => {
  if (isSuperAdmin.value) return true
  if (isGlobal(tpl)) return false
  if (!tpl.institutionId) return false
  const userInsts = user.value?.institutions || []
  return userInsts.some(i => Number(typeof i === 'object' ? i.id : i) === Number(tpl.institutionId))
}

// Fetch templates
const fetchTemplates = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: queryParams.value.page,
      limit: queryParams.value.limit,
      search: queryParams.value.search ? queryParams.value.search.trim() : undefined,
      institutionId: queryParams.value.institutionId || undefined,
      eventKey: queryParams.value.eventKey || undefined,
      isActive: queryParams.value.isActive !== '' ? queryParams.value.isActive : undefined
    }

    const response = await getCrmTemplates(params)
    templates.value = response.data || []
    if (response.meta) {
      totalItems.value = response.meta.total || 0
      totalPages.value = response.meta.totalPages || 1
    }
  } catch (err) {
    error.value = err.message || 'Gagal memuat template WhatsApp CRM.'
  } finally {
    loading.value = false
  }
}

// Load lookups
const loadLookups = async () => {
  try {
    const [cats, plhs, insts] = await Promise.all([
      getCrmTemplateCategories().catch(() => []),
      getCrmTemplatePlaceholders().catch(() => []),
      getInstitutions().catch(() => ({ data: [] }))
    ])
    categories.value = cats || []
    placeholders.value = plhs || []
    institutions.value = insts.data || insts || []

    // If school admin, lock institutionId in query
    if (!canChooseInstitution.value && userInstitution.value) {
      queryParams.value.institutionId = String(userInstitution.value.id)
    }
  } catch (e) {
    console.error(e)
  }
}

const handleSearch = () => {
  queryParams.value.page = 1
  fetchTemplates()
}

const resetFilter = () => {
  queryParams.value.search = ''
  queryParams.value.eventKey = ''
  queryParams.value.isActive = ''
  if (canChooseInstitution.value) {
    queryParams.value.institutionId = ''
  }
  queryParams.value.page = 1
  fetchTemplates()
}

// Create Template Modal
const openCreateModal = () => {
  isForkMode.value = false
  templateForm.value = {
    id: null,
    institution_id: canChooseInstitution.value ? '' : (userInstitution.value?.id || ''),
    name: '',
    event_key: 'INTRO',
    message_body: '',
    is_active: true
  }
  isCreateModalOpen.value = true
}

// Fork / Salin Template Global ke Lembaga
const openForkModal = (tpl) => {
  isForkMode.value = true
  isEditModalOpen.value = false
  const instName = userInstitution.value?.name || userInstitution.value?.code || ''
  templateForm.value = {
    id: null,
    institution_id: canChooseInstitution.value
      ? (institutions.value[0]?.id ? String(institutions.value[0].id) : (userInstitution.value?.id || ''))
      : (userInstitution.value?.id || ''),
    name: instName ? `${tpl.name} (${instName})` : `${tpl.name} (Khusus)`,
    event_key: tpl.eventKey,
    message_body: tpl.messageBody,
    is_active: true
  }
  isCreateModalOpen.value = true
}

// Edit Template Modal
const openEditModal = (tpl) => {
  if (!canManage(tpl)) {
    // Jika admin lembaga mengklik edit pada template global, alihkan ke mode salin/sesuaikan
    openForkModal(tpl)
    return
  }
  isForkMode.value = false
  templateForm.value = {
    id: tpl.id,
    institution_id: tpl.institutionId ? String(tpl.institutionId) : '',
    name: tpl.name,
    event_key: tpl.eventKey,
    message_body: tpl.messageBody,
    is_active: tpl.isActive
  }
  isEditModalOpen.value = true
}

// Insert variable into message_body
const insertVariable = (variableKey) => {
  const token = `{{${variableKey}}}`
  templateForm.value.message_body += ` ${token} `
}

const formatVar = (key) => '{{' + key + '}}'

// Save Create / Edit / Fork
const submitSaveTemplate = async (isEditing = false) => {
  if (!templateForm.value.name.trim()) {
    showToast('Nama template wajib diisi', 'error')
    return
  }
  if (!templateForm.value.message_body.trim()) {
    showToast('Isi pesan template wajib diisi', 'error')
    return
  }

  submitting.value = true
  try {
    let targetInstId = templateForm.value.institution_id ? Number(templateForm.value.institution_id) : null

    // Non-superadmin cannot create or edit global templates
    if (targetInstId === null && !isSuperAdmin.value) {
      if (userInstitution.value?.id) {
        targetInstId = Number(userInstitution.value.id)
      } else if (institutions.value.length > 0) {
        targetInstId = Number(institutions.value[0].id)
      }
    }

    const payload = {
      institution_id: targetInstId,
      name: templateForm.value.name.trim(),
      event_key: templateForm.value.event_key,
      message_body: templateForm.value.message_body.trim(),
      is_active: templateForm.value.is_active ? 1 : 0
    }

    if (isEditing && !isForkMode.value) {
      await updateCrmTemplate(templateForm.value.id, payload)
      showToast('Template berhasil diperbarui')
      isEditModalOpen.value = false
    } else {
      await createCrmTemplate(payload)
      showToast(isForkMode.value ? 'Template berhasil dibuat khusus untuk lembaga Anda' : 'Template berhasil dibuat')
      isCreateModalOpen.value = false
      isForkMode.value = false
    }

    fetchTemplates()
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan template', 'error')
  } finally {
    submitting.value = false
  }
}

// Toggle Status Active
const handleToggleStatus = async (tpl) => {
  if (!canManage(tpl)) {
    showToast('Status template global hanya dapat diubah oleh Super Admin', 'error')
    return
  }
  try {
    const newStatus = !tpl.isActive
    await toggleCrmTemplateStatus(tpl.id, newStatus)
    tpl.isActive = newStatus
    showToast(`Template berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`)
  } catch (err) {
    showToast(err.message || 'Gagal mengubah status template', 'error')
  }
}

// Test / Preview Format
const handlePreviewTest = async (text, title = 'Uji Format Template') => {
  try {
    const result = await previewCrmTemplate(text)
    previewData.value = {
      title,
      renderedText: result.renderedText,
      usedVariables: result.usedVariables || [],
      missingVariables: result.missingVariables || []
    }
    isPreviewModalOpen.value = true
  } catch (err) {
    showToast(err.message || 'Gagal menguji format pesan', 'error')
  }
}

// Delete Modal
const openDeleteModal = (tpl) => {
  templateToDelete.value = tpl
  isDeleteModalOpen.value = true
}

const confirmDelete = async () => {
  if (!templateToDelete.value) return
  submitting.value = true
  try {
    await deleteCrmTemplate(templateToDelete.value.id)
    showToast('Template berhasil dihapus')
    isDeleteModalOpen.value = false
    templateToDelete.value = null
    fetchTemplates()
  } catch (err) {
    showToast(err.message || 'Gagal menghapus template', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await fetchTemplates()
})
</script>

<template>
  <div class="space-y-6">

    <!-- Toast Notification -->
    <div
      v-if="notification.show"
      class="fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl shadow-xl transition-all duration-300 text-white text-sm"
      :class="notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'"
    >
      <span class="mr-2">
        <Sparkles v-if="notification.type === 'success'" class="w-4 h-4 inline" />
        <HelpCircle v-else class="w-4 h-4 inline" />
      </span>
      <span>{{ notification.message }}</span>
    </div>

    <!-- Header & Action -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare class="w-6 h-6 text-emerald-700" />
          Template WhatsApp CRM
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Kelola template pesan promosi, sapaan awal, dan follow-up calon peserta didik via WhatsApp GOWA.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton
          @click="openCreateModal"
          variant="primary"
          class="flex items-center gap-2 shadow-sm shadow-emerald-700/20"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah Template</span>
        </BaseButton>
      </div>
    </div>

    <!-- Filter Bar Card -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Search Input -->
        <div class="relative">
          <input
            v-model="queryParams.search"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Cari nama template / isi pesan..."
            class="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
          />
          <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <!-- Filter Kategori -->
        <div>
          <select
            v-model="queryParams.eventKey"
            @change="handleSearch"
            class="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
          >
            <option value="">Semua Kategori Pesan</option>
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>

        <!-- Filter Lembaga -->
        <div>
          <select
            v-if="canChooseInstitution"
            v-model="queryParams.institutionId"
            @change="handleSearch"
            class="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
          >
            <option value="">Semua Lembaga & Global</option>
            <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
              {{ inst.name }} ({{ inst.code }})
            </option>
          </select>
          <div
            v-else
            class="flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium truncate"
          >
            <span class="truncate">{{ userInstitution?.name || 'Lembaga Pengguna' }}</span>
            <span class="text-[0.65rem] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
              Terkunci
            </span>
          </div>
        </div>

        <!-- Filter Status Aktif -->
        <div>
          <select
            v-model="queryParams.isActive"
            @change="handleSearch"
            class="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
          >
            <option value="">Semua Status Aktif</option>
            <option value="1">Aktif Saja</option>
            <option value="0">Non-Aktif Saja</option>
          </select>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div>Ditemukan <strong>{{ totalItems }}</strong> template pesan</div>
        <button
          @click="resetFilter"
          class="text-emerald-700 hover:underline font-medium"
        >
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Content State -->
    <div v-if="loading" class="bg-white p-12 rounded-2xl border border-slate-200">
      <BaseLoading message="Memuat daftar template CRM..." />
    </div>

    <div v-else-if="error" class="bg-white p-8 rounded-2xl border border-slate-200">
      <BaseErrorState :message="error" @retry="fetchTemplates" />
    </div>

    <div v-else-if="templates.length === 0" class="bg-white p-12 rounded-2xl border border-slate-200">
      <BaseEmptyState
        title="Belum ada template WhatsApp CRM"
        message="Buat template pesan promosi pertama Anda untuk memudahkan petugas menghubungi calon siswa."
        actionText="Tambah Template Sekarang"
        @action="openCreateModal"
      />
    </div>

    <!-- Template Grid Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all duration-200"
      >
        <div>
          <!-- Header Badges -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-md text-[0.7rem] font-semibold"
              :class="CRM_TEMPLATE_CATEGORY_BADGES[tpl.eventKey]?.colorClasses || 'bg-slate-100 text-slate-700'"
            >
              {{ CRM_TEMPLATE_CATEGORY_LABELS[tpl.eventKey] || tpl.eventKey }}
            </span>

            <span
              v-if="isGlobal(tpl)"
              class="inline-flex items-center gap-1 text-[0.68rem] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md"
              title="Template bawaan sistem untuk seluruh lembaga"
            >
              <Globe class="w-3 h-3 text-slate-400" /> Global (Sistem)
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 text-[0.68rem] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md"
            >
              <Building2 class="w-3 h-3 text-emerald-600" /> {{ tpl.institution?.code || tpl.institution?.name || 'Khusus Lembaga' }}
            </span>
          </div>

          <!-- Title -->
          <h2 class="text-sm font-bold text-slate-800 leading-snug mb-2 line-clamp-1" :title="tpl.name">
            {{ tpl.name }}
          </h2>

          <!-- Message Body Preview Box -->
          <div class="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-line line-clamp-4 min-h-[5.5rem]">
            {{ tpl.messageBody }}
          </div>
        </div>

        <!-- Footer / Metadata & Actions -->
        <div class="mt-4 pt-3 border-t border-slate-100">
          <div class="flex items-center justify-between text-xs mb-3">
            <span class="text-slate-400 text-[0.7rem]">
              Diperbarui: {{ formatDate(tpl.updatedAt) }}
            </span>

            <!-- Status Switch Toggle -->
            <button
              @click="canManage(tpl) ? handleToggleStatus(tpl) : null"
              :disabled="!canManage(tpl)"
              class="inline-flex items-center gap-1 text-[0.72rem] font-semibold px-2 py-0.5 rounded-full transition-colors"
              :class="[
                tpl.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500',
                canManage(tpl) ? 'hover:opacity-80 cursor-pointer' : 'opacity-70 cursor-not-allowed'
              ]"
              :title="!canManage(tpl) ? 'Status template global hanya dapat diatur oleh Super Admin' : (tpl.isActive ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan')"
            >
              <CheckCircle v-if="tpl.isActive" class="w-3 h-3" />
              <XCircle v-else class="w-3 h-3" />
              <span>{{ tpl.isActive ? 'Aktif' : 'Non-Aktif' }}</span>
            </button>
          </div>

          <div class="flex items-center justify-between gap-2">
            <button
              @click="handlePreviewTest(tpl.messageBody, tpl.name)"
              class="inline-flex items-center gap-1.5 text-xs text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
            >
              <Eye class="w-3.5 h-3.5" /> Uji Format
            </button>

            <div class="flex items-center gap-1.5">
              <!-- Tombol Salin ke Lembaga untuk Admin Lembaga pada Template Global -->
              <button
                v-if="isGlobal(tpl) && !isSuperAdmin"
                @click="openForkModal(tpl)"
                class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                title="Salin dan sesuaikan template ini khusus untuk lembaga Anda"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>Salin ke Lembaga</span>
              </button>

              <!-- Tombol Edit Template (jika punya izin kelola) -->
              <button
                v-if="canManage(tpl)"
                @click="openEditModal(tpl)"
                class="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                :title="isGlobal(tpl) ? 'Edit template global (Super Admin)' : 'Edit template lembaga'"
              >
                <Edit class="w-4 h-4" />
              </button>

              <!-- Tombol Hapus (jika punya izin kelola) -->
              <button
                v-if="canManage(tpl)"
                @click="openDeleteModal(tpl)"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Hapus template"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah / Edit / Fork Template -->
    <BaseModal
      :open="isCreateModalOpen || isEditModalOpen"
      :title="isForkMode ? 'Salin & Sesuaikan Template untuk Lembaga' : (isEditModalOpen ? 'Edit Template WhatsApp CRM' : 'Tambah Template WhatsApp CRM')"
      size="2xl"
      @close="isCreateModalOpen = false; isEditModalOpen = false; isForkMode = false"
    >
      <form @submit.prevent="submitSaveTemplate(isEditModalOpen && !isForkMode)" class="space-y-4">
        <!-- Info Alert Saat Mode Duplikasi/Fork dari Template Global -->
        <div
          v-if="isForkMode"
          class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5"
        >
          <Info class="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div class="space-y-1">
            <span class="font-bold text-amber-950">Menyalin dari Template Bawaan Sistem</span>
            <p class="text-amber-800 leading-relaxed">
              Template bawaan sistem bersifat global untuk semua sekolah/lembaga dan tidak dapat diubah langsung oleh akun lembaga.
              Perubahan pada formulir ini akan disimpan sebagai <strong>template baru khusus untuk {{ userInstitution?.name || 'lembaga Anda' }}</strong>.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Nama Template -->
          <div class="md:col-span-2">
            <BaseInput
              v-model="templateForm.name"
              label="Nama Template"
              placeholder="Contoh: Sapaan Awal Calon Siswa SMK"
              :required="true"
            />
          </div>

          <!-- Kategori Template -->
          <div>
            <label class="text-xs font-medium text-slate-700 block mb-1">Kategori Pesan</label>
            <select
              v-model="templateForm.event_key"
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>

          <!-- Lembaga Pemilik Template -->
          <div>
            <label class="text-xs font-medium text-slate-700 block mb-1">Cakupan Lembaga</label>
            <select
              v-if="canChooseInstitution"
              v-model="templateForm.institution_id"
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="" v-if="isSuperAdmin && !isForkMode">-- Template Global (Semua Lembaga) --</option>
              <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
                {{ inst.name }} ({{ inst.code }})
              </option>
            </select>
            <div
              v-else
              class="flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-medium"
            >
              <div class="flex items-center gap-1.5 truncate">
                <Building2 class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span class="truncate">{{ userInstitution?.name || 'Lembaga Pengguna' }}</span>
              </div>
              <span class="text-[0.65rem] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                Otomatis
              </span>
            </div>
          </div>
        </div>

        <!-- Isi Pesan Textarea -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-medium text-slate-700">Isi Pesan Template (WhatsApp)</label>
            <span class="text-[0.7rem] text-slate-400">Gunakan *teks* untuk tebal, _teks_ untuk miring</span>
          </div>

          <BaseTextarea
            v-model="templateForm.message_body"
            rows="6"
            placeholder="Tulis draf pesan WhatsApp di sini..."
          />
        </div>

        <!-- Helper Pill Variabel / Placeholders -->
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-700 flex items-center gap-1">
              <Tag class="w-3.5 h-3.5 text-emerald-600" /> Sisipkan Variabel Otomatis:
            </span>
            <span class="text-slate-400 text-[0.68rem]">Klik tombol untuk menambahkan</span>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="p in placeholders"
              :key="p.key"
              type="button"
              @click="insertVariable(p.key)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.7rem] bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-colors shadow-2xs font-mono"
              :title="`${p.description} (Contoh: ${p.example})`"
            >
              <span>+ {{ formatVar(p.key) }}</span>
            </button>
          </div>
        </div>

        <!-- Live Preview Test Button -->
        <div class="flex justify-start">
          <button
            type="button"
            @click="handlePreviewTest(templateForm.message_body, 'Uji Format Pesan Baru')"
            class="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
          >
            <Eye class="w-3.5 h-3.5" /> Pratinjau Teks dengan Data Uji
          </button>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="isCreateModalOpen = false; isEditModalOpen = false; isForkMode = false"
            :disabled="submitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            @click="submitSaveTemplate(isEditModalOpen && !isForkMode)"
            :loading="submitting"
          >
            {{ isForkMode ? 'Simpan sebagai Template Lembaga' : (isEditModalOpen ? 'Simpan Perubahan' : 'Buat Template') }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal: Preview / Test Format Pesan -->
    <BaseModal
      :open="isPreviewModalOpen"
      :title="`Pratinjau Uji Format Pesan: ${previewData.title}`"
      size="md"
      @close="isPreviewModalOpen = false"
    >
      <div class="space-y-4">
        <!-- Status Bar -->
        <div class="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <Info class="w-4 h-4 shrink-0 text-blue-600" />
          <span>Pengujian ini hanya menampilkan simulasi teks dan <strong>tidak mengirim WhatsApp sungguhan</strong>.</span>
        </div>

        <!-- Chat Bubble Preview -->
        <div class="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80">
          <div class="text-[0.7rem] uppercase tracking-wider text-emerald-800 font-bold mb-2">Simulasi Balon Pesan WhatsApp</div>
          <div class="p-4 bg-white rounded-xl shadow-xs border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
            {{ previewData.renderedText || '(Pesan kosong)' }}
          </div>
        </div>

        <!-- Detected Variables List -->
        <div class="text-xs space-y-1.5">
          <div class="font-semibold text-slate-700">Variabel yang Digunakan:</div>
          <div v-if="previewData.usedVariables.length === 0" class="text-slate-400 italic">
            Tidak ada placeholder variabel dalam pesan ini.
          </div>
          <div v-else class="flex flex-wrap gap-1">
            <span
              v-for="v in previewData.usedVariables"
              :key="v"
              class="px-2 py-0.5 rounded text-[0.7rem] font-mono bg-slate-100 text-slate-700"
            >
              {{ formatVar(v) }}
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <BaseButton variant="primary" @click="isPreviewModalOpen = false">
            Tutup Pratinjau
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal: Konfirmasi Hapus Template -->
    <BaseConfirmModal
      :open="isDeleteModalOpen"
      title="Hapus Template WhatsApp CRM"
      :message="`Apakah Anda yakin ingin menghapus template '${templateToDelete?.name}'? Template ini tidak akan dapat digunakan lagi untuk pengiriman pesan manual.`"
      confirmText="Ya, Hapus Template"
      cancelText="Batal"
      confirmVariant="danger"
      :loading="submitting"
      @close="isDeleteModalOpen = false"
      @confirm="confirmDelete"
    />

  </div>
</template>
