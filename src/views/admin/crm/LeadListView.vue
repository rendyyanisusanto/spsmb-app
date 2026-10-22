<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  getLeads,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getLeadStatuses,
  getLeadOfficers,
  sendManualWhatsApp,
  previewLeadMessage,
  importLeads,
  downloadImportTemplate
} from '@/services/crmLeadService'
import * as XLSX from 'xlsx'
import { getCrmTemplates } from '@/services/crmTemplateService'
import { getInstitutions } from '@/services/institutionService'
import { CRM_LEAD_STATUS, CRM_LEAD_STATUS_LABELS, CRM_LEAD_STATUS_BADGES } from '@/constants/crmLeadStatus'
import { formatDate } from '@/utils/date'
import { formatPhoneDisplay } from '@/utils/phone'

import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

import {
  UserPlus,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Phone,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Send,
  CalendarClock,
  AlertTriangle,
  AlertCircle
} from 'lucide-vue-next'

const router = useRouter()
const { user, hasRole } = useAuth()

const isSuperAdmin = computed(() => {
  return (
    user.value?.primaryRole === 'SUPER_ADMIN' ||
    user.value?.role === 'SUPER_ADMIN' ||
    hasRole('SUPER_ADMIN')
  )
})

// Check if user is associated with Pondok
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

// Whether the user can choose/switch institution:
// Only SUPER_ADMIN and PONDOK admins can choose.
// School admins (e.g. SMK, SMA, SMP) are automatically set to their school.
const canChooseInstitution = computed(() => {
  return isSuperAdmin.value || isPondokAdmin.value
})

const userAssignedInstitution = computed(() => {
  if (institutions.value.length > 0) {
    return institutions.value[0]
  }
  const userInst = user.value?.institutions?.[0]
  if (userInst) {
    return typeof userInst === 'object'
      ? userInst
      : { id: userInst, name: `Lembaga #${userInst}`, code: '' }
  }
  return null
})

const currentInstitutionLabel = computed(() => {
  const targetId = Number(leadForm.value.institution_id || filters.value.institutionId || userAssignedInstitution.value?.id)
  const inst = institutions.value.find(i => i.id === targetId) || userAssignedInstitution.value
  if (inst) {
    return `${inst.name}${inst.code ? ` (${inst.code})` : ''}`
  }
  return 'Lembaga'
})

// Main state
const leads = ref([])
const loading = ref(true)
const error = ref('')
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })

// Reference data
const statusOptions = ref([])
const officerOptions = ref([])
const institutions = ref([])

// Notification toast
const notification = ref({ show: false, type: 'success', message: '' })
const showToast = (message, type = 'success') => {
  notification.value = { show: true, type, message }
  setTimeout(() => {
    notification.value.show = false
  }, 4000)
}

// Filters & Query state
const filters = ref({
  search: '',
  status: '',
  institutionId: '',
  leadByUserId: '',
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  page: 1,
  limit: 10
})

// Statistics computed
const stats = computed(() => {
  const total = pagination.value.total
  const newCount = leads.value.filter(l => l.status === 'NEW').length
  const inProgress = leads.value.filter(l => ['CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'READY_TO_REGISTER'].includes(l.status)).length
  const converted = leads.value.filter(l => l.status === 'CONVERTED').length
  return { total, newCount, inProgress, converted }
})

// Lead form modal state (Add / Edit)
const isFormModalOpen = ref(false)
const formMode = ref('add') // 'add' | 'edit'
const formSubmitting = ref(false)
const formErrors = ref({})
const formLeadId = ref(null)

const leadForm = ref({
  institution_id: '',
  full_name: '',
  school_origin: '',
  address: '',
  phone: '',
  father_name: '',
  mother_name: '',
  interest: '',
  status: 'NEW',
  lead_source: '',
  lead_by_user_id: '',
  notes: '',
  status_notes: ''
})

// Quick Status modal state
const isStatusModalOpen = ref(false)
const statusSubmitting = ref(false)
const targetLead = ref(null)
const newStatusForm = ref({
  status: '',
  notes: ''
})

// Delete modal state
const isDeleteModalOpen = ref(false)
const deleteSubmitting = ref(false)
const leadToDelete = ref(null)

// Load lookup options
const loadLookups = async () => {
  try {
    const [statusData, officerData, instData] = await Promise.all([
      getLeadStatuses().catch(() => []),
      getLeadOfficers().catch(() => []),
      getInstitutions().catch(() => ({ data: [] }))
    ])

    statusOptions.value = Array.isArray(statusData) ? statusData : []
    officerOptions.value = Array.isArray(officerData) ? officerData : []
    
    const allInsts = instData.data || instData || []
    if (isSuperAdmin.value) {
      institutions.value = allInsts
    } else {
      // Filter institutions only to those assigned to current user
      const userInstIds = (user.value?.institutions || []).map(i => (typeof i === 'object' ? i.id : i))
      institutions.value = allInsts.filter(i => userInstIds.includes(i.id))
      
      // For school admins (e.g. SMK, not superadmin and not pondok),
      // lock filter to their institution automatically!
      if (!canChooseInstitution.value && institutions.value.length > 0) {
        filters.value.institutionId = institutions.value[0].id
      }
    }
  } catch (e) {
    console.error('Failed to load lookup data:', e)
  }
}

// Fetch leads list
const fetchLeads = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: filters.value.page,
      limit: filters.value.limit,
      search: filters.value.search,
      status: filters.value.status,
      institutionId: filters.value.institutionId,
      leadByUserId: filters.value.leadByUserId,
      sortBy: filters.value.sortBy,
      sortOrder: filters.value.sortOrder
    }

    const res = await getLeads(params)
    if (res.success) {
      leads.value = res.data
      pagination.value = res.meta
    } else {
      error.value = res.message || 'Gagal memuat data lead'
    }
  } catch (e) {
    error.value = e.message || 'Terjadi kesalahan saat memuat data lead'
  } finally {
    loading.value = false
  }
}

// Search debounce
let searchTimeout = null
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    filters.value.page = 1
    fetchLeads()
  }, 400)
})

const handleFilterChange = () => {
  filters.value.page = 1
  fetchLeads()
}

const resetFilters = () => {
  filters.value.search = ''
  filters.value.status = ''
  filters.value.leadByUserId = ''
  if (canChooseInstitution.value) {
    filters.value.institutionId = ''
  } else if (institutions.value.length > 0) {
    filters.value.institutionId = institutions.value[0].id
  }
  filters.value.page = 1
  fetchLeads()
}

const goToPage = (p) => {
  if (p < 1 || p > pagination.value.totalPages) return
  filters.value.page = p
  fetchLeads()
}

// Modal Form Actions
const openAddModal = () => {
  formMode.value = 'add'
  formLeadId.value = null
  formErrors.value = {}
  
  // Default institution for user:
  // If school admin (e.g. SMK, not superadmin and not pondok), automatically set to their institution!
  let defaultInstId = ''
  if (!canChooseInstitution.value) {
    defaultInstId = institutions.value[0]?.id || user.value?.institutions?.[0]?.id || user.value?.institutions?.[0] || ''
  } else if (filters.value.institutionId) {
    defaultInstId = filters.value.institutionId
  } else if (institutions.value.length > 0) {
    defaultInstId = institutions.value[0].id
  }

  leadForm.value = {
    institution_id: defaultInstId,
    full_name: '',
    school_origin: '',
    address: '',
    phone: '',
    father_name: '',
    mother_name: '',
    interest: '',
    status: 'NEW',
    lead_source: '',
    lead_by_user_id: user.value?.id || '',
    notes: '',
    status_notes: ''
  }
  isFormModalOpen.value = true
}

const openEditModal = (lead) => {
  formMode.value = 'edit'
  formLeadId.value = lead.id
  formErrors.value = {}
  leadForm.value = {
    institution_id: lead.institutionId,
    full_name: lead.fullName,
    school_origin: lead.schoolOrigin === '-' ? '' : lead.schoolOrigin,
    address: lead.address === '-' ? '' : lead.address,
    phone: lead.phone === '-' ? '' : lead.phone,
    father_name: lead.fatherName === '-' ? '' : lead.fatherName,
    mother_name: lead.motherName === '-' ? '' : lead.motherName,
    interest: lead.interest === '-' ? '' : lead.interest,
    status: lead.status,
    lead_source: lead.leadSource === '-' ? '' : lead.leadSource,
    lead_by_user_id: lead.leadBy?.id || '',
    notes: lead.notes || '',
    status_notes: ''
  }
  isFormModalOpen.value = true
}

const submitForm = async () => {
  formErrors.value = {}
  if (!leadForm.value.full_name || leadForm.value.full_name.trim() === '') {
    formErrors.value.full_name = 'Nama lengkap wajib diisi'
    return
  }

  // If school admin (e.g. SMK), automatically ensure institution_id is their institution
  if (!canChooseInstitution.value) {
    leadForm.value.institution_id = institutions.value[0]?.id || user.value?.institutions?.[0]?.id || user.value?.institutions?.[0]
  }

  if (!leadForm.value.institution_id) {
    formErrors.value.institution_id = 'Lembaga wajib dipilih'
    return
  }

  formSubmitting.value = true
  try {
    const payload = {
      institution_id: Number(leadForm.value.institution_id),
      full_name: leadForm.value.full_name.trim(),
      school_origin: leadForm.value.school_origin ? leadForm.value.school_origin.trim() : null,
      address: leadForm.value.address ? leadForm.value.address.trim() : null,
      phone: leadForm.value.phone ? leadForm.value.phone.trim() : null,
      father_name: leadForm.value.father_name ? leadForm.value.father_name.trim() : null,
      mother_name: leadForm.value.mother_name ? leadForm.value.mother_name.trim() : null,
      interest: leadForm.value.interest ? leadForm.value.interest.trim() : null,
      status: leadForm.value.status,
      lead_source: leadForm.value.lead_source ? leadForm.value.lead_source.trim() : null,
      lead_by_user_id: leadForm.value.lead_by_user_id ? Number(leadForm.value.lead_by_user_id) : null,
      notes: leadForm.value.notes ? leadForm.value.notes.trim() : null,
      status_notes: leadForm.value.status_notes ? leadForm.value.status_notes.trim() : null
    }

    if (formMode.value === 'add') {
      await createLead(payload)
      showToast('Lead baru berhasil ditambahkan!')
    } else {
      await updateLead(formLeadId.value, payload)
      showToast('Data lead berhasil diperbarui!')
    }

    isFormModalOpen.value = false
    fetchLeads()
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan data lead', 'error')
  } finally {
    formSubmitting.value = false
  }
}

// Quick Status Actions
const openStatusModal = (lead) => {
  targetLead.value = lead
  newStatusForm.value = {
    status: lead.status,
    notes: ''
  }
  isStatusModalOpen.value = true
}

const submitStatusChange = async () => {
  if (!newStatusForm.value.status) return
  statusSubmitting.value = true
  try {
    await updateLeadStatus(targetLead.value.id, {
      status: newStatusForm.value.status,
      notes: newStatusForm.value.notes ? newStatusForm.value.notes.trim() : null
    })
    showToast(`Status lead berhasil diubah menjadi ${CRM_LEAD_STATUS_LABELS[newStatusForm.value.status]}`)
    isStatusModalOpen.value = false
    fetchLeads()
  } catch (err) {
    showToast(err.message || 'Gagal memperbarui status lead', 'error')
  } finally {
    statusSubmitting.value = false
  }
}

// Delete Actions
const openDeleteModal = (lead) => {
  leadToDelete.value = lead
  isDeleteModalOpen.value = true
}

const confirmDelete = async () => {
  if (!leadToDelete.value) return
  deleteSubmitting.value = true
  try {
    await deleteLead(leadToDelete.value.id)
    showToast(`Lead "${leadToDelete.value.fullName}" berhasil dihapus`)
    isDeleteModalOpen.value = false
    leadToDelete.value = null
    fetchLeads()
  } catch (err) {
    showToast(err.message || 'Gagal menghapus lead', 'error')
  } finally {
    deleteSubmitting.value = false
  }
}

const goToDetail = (id) => {
  router.push(`/admin/crm/leads/${id}`)
}

// SPRINT 2: Quick Send WhatsApp Modal
const isSendWaModalOpen = ref(false)
const sendWaSubmitting = ref(false)
const crmTemplates = ref([])
const targetLeadForWa = ref(null)
const sendWaForm = ref({
  template_id: '',
  phone: '',
  message: '',
  missingVariables: []
})

const formatMissingVariables = (vars) => {
  return (vars || []).map(v => '{{' + v + '}}').join(', ')
}

const openSendWaModal = async (lead) => {
  targetLeadForWa.value = lead
  sendWaForm.value = {
    template_id: '',
    phone: lead.phone || '',
    message: '',
    missingVariables: []
  }
  isSendWaModalOpen.value = true
  if (crmTemplates.value.length === 0) {
    try {
      const res = await getCrmTemplates({ isActive: 1, limit: 100 })
      crmTemplates.value = res.data || res || []
    } catch (_) {}
  }
}

const handleTemplateSelect = async () => {
  if (!sendWaForm.value.template_id || !targetLeadForWa.value) return
  try {
    const res = await previewLeadMessage(targetLeadForWa.value.id, {
      template_id: Number(sendWaForm.value.template_id)
    })
    sendWaForm.value.message = res.renderedText
    sendWaForm.value.missingVariables = res.missingVariables || []
  } catch (err) {
    showToast('Gagal memuat template pesan', 'error')
  }
}

const submitSendWhatsApp = async () => {
  if (!sendWaForm.value.phone?.trim()) {
    showToast('Nomor WhatsApp tujuan wajib diisi', 'error')
    return
  }
  if (!sendWaForm.value.message?.trim()) {
    showToast('Isi pesan WhatsApp tidak boleh kosong', 'error')
    return
  }

  sendWaSubmitting.value = true
  try {
    await sendManualWhatsApp(targetLeadForWa.value.id, {
      phone: sendWaForm.value.phone.trim(),
      message: sendWaForm.value.message.trim(),
      template_id: sendWaForm.value.template_id ? Number(sendWaForm.value.template_id) : null
    })
    showToast('Pesan WhatsApp berhasil dikirim via GOWA!')
    isSendWaModalOpen.value = false
    targetLeadForWa.value = null
    fetchLeads()
  } catch (err) {
    showToast(err.message || 'Gagal mengirim pesan WhatsApp', 'error')
  } finally {
    sendWaSubmitting.value = false
  }
}

// Import Modal State
const isImportModalOpen = ref(false)
const importFile = ref(null)
const importFileName = ref('')
const importFileSize = ref('')
const importParsedRows = ref([])
const importInstitutionId = ref('')
const isImporting = ref(false)
const importProgress = ref(0)
const importStatusText = ref('')
const importResult = ref(null)
const importFileInputRef = ref(null)

const openImportModal = () => {
  importFile.value = null
  importFileName.value = ''
  importFileSize.value = ''
  importParsedRows.value = []
  importProgress.value = 0
  importStatusText.value = ''
  importResult.value = null
  isImporting.value = false
  importInstitutionId.value = userAssignedInstitution.value?.id || ''
  isImportModalOpen.value = true
}

const closeImportModal = () => {
  if (isImporting.value) return
  isImportModalOpen.value = false
}

const triggerFileInput = () => {
  if (importFileInputRef.value) {
    importFileInputRef.value.click()
  }
}

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  importFile.value = file
  importFileName.value = file.name
  importFileSize.value = `${(file.size / 1024).toFixed(1)} KB`
  importResult.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (firstSheetName) {
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        importParsedRows.value = json
      }
    } catch (err) {
      console.error('Preview error', err)
      importParsedRows.value = []
    }
  }
  reader.readAsArrayBuffer(file)
}

const removeSelectedFile = () => {
  importFile.value = null
  importFileName.value = ''
  importFileSize.value = ''
  importParsedRows.value = []
  if (importFileInputRef.value) {
    importFileInputRef.value.value = ''
  }
}

const handleDownloadTemplate = () => {
  try {
    const headers = [
      ['Nama Lengkap', 'No. WhatsApp', 'Asal Sekolah', 'Alamat', 'Nama Ayah', 'Nama Ibu', 'Minat', 'Sumber Lead', 'Status', 'Catatan', 'Lembaga'],
      ['Ahmad Rayhan', '081234567890', 'SMP Negeri 1 Malang', 'Jl. Raya Asy-Syadzili No. 10', 'Bapak Ahmad', 'Ibu Siti', 'RPL (Rekayasa Perangkat Lunak)', 'Media Sosial', 'NEW', 'Berminat fasilitas asrama', 'SMK IT Asy-Syadzili'],
      ['Fatimah Zahra', '089876543210', 'MTs Negeri 2 Pasuruan', 'Jl. Melati No. 5 Pasuruan', 'Bapak Umar', 'Ibu Khadijah', 'Tahfidz Al-Quran', 'Brosur', 'NEW', 'Ingin fokus tahfidz 30 juz', 'SMA IT Asy-Syadzili']
    ]
    const ws = XLSX.utils.aoa_to_sheet(headers)
    ws['!cols'] = [
      { wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 30 },
      { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 18 },
      { wch: 14 }, { wch: 30 }, { wch: 25 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Lead')
    XLSX.writeFile(wb, 'Template_Import_Lead_SPSMB.xlsx')
  } catch (e) {
    showToast('Gagal mengunduh template', 'error')
  }
}

const handleStartImport = async () => {
  if (!importFile.value) {
    showToast('Pilih file Excel/CSV terlebih dahulu.', 'error')
    return
  }

  if (canChooseInstitution.value && !importInstitutionId.value) {
    showToast('Pilih lembaga target import.', 'error')
    return
  }

  isImporting.value = true
  importProgress.value = 15
  importStatusText.value = 'Membaca dan memverifikasi berkas...'

  const progressTimer = setInterval(() => {
    if (importProgress.value < 85) {
      importProgress.value += 15
      if (importProgress.value >= 40 && importProgress.value < 70) {
        importStatusText.value = 'Mengunggah dan memproses data calon siswa...'
      } else if (importProgress.value >= 70) {
        importStatusText.value = 'Menyimpan data lead ke basis data...'
      }
    }
  }, 250)

  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    if (importInstitutionId.value) {
      formData.append('institution_id', importInstitutionId.value)
    }

    const res = await importLeads(formData)
    clearInterval(progressTimer)
    importProgress.value = 100
    importStatusText.value = 'Impor selesai!'
    importResult.value = res.data || res

    showToast(`Berhasil mengimpor ${importResult.value.importedCount || 0} data lead!`, 'success')

    setTimeout(async () => {
      isImportModalOpen.value = false
      await fetchLeads()
    }, 1200)
  } catch (err) {
    clearInterval(progressTimer)
    importProgress.value = 0
    importStatusText.value = 'Gagal memproses berkas'
    showToast(err.response?.data?.message || err.message || 'Gagal mengimpor data lead', 'error')
  } finally {
    isImporting.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await fetchLeads()
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
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <UserCheck class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-800 leading-tight">Manajemen Lead (CRM)</h1>
            <p class="text-xs text-slate-500 mt-0.5">Kelola prospek calon santri & siswa baru per lembaga</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2.5 w-full sm:w-auto">
        <BaseButton
          @click="openImportModal"
          variant="outline"
          class="w-full sm:w-auto shadow-xs border-slate-300 hover:bg-slate-50 text-slate-700"
        >
          <Upload class="w-4 h-4 mr-2" />
          Impor Data
        </BaseButton>

        <BaseButton
          @click="openAddModal"
          variant="primary"
          class="w-full sm:w-auto shadow-xs"
        >
          <UserPlus class="w-4 h-4 mr-2" />
          Tambah Lead Baru
        </BaseButton>
      </div>
    </div>

    <!-- Stats Quick Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
          <UserCheck class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs font-medium text-slate-500">Total Prospek Lead</div>
          <div class="text-2xl font-bold text-slate-800">{{ stats.total }}</div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl border border-blue-100 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <Sparkles class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs font-medium text-blue-600">Lead Baru (New)</div>
          <div class="text-2xl font-bold text-blue-700">{{ stats.newCount }}</div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <Phone class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs font-medium text-amber-600">Dalam Follow-up</div>
          <div class="text-2xl font-bold text-amber-700">{{ stats.inProgress }}</div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <UserCheck class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs font-medium text-emerald-600">Berhasil Dikonversi</div>
          <div class="text-2xl font-bold text-emerald-700">{{ stats.converted }}</div>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Search Input -->
        <div class="relative">
          <label class="text-xs font-medium text-slate-600 mb-1 block">Pencarian</label>
          <div class="relative">
            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari nama, No HP, atau SMP..."
              class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <!-- Filter Status -->
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1 block">Status Lead</label>
          <select
            v-model="filters.status"
            @change="handleFilterChange"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
        </div>

        <!-- Filter Lembaga -->
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1 block">Lembaga</label>
          <select
            v-if="canChooseInstitution"
            v-model="filters.institutionId"
            @change="handleFilterChange"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Semua Lembaga</option>
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
              <span class="truncate">{{ currentInstitutionLabel }}</span>
            </div>
            <span class="text-[0.65rem] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold ml-1 shrink-0">
              Otomatis
            </span>
          </div>
        </div>

        <!-- Filter Petugas / Lead By -->
        <div>
          <label class="text-xs font-medium text-slate-600 mb-1 block">Petugas Penangan</label>
          <select
            v-model="filters.leadByUserId"
            @change="handleFilterChange"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Semua Petugas</option>
            <option v-for="off in officerOptions" :key="off.id" :value="off.id">
              {{ off.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <div class="text-slate-500">
          Menampilkan <span class="font-semibold text-slate-700">{{ leads.length }}</span> dari <span class="font-semibold text-slate-700">{{ pagination.total }}</span> lead
        </div>
        <button
          @click="resetFilters"
          class="inline-flex items-center text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          <RotateCcw class="w-3.5 h-3.5 mr-1" />
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="p-12">
        <BaseLoading message="Memuat data lead..." />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8">
        <BaseErrorState :message="error" @retry="fetchLeads" />
      </div>

      <!-- Empty State -->
      <div v-else-if="leads.length === 0" class="p-8">
        <BaseEmptyState
          title="Belum ada data lead"
          description="Belum ada lead yang terdaftar untuk filter ini. Silakan tambahkan lead baru."
        >
          <template #actions>
            <BaseButton @click="openAddModal" variant="primary" size="sm">
              <UserPlus class="w-4 h-4 mr-2" />
              Tambah Lead
            </BaseButton>
          </template>
        </BaseEmptyState>
      </div>

      <!-- Lead Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700 border-collapse">
          <thead class="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[0.7rem]">
            <tr>
              <th class="py-3 px-3 text-center w-12">No</th>
              <th class="py-3 px-4 min-w-[180px]">Nama Calon Peserta</th>
              <th class="py-3 px-3 min-w-[140px]">SMP Asal</th>
              <th class="py-3 px-3 min-w-[140px]">Alamat</th>
              <th class="py-3 px-3 min-w-[120px]">No HP</th>
              <th class="py-3 px-3 min-w-[120px]">Orang Tua</th>
              <th class="py-3 px-3 min-w-[140px]">Interest</th>
              <th class="py-3 px-3 min-w-[130px]">Status</th>
              <th class="py-3 px-3 min-w-[120px]">Lead By</th>
              <th class="py-3 px-4 text-center min-w-[130px]">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(lead, idx) in leads"
              :key="lead.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- No -->
              <td class="py-3 px-3 text-center text-slate-400 font-medium">
                {{ (pagination.page - 1) * pagination.limit + idx + 1 }}
              </td>

              <!-- Nama & Lembaga -->
              <td class="py-3 px-4">
                <router-link
                  :to="`/admin/crm/leads/${lead.id}`"
                  class="font-semibold text-slate-800 hover:text-emerald-700 hover:underline block leading-tight"
                >
                  {{ lead.fullName }}
                </router-link>
                <div class="flex items-center gap-1.5 mt-1 text-[0.7rem] text-slate-500">
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {{ lead.institution?.code || lead.institution?.name }}
                  </span>
                  <span v-if="lead.application" class="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium" :title="`No Registrasi: ${lead.application.registrationNumber}`">
                    Terdaftar
                  </span>
                </div>
              </td>

              <!-- SMP Asal -->
              <td class="py-3 px-3 text-slate-600">
                {{ lead.schoolOrigin }}
              </td>

              <!-- Alamat -->
              <td class="py-3 px-3 text-slate-600">
                <span class="truncate block max-w-[150px]" :title="lead.address">
                  {{ lead.address }}
                </span>
              </td>

              <!-- No HP -->
              <td class="py-3 px-3">
                <div class="font-mono text-slate-700 whitespace-nowrap">
                  {{ formatPhoneDisplay(lead.phone) }}
                </div>
                <a
                  v-if="lead.phone && lead.phone !== '-'"
                  :href="`https://wa.me/${lead.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`"
                  target="_blank"
                  class="text-[0.68rem] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 mt-0.5"
                >
                  <Phone class="w-2.5 h-2.5" /> Chat WA
                </a>
              </td>

              <!-- Orang Tua -->
              <td class="py-3 px-3 text-slate-600 text-[0.72rem]">
                <div v-if="lead.fatherName !== '-'" class="truncate max-w-[120px]" :title="`Ayah: ${lead.fatherName}`">
                  <span class="text-slate-400">A:</span> {{ lead.fatherName }}
                </div>
                <div v-if="lead.motherName !== '-'" class="truncate max-w-[120px]" :title="`Ibu: ${lead.motherName}`">
                  <span class="text-slate-400">I:</span> {{ lead.motherName }}
                </div>
                <span v-if="lead.fatherName === '-' && lead.motherName === '-'" class="text-slate-400">-</span>
              </td>

              <!-- Interest -->
              <td class="py-3 px-3 text-slate-600">
                <span class="truncate block max-w-[150px]" :title="lead.interest">
                  {{ lead.interest }}
                </span>
              </td>

              <!-- Status & Jadwal Follow-up -->
              <td class="py-3 px-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-semibold"
                  :class="CRM_LEAD_STATUS_BADGES[lead.status]?.colorClasses || 'bg-slate-100 text-slate-700'"
                >
                  {{ lead.statusLabel }}
                </span>

                <!-- Next Follow-up Overdue / Upcoming Indicator -->
                <div v-if="lead.nextFollowUpAt" class="mt-1">
                  <span
                    v-if="new Date(lead.nextFollowUpAt).getTime() < Date.now()"
                    class="inline-flex items-center gap-0.5 text-[0.65rem] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded"
                    :title="`Follow-up terlewat: ${formatDate(lead.nextFollowUpAt, true)}`"
                  >
                    <AlertTriangle class="w-2.5 h-2.5 text-rose-500" /> Terlewat: {{ formatDate(lead.nextFollowUpAt) }}
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-0.5 text-[0.65rem] text-cyan-700 font-medium bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded"
                    :title="`Follow-up terjadwal: ${formatDate(lead.nextFollowUpAt, true)}`"
                  >
                    <CalendarClock class="w-2.5 h-2.5 text-cyan-600" /> {{ formatDate(lead.nextFollowUpAt) }}
                  </span>
                </div>
              </td>

              <!-- Lead By -->
              <td class="py-3 px-3 text-slate-600">
                <div v-if="lead.leadBy" class="truncate max-w-[120px]" :title="lead.leadBy.name">
                  <span class="font-medium text-slate-700">{{ lead.leadBy.name }}</span>
                </div>
                <span v-else class="text-slate-400 italic">Belum ada</span>
              </td>

              <!-- Aksi -->
              <td class="py-3 px-4 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                  <!-- Kirim WhatsApp Manual -->
                  <button
                    @click="openSendWaModal(lead)"
                    class="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                    title="Kirim WhatsApp Manual via GOWA"
                  >
                    <Send class="w-4 h-4" />
                  </button>

                  <!-- Detail -->
                  <button
                    @click="goToDetail(lead.id)"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Lihat Detail Lead"
                  >
                    <Eye class="w-4 h-4" />
                  </button>

                  <!-- Ubah Status -->
                  <button
                    @click="openStatusModal(lead)"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    title="Ubah Status Lead"
                  >
                    <RefreshCw class="w-4 h-4" />
                  </button>

                  <!-- Edit -->
                  <button
                    @click="openEditModal(lead)"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    title="Edit Data Lead"
                  >
                    <Edit class="w-4 h-4" />
                  </button>

                  <!-- Hapus -->
                  <button
                    @click="openDeleteModal(lead)"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Hapus Lead"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table Footer & Pagination -->
      <div class="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div class="flex items-center gap-2">
          <span>Baris per halaman:</span>
          <select
            v-model="filters.limit"
            @change="handleFilterChange"
            class="px-2 py-1 rounded border border-slate-300 bg-white focus:outline-none"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
          <span class="text-slate-400">|</span>
          <span>Halaman {{ pagination.page }} dari {{ pagination.totalPages || 1 }}</span>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="goToPage(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          
          <button
            v-for="p in Math.min(5, pagination.totalPages || 1)"
            :key="p"
            @click="goToPage(p)"
            class="px-3 py-1 rounded-lg text-xs font-medium border"
            :class="pagination.page === p ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
          >
            {{ p }}
          </button>

          <button
            @click="goToPage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form Tambah / Edit Lead -->
    <BaseModal
      :open="isFormModalOpen"
      :title="formMode === 'add' ? 'Tambah Lead Baru' : 'Edit Data Lead'"
      size="2xl"
      @close="isFormModalOpen = false"
    >
      <form @submit.prevent="submitForm" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Lembaga -->
          <div>
            <label class="text-xs font-medium text-slate-700 block mb-1">
              Lembaga <span v-if="canChooseInstitution" class="text-red-500">*</span>
            </label>

            <!-- Dropdown for Super Admin or Pondok -->
            <select
              v-if="canChooseInstitution"
              v-model="leadForm.institution_id"
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
              :class="{ 'border-red-500': formErrors.institution_id }"
              :disabled="formMode === 'edit' && !isSuperAdmin"
            >
              <option value="" disabled>Pilih Lembaga...</option>
              <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
                {{ inst.name }} ({{ inst.code }})
              </option>
            </select>

            <!-- Automatic display for school admin (e.g. SMK) -->
            <div
              v-else
              class="flex items-center justify-between px-3 py-2.5 text-sm rounded-lg border border-emerald-200 bg-emerald-50/70 text-slate-800 font-medium"
            >
              <div class="flex items-center gap-2 truncate">
                <Building2 class="w-4 h-4 text-emerald-700 shrink-0" />
                <span class="truncate text-emerald-950 font-semibold">{{ currentInstitutionLabel }}</span>
              </div>
              <span class="text-[0.68rem] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                Otomatis
              </span>
            </div>

            <p v-if="formErrors.institution_id" class="text-xs text-red-500 mt-1">{{ formErrors.institution_id }}</p>
          </div>

          <!-- Nama Lengkap -->
          <div>
            <BaseInput
              v-model="leadForm.full_name"
              label="Nama Calon Peserta Didik"
              placeholder="Contoh: Muhammad Farhan"
              :required="true"
              :error="formErrors.full_name"
            />
          </div>

          <!-- SMP Asal -->
          <div>
            <BaseInput
              v-model="leadForm.school_origin"
              label="SMP / MTs Asal"
              placeholder="Contoh: SMP Negeri 1 Singosari"
            />
          </div>

          <!-- No HP / WhatsApp -->
          <div>
            <BaseInput
              v-model="leadForm.phone"
              label="No. HP / WhatsApp"
              placeholder="Contoh: 081234567890"
            />
          </div>

          <!-- Nama Ayah -->
          <div>
            <BaseInput
              v-model="leadForm.father_name"
              label="Nama Ayah"
              placeholder="Nama lengkap ayah"
            />
          </div>

          <!-- Nama Ibu -->
          <div>
            <BaseInput
              v-model="leadForm.mother_name"
              label="Nama Ibu"
              placeholder="Nama lengkap ibu"
            />
          </div>

          <!-- Minat / Jurusan -->
          <div>
            <BaseInput
              v-model="leadForm.interest"
              label="Minat / Program Pilihan"
              placeholder="Contoh: RPL, TKJ, atau Tahfidz"
            />
          </div>

          <!-- Status Lead -->
          <div>
            <label class="text-xs font-medium text-slate-700 block mb-1">Status Lead</label>
            <select
              v-model="leadForm.status"
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option v-for="s in statusOptions" :key="s.value" :value="s.value">
                {{ s.label }}
              </option>
            </select>
          </div>

          <!-- Petugas / Lead By -->
          <div>
            <label class="text-xs font-medium text-slate-700 block mb-1">Petugas (Lead By)</label>
            <select
              v-model="leadForm.lead_by_user_id"
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Pilih Petugas Penangan --</option>
              <option v-for="off in officerOptions" :key="off.id" :value="off.id">
                {{ off.name }} ({{ off.username }})
              </option>
            </select>
          </div>

          <!-- Sumber Lead -->
          <div>
            <BaseInput
              v-model="leadForm.lead_source"
              label="Sumber Informasi Lead"
              placeholder="Contoh: Brosur, Sosmed, Kunjungan Sekolah"
            />
          </div>
        </div>

        <!-- Alamat -->
        <div>
          <BaseTextarea
            v-model="leadForm.address"
            label="Alamat Lengkap"
            placeholder="Alamat tempat tinggal calon peserta didik"
            rows="2"
          />
        </div>

        <!-- Catatan Tambahan -->
        <div>
          <BaseTextarea
            v-model="leadForm.notes"
            label="Catatan Tambahan"
            placeholder="Catatan hasil percakapan atau arahan tindak lanjut..."
            rows="2"
          />
        </div>

        <!-- Catatan Perubahan Status (Saat Edit) -->
        <div v-if="formMode === 'edit'">
          <BaseInput
            v-model="leadForm.status_notes"
            label="Catatan Riwayat Perubahan (Opsional)"
            placeholder="Contoh: Wali siswa mengonfirmasi siap mendaftar minggu depan"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="isFormModalOpen = false"
            :disabled="formSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            @click="submitForm"
            :loading="formSubmitting"
          >
            {{ formMode === 'add' ? 'Simpan Lead' : 'Perbarui Lead' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Cepat Ubah Status -->
    <BaseModal
      :open="isStatusModalOpen"
      title="Perbarui Status Lead"
      size="md"
      @close="isStatusModalOpen = false"
    >
      <div v-if="targetLead" class="space-y-4">
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div class="text-slate-500">Calon Peserta Didik:</div>
          <div class="font-bold text-slate-800 text-sm">{{ targetLead.fullName }}</div>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-slate-500">Status Saat Ini:</span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full font-semibold"
              :class="CRM_LEAD_STATUS_BADGES[targetLead.status]?.colorClasses || 'bg-slate-100 text-slate-700'"
            >
              {{ targetLead.statusLabel }}
            </span>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium text-slate-700 block mb-1">Status Tujuan</label>
          <select
            v-model="newStatusForm.status"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">
              {{ s.label }} - {{ s.description }}
            </option>
          </select>
        </div>

        <div>
          <BaseTextarea
            v-model="newStatusForm.notes"
            label="Catatan Riwayat (Opsional)"
            placeholder="Jelaskan alasan perubahan atau hasil follow-up..."
            rows="3"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="isStatusModalOpen = false"
            :disabled="statusSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            @click="submitStatusChange"
            :loading="statusSubmitting"
          >
            Simpan Perubahan
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Konfirmasi Hapus Lead -->
    <BaseConfirmModal
      :open="isDeleteModalOpen"
      title="Hapus Data Lead"
      :message="`Apakah Anda yakin ingin menghapus data lead '${leadToDelete?.fullName}'? Tindakan ini akan menghapus data lead dan riwayat perubahannya tanpa memengaruhi data pendaftar SPSMB.`"
      confirmText="Ya, Hapus Lead"
      cancelText="Batal"
      confirmVariant="danger"
      :loading="deleteSubmitting"
      @close="isDeleteModalOpen = false"
      @confirm="confirmDelete"
    />

    <!-- SPRINT 2: Quick Kirim WhatsApp Modal -->
    <BaseModal
      :open="isSendWaModalOpen"
      title="Kirim WhatsApp Manual Cepat"
      size="lg"
      @close="isSendWaModalOpen = false"
    >
      <form @submit.prevent="submitSendWhatsApp" class="space-y-4">
        <!-- Candidate Target Card -->
        <div class="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="text-slate-500 text-[0.7rem]">Tujuan Penerima:</div>
            <div class="font-bold text-slate-800 text-sm">{{ targetLeadForWa?.fullName }}</div>
            <div class="text-slate-600 font-mono">{{ formatPhoneDisplay(targetLeadForWa?.phone) }}</div>
          </div>
          <div class="text-right">
            <span class="text-[0.68rem] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
              Gateway: wa.simsmk.sch.id
            </span>
          </div>
        </div>

        <!-- Nomor Telepon Tujuan -->
        <div>
          <BaseInput
            v-model="sendWaForm.phone"
            label="Nomor WhatsApp Tujuan"
            placeholder="Contoh: 081234567890"
            :required="true"
          />
        </div>

        <!-- Pilih Template -->
        <div>
          <label class="text-xs font-medium text-slate-700 block mb-1">Gunakan Template Pesan (Opsional)</label>
          <select
            v-model="sendWaForm.template_id"
            @change="handleTemplateSelect"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Tulis Pesan Manual --</option>
            <option v-for="tpl in crmTemplates" :key="tpl.id" :value="tpl.id">
              {{ tpl.name }} ({{ tpl.institution?.code || 'Global' }})
            </option>
          </select>
        </div>

        <!-- Warning Missing Variables if any -->
        <div
          v-if="sendWaForm.missingVariables?.length > 0"
          class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div class="flex-1">
            <div class="font-semibold">Perhatian: Variabel Belum Lengkap</div>
            <p class="text-[0.72rem] text-amber-700 mt-0.5">
              Variabel {{ formatMissingVariables(sendWaForm.missingVariables) }} belum terisi pada calon peserta ini.
            </p>
          </div>
        </div>

        <!-- Message Body Textarea (Editable) -->
        <div>
          <BaseTextarea
            v-model="sendWaForm.message"
            label="Draf Pesan WhatsApp (Dapat Diedit)"
            rows="5"
            placeholder="Tulis pesan WhatsApp yang ingin dikirim..."
            :required="true"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="isSendWaModalOpen = false"
            :disabled="sendWaSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            @click="submitSendWhatsApp"
            :loading="sendWaSubmitting"
            class="bg-emerald-700 hover:bg-emerald-800"
          >
            <Send class="w-4 h-4 mr-1.5" />
            Kirim WhatsApp
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Impor Data Lead -->
    <BaseModal
      :open="isImportModalOpen"
      title="Impor Data Prospek Lead"
      size="xl"
      @close="closeImportModal"
    >
      <div class="space-y-5">
        <!-- Step 1: Download Template -->
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h4 class="text-sm font-semibold text-slate-800">1. Unduh Format Template</h4>
              <p class="text-xs text-slate-500 mt-0.5">Gunakan template resmi agar kolom data terpetakan dengan tepat.</p>
            </div>
            <button
              type="button"
              @click="handleDownloadTemplate"
              class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shrink-0"
            >
              <Download class="w-3.5 h-3.5" />
              Download Template
            </button>
          </div>
        </div>

        <!-- Step 2: Target Lembaga (if user can choose) -->
        <div v-if="canChooseInstitution" class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700">
            2. Lembaga Tujuan Impor <span class="text-red-500">*</span>
          </label>
          <select
            v-model="importInstitutionId"
            class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            :disabled="isImporting"
          >
            <option value="" disabled>Pilih Lembaga...</option>
            <option
              v-for="inst in institutions"
              :key="inst.id"
              :value="inst.id"
            >
              {{ inst.name }} ({{ inst.code }})
            </option>
          </select>
        </div>
        <div v-else class="text-xs text-slate-500">
          Lembaga Target: <strong class="text-slate-700">{{ userAssignedInstitution?.name || 'Lembaga Anda' }}</strong>
        </div>

        <!-- Step 3: Upload File -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700">
            3. Unggah Berkas Import (.xlsx, .xls, .csv) <span class="text-red-500">*</span>
          </label>

          <div
            v-if="!importFile"
            @click="triggerFileInput"
            class="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30"
          >
            <input
              ref="importFileInputRef"
              type="file"
              accept=".xlsx,.xls,.csv"
              class="hidden"
              @change="handleFileChange"
            />
            <Upload class="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div class="text-sm font-medium text-slate-700">Pilih berkas atau seret ke sini</div>
            <div class="text-xs text-slate-400 mt-1">Mendukung format .xlsx, .xls, atau .csv (Maks. 10 MB)</div>
          </div>

          <!-- File Selected Display -->
          <div
            v-else
            class="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-slate-800 truncate">{{ importFileName }}</div>
                <div class="text-xs text-slate-500">
                  {{ importFileSize }}
                  <span v-if="importParsedRows.length > 0" class="text-emerald-600 font-medium ml-1">
                    ({{ importParsedRows.length }} baris terdeteksi)
                  </span>
                </div>
              </div>
            </div>
            <button
              v-if="!isImporting"
              type="button"
              @click="removeSelectedFile"
              class="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
            >
              Ganti Berkas
            </button>
          </div>
        </div>

        <!-- Progress Bar & Status -->
        <div v-if="isImporting || importProgress > 0" class="space-y-2 pt-2">
          <div class="flex justify-between items-center text-xs font-semibold">
            <span class="text-slate-700">{{ importStatusText }}</span>
            <span class="text-emerald-700">{{ importProgress }}%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              class="bg-emerald-600 h-full rounded-full transition-all duration-300"
              :style="{ width: `${importProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- Import Summary Result (if finished with errors/skipped) -->
        <div
          v-if="importResult && !isImporting"
          class="p-3.5 rounded-xl text-xs space-y-1"
          :class="importResult.errors?.length > 0 ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'"
        >
          <div class="font-semibold">
            Hasil: {{ importResult.importedCount }} lead berhasil disimpan, {{ importResult.skippedCount }} dilewati.
          </div>
          <div v-if="importResult.errors?.length > 0" class="text-amber-800 mt-1 max-h-24 overflow-y-auto space-y-0.5">
            <div v-for="(err, idx) in importResult.errors" :key="idx">• {{ err }}</div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2.5">
          <BaseButton
            type="button"
            variant="outline"
            @click="closeImportModal"
            :disabled="isImporting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            @click="handleStartImport"
            :disabled="!importFile || isImporting"
          >
            <template v-if="isImporting">
              <RefreshCw class="w-4 h-4 mr-1.5 animate-spin" />
              Mengimpor...
            </template>
            <template v-else>
              <Upload class="w-4 h-4 mr-1.5" />
              Mulai Impor
            </template>
          </BaseButton>
        </div>
      </template>
    </BaseModal>

  </div>
</template>
