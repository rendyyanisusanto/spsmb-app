<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  getLeadDetail,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getLeadStatuses,
  getLeadOfficers,
  getLeadActivities,
  addLeadActivity,
  updateLeadSchedule,
  previewLeadMessage,
  sendManualWhatsApp
} from '@/services/crmLeadService'
import { getCrmTemplates } from '@/services/crmTemplateService'
import { getInstitutions } from '@/services/institutionService'
import { CRM_LEAD_STATUS, CRM_LEAD_STATUS_LABELS, CRM_LEAD_STATUS_BADGES } from '@/constants/crmLeadStatus'
import {
  CRM_ACTIVITY_TYPES,
  CRM_ACTIVITY_TYPE_LABELS,
  CRM_ACTIVITY_BADGES,
  CRM_MESSAGE_STATUS_BADGES
} from '@/constants/crmActivity'
import { formatDate } from '@/utils/date'
import { formatPhoneDisplay } from '@/utils/phone'

import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

import {
  ArrowLeft,
  UserCheck,
  Edit,
  RefreshCw,
  Trash2,
  Phone,
  Building2,
  Calendar,
  Clock,
  User,
  School,
  MapPin,
  Heart,
  FileText,
  ExternalLink,
  History,
  Sparkles,
  HelpCircle,
  Users,
  Send,
  MessageCircle,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { user, hasRole } = useAuth()
const leadId = route.params.id

const lead = ref(null)
const loading = ref(true)
const error = ref('')

// Activities State
const activities = ref([])
const loadingActivities = ref(false)

// Toast Notification
const notification = ref({ show: false, type: 'success', message: '' })
const showToast = (message, type = 'success') => {
  notification.value = { show: true, type, message }
  setTimeout(() => {
    notification.value.show = false
  }, 4000)
}

// Quick Status Modal
const isStatusModalOpen = ref(false)
const statusSubmitting = ref(false)
const statusOptions = ref([])
const newStatusForm = ref({
  status: '',
  notes: ''
})

// Edit Modal
const isEditModalOpen = ref(false)
const editSubmitting = ref(false)
const officerOptions = ref([])
const institutions = ref([])
const editForm = ref({
  institution_id: '',
  full_name: '',
  school_origin: '',
  address: '',
  phone: '',
  father_name: '',
  mother_name: '',
  interest: '',
  status: '',
  lead_source: '',
  lead_by_user_id: '',
  notes: '',
  status_notes: ''
})

// Delete Modal
const isDeleteModalOpen = ref(false)
const deleteSubmitting = ref(false)

// WhatsApp Manual Modal
const isSendWaModalOpen = ref(false)
const sendWaSubmitting = ref(false)
const crmTemplates = ref([])
const sendWaForm = ref({
  template_id: '',
  phone: '',
  message: '',
  previewRendered: '',
  missingVariables: [],
  allow_unrendered: false
})

// Schedule Follow-up Modal
const isScheduleModalOpen = ref(false)
const scheduleSubmitting = ref(false)
const scheduleForm = ref({
  next_follow_up_at: '',
  notes: ''
})

// Add Activity (Catatan / Telepon / Konsultasi) Modal
const isActivityModalOpen = ref(false)
const activitySubmitting = ref(false)
const activityForm = ref({
  activity_type: CRM_ACTIVITY_TYPES.NOTE,
  subject: '',
  description: ''
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

const isFollowUpOverdue = computed(() => {
  if (!lead.value?.nextFollowUpAt) return false
  return new Date(lead.value.nextFollowUpAt).getTime() < Date.now()
})

const fetchDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getLeadDetail(leadId)
    lead.value = (res && res.id) ? res : (res?.data || res)
  } catch (err) {
    error.value = err.message || 'Gagal memuat detail lead'
  } finally {
    loading.value = false
  }
}

const fetchActivities = async () => {
  loadingActivities.value = true
  try {
    const res = await getLeadActivities(leadId)
    activities.value = res.data || res || []
  } catch (err) {
    console.error('Gagal memuat riwayat aktivitas:', err)
  } finally {
    loadingActivities.value = false
  }
}

const formatMissingVariables = (vars) => {
  return (vars || []).map(v => '{{' + v + '}}').join(', ')
}

const loadLookups = async () => {
  try {
    const [statuses, officers, insts, tpls] = await Promise.all([
      getLeadStatuses().catch(() => []),
      getLeadOfficers().catch(() => []),
      getInstitutions().catch(() => ({ data: [] })),
      getCrmTemplates({ isActive: 1, limit: 100 }).catch(() => ({ data: [] }))
    ])
    statusOptions.value = Array.isArray(statuses) ? statuses : []
    officerOptions.value = Array.isArray(officers) ? officers : []
    institutions.value = insts.data || insts || []
    crmTemplates.value = tpls.data || tpls || []
  } catch (e) {
    console.error(e)
  }
}

// Open Status Modal
const openStatusModal = () => {
  if (!lead.value) return
  newStatusForm.value = {
    status: lead.value.status,
    notes: ''
  }
  isStatusModalOpen.value = true
}

const submitStatusChange = async () => {
  if (!newStatusForm.value.status) return
  statusSubmitting.value = true
  try {
    await updateLeadStatus(leadId, {
      status: newStatusForm.value.status,
      notes: newStatusForm.value.notes ? newStatusForm.value.notes.trim() : null
    })
    showToast('Status lead berhasil diperbarui!')
    isStatusModalOpen.value = false
    await fetchDetail()
    await fetchActivities()
  } catch (err) {
    showToast(err.message || 'Gagal mengubah status', 'error')
  } finally {
    statusSubmitting.value = false
  }
}

// Open Edit Modal
const openEditModal = () => {
  if (!lead.value) return
  editForm.value = {
    institution_id: lead.value.institutionId || lead.value.institution?.id || '',
    full_name: lead.value.fullName || '',
    school_origin: lead.value.schoolOrigin || '',
    address: lead.value.address || '',
    phone: lead.value.phone || '',
    father_name: lead.value.fatherName || '',
    mother_name: lead.value.motherName || '',
    interest: lead.value.interest || '',
    status: lead.value.status || '',
    lead_source: lead.value.leadSource || '',
    lead_by_user_id: lead.value.leadBy?.id || '',
    notes: lead.value.notes || '',
    status_notes: ''
  }
  isEditModalOpen.value = true
}

const submitEdit = async () => {
  if (!editForm.value.full_name || editForm.value.full_name.trim() === '') {
    showToast('Nama lengkap wajib diisi', 'error')
    return
  }

  editSubmitting.value = true
  try {
    const payload = {
      institution_id: Number(editForm.value.institution_id),
      full_name: editForm.value.full_name.trim(),
      school_origin: editForm.value.school_origin ? editForm.value.school_origin.trim() : null,
      address: editForm.value.address ? editForm.value.address.trim() : null,
      phone: editForm.value.phone ? editForm.value.phone.trim() : null,
      father_name: editForm.value.father_name ? editForm.value.father_name.trim() : null,
      mother_name: editForm.value.mother_name ? editForm.value.mother_name.trim() : null,
      interest: editForm.value.interest ? editForm.value.interest.trim() : null,
      status: editForm.value.status,
      lead_source: editForm.value.lead_source ? editForm.value.lead_source.trim() : null,
      lead_by_user_id: editForm.value.lead_by_user_id ? Number(editForm.value.lead_by_user_id) : null,
      notes: editForm.value.notes ? editForm.value.notes.trim() : null,
      status_notes: editForm.value.status_notes ? editForm.value.status_notes.trim() : null
    }

    await updateLead(leadId, payload)
    showToast('Data lead berhasil diperbarui!')
    isEditModalOpen.value = false
    await fetchDetail()
  } catch (err) {
    showToast(err.message || 'Gagal memperbarui lead', 'error')
  } finally {
    editSubmitting.value = false
  }
}

// Delete
const confirmDelete = async () => {
  deleteSubmitting.value = true
  try {
    await deleteLead(leadId)
    showToast('Lead berhasil dihapus')
    isDeleteModalOpen.value = false
    router.push('/admin/crm/leads')
  } catch (err) {
    showToast(err.message || 'Gagal menghapus lead', 'error')
    deleteSubmitting.value = false
  }
}

// -------------------------------------------------------------
// SPRINT 2: WhatsApp Manual Modal Handlers
// -------------------------------------------------------------
const openSendWaModal = () => {
  if (!lead.value) return
  sendWaForm.value = {
    template_id: '',
    phone: lead.value.phone || '',
    message: '',
    previewRendered: '',
    missingVariables: [],
    allow_unrendered: false
  }
  isSendWaModalOpen.value = true
}

const handleTemplateSelect = async () => {
  if (!sendWaForm.value.template_id) return
  try {
    const res = await previewLeadMessage(leadId, {
      template_id: Number(sendWaForm.value.template_id)
    })
    sendWaForm.value.message = res.renderedText
    sendWaForm.value.missingVariables = res.missingVariables || []
  } catch (err) {
    showToast('Gagal memuat isi template', 'error')
  }
}

const submitSendWhatsApp = async () => {
  if (!sendWaForm.value.phone || sendWaForm.value.phone.trim() === '') {
    showToast('Nomor WhatsApp tujuan wajib diisi', 'error')
    return
  }
  if (!sendWaForm.value.message || sendWaForm.value.message.trim() === '') {
    showToast('Isi pesan WhatsApp tidak boleh kosong', 'error')
    return
  }

  sendWaSubmitting.value = true
  try {
    const payload = {
      phone: sendWaForm.value.phone.trim(),
      message: sendWaForm.value.message.trim(),
      template_id: sendWaForm.value.template_id ? Number(sendWaForm.value.template_id) : null,
      allow_unrendered: sendWaForm.value.allow_unrendered
    }

    const res = await sendManualWhatsApp(leadId, payload)
    showToast(res.message || 'Pesan WhatsApp berhasil dikirim!', 'success')
    isSendWaModalOpen.value = false
    await fetchDetail()
    await fetchActivities()
  } catch (err) {
    showToast(err.message || 'Gagal mengirim pesan WhatsApp via GOWA', 'error')
    await fetchActivities()
  } finally {
    sendWaSubmitting.value = false
  }
}

// -------------------------------------------------------------
// SPRINT 2: Follow-up Scheduling Modal Handlers
// -------------------------------------------------------------
const openScheduleModal = () => {
  if (!lead.value) return
  let formattedDate = ''
  if (lead.value.nextFollowUpAt) {
    const d = new Date(lead.value.nextFollowUpAt)
    const offset = d.getTimezoneOffset() * 60000
    formattedDate = new Date(d.getTime() - offset).toISOString().slice(0, 16)
  }

  scheduleForm.value = {
    next_follow_up_at: formattedDate,
    notes: ''
  }
  isScheduleModalOpen.value = true
}

const submitSchedule = async (isClearing = false) => {
  scheduleSubmitting.value = true
  try {
    const payload = {
      next_follow_up_at: isClearing ? null : (scheduleForm.value.next_follow_up_at || null),
      notes: scheduleForm.value.notes ? scheduleForm.value.notes.trim() : null
    }

    await updateLeadSchedule(leadId, payload)
    showToast(isClearing ? 'Jadwal follow-up berhasil dihapus' : 'Jadwal follow-up berhasil diperbarui!')
    isScheduleModalOpen.value = false
    await fetchDetail()
    await fetchActivities()
  } catch (err) {
    showToast(err.message || 'Gagal memperbarui jadwal', 'error')
  } finally {
    scheduleSubmitting.value = false
  }
}

// -------------------------------------------------------------
// SPRINT 2: Manual Activity Recording (Catatan / Telepon / Konsultasi)
// -------------------------------------------------------------
const openActivityModal = (type = CRM_ACTIVITY_TYPES.NOTE) => {
  activityForm.value = {
    activity_type: type,
    subject: '',
    description: ''
  }
  isActivityModalOpen.value = true
}

const submitActivity = async () => {
  if (!activityForm.value.description.trim() && !activityForm.value.subject.trim()) {
    showToast('Subjek atau catatan tindak lanjut wajib diisi', 'error')
    return
  }

  activitySubmitting.value = true
  try {
    await addLeadActivity(leadId, {
      activity_type: activityForm.value.activity_type,
      subject: activityForm.value.subject ? activityForm.value.subject.trim() : null,
      description: activityForm.value.description ? activityForm.value.description.trim() : null
    })

    showToast('Aktivitas follow-up berhasil dicatat!')
    isActivityModalOpen.value = false
    await fetchDetail()
    await fetchActivities()
  } catch (err) {
    showToast(err.message || 'Gagal mencatat aktivitas', 'error')
  } finally {
    activitySubmitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchDetail(), loadLookups(), fetchActivities()])
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

    <!-- Back Button & Top Navigation -->
    <div class="flex items-center justify-between">
      <router-link
        to="/admin/crm/leads"
        class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        Kembali ke Daftar Lead
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white p-12 rounded-2xl border border-slate-200">
      <BaseLoading message="Memuat detail data lead..." />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-white p-8 rounded-2xl border border-slate-200">
      <BaseErrorState :message="error" @retry="fetchDetail" />
    </div>

    <!-- Detail Content -->
    <div v-else-if="lead" class="space-y-6">
      <!-- Main Profile Banner Card -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center font-bold text-xl">
            {{ (lead.fullName || '?').charAt(0).toUpperCase() }}
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl font-bold text-slate-900 leading-tight">{{ lead.fullName }}</h1>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                :class="CRM_LEAD_STATUS_BADGES[lead.status]?.colorClasses || 'bg-slate-100 text-slate-700'"
              >
                {{ lead.statusLabel }}
              </span>

              <!-- Overdue / Upcoming Follow-up Indicator Badge -->
              <span
                v-if="lead.nextFollowUpAt && isFollowUpOverdue"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                title="Jadwal tindak lanjut telah melewati batas waktu!"
              >
                <AlertTriangle class="w-3.5 h-3.5" /> Follow-up Jatuh Tempo: {{ formatDate(lead.nextFollowUpAt, true) }}
              </span>
              <span
                v-else-if="lead.nextFollowUpAt"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-800 border border-cyan-200"
              >
                <CalendarClock class="w-3.5 h-3.5 text-cyan-600" /> Jadwal Follow-up: {{ formatDate(lead.nextFollowUpAt, true) }}
              </span>
            </div>
            
            <div class="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span class="inline-flex items-center gap-1 font-medium text-slate-700">
                <Building2 class="w-3.5 h-3.5 text-slate-400" />
                {{ lead.institution?.name || '-' }}
              </span>
              <span class="text-slate-300">•</span>
              <span class="inline-flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 text-slate-400" />
                Dicatat {{ formatDate(lead.createdAt, true) }}
              </span>
              <span v-if="lead.lastContactedAt" class="text-slate-300">•</span>
              <span v-if="lead.lastContactedAt" class="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Clock class="w-3.5 h-3.5" />
                Dihubungi {{ formatDate(lead.lastContactedAt, true) }}
              </span>
              <span v-if="lead.application" class="text-slate-300">•</span>
              <span v-if="lead.application" class="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Terhubung Aplikasi: {{ lead.application.registrationNumber }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Kirim WhatsApp Button (Prominent) -->
          <BaseButton
            @click="openSendWaModal"
            variant="primary"
            size="sm"
            class="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
          >
            <Send class="w-4 h-4 mr-1.5" />
            Kirim WhatsApp
          </BaseButton>

          <!-- Atur Jadwal Follow-up -->
          <BaseButton
            @click="openScheduleModal"
            variant="outline"
            size="sm"
            class="text-cyan-800 border-cyan-200 hover:bg-cyan-50"
          >
            <CalendarClock class="w-4 h-4 mr-1.5" />
            Atur Jadwal
          </BaseButton>

          <BaseButton
            @click="openStatusModal"
            variant="outline"
            size="sm"
            class="text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw class="w-4 h-4 mr-1.5" />
            Ubah Status
          </BaseButton>

          <BaseButton
            @click="openEditModal"
            variant="secondary"
            size="sm"
          >
            <Edit class="w-4 h-4 mr-1.5" />
            Edit Data
          </BaseButton>

          <BaseButton
            @click="isDeleteModalOpen = true"
            variant="outline"
            size="sm"
            class="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 class="w-4 h-4 mr-1.5" />
            Hapus
          </BaseButton>
        </div>
      </div>

      <!-- Information Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Column 1: Identitas Calon Peserta -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User class="w-4 h-4 text-emerald-600" />
            <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">Identitas Calon Peserta</h2>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <div class="text-slate-400 mb-0.5">Nama Lengkap</div>
              <div class="font-semibold text-slate-800 text-sm">{{ lead.fullName }}</div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">SMP / Sekolah Asal</div>
              <div class="font-medium text-slate-700 flex items-center gap-1">
                <School class="w-3.5 h-3.5 text-slate-400" />
                {{ lead.schoolOrigin || '-' }}
              </div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">Nomor HP / WhatsApp</div>
              <div class="font-mono text-slate-800 text-sm flex items-center justify-between">
                <span>{{ formatPhoneDisplay(lead.phone) }}</span>
                <a
                  v-if="lead.phone"
                  :href="`https://wa.me/${lead.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`"
                  target="_blank"
                  class="inline-flex items-center gap-1 text-[0.7rem] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-sans font-medium hover:bg-emerald-100"
                >
                  <Phone class="w-3 h-3" /> Chat WA
                </a>
              </div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">Alamat Tempat Tinggal</div>
              <div class="text-slate-700 leading-relaxed flex items-start gap-1">
                <MapPin class="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>{{ lead.address || '-' }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <div class="text-slate-400 mb-0.5">Nama Ayah</div>
                <div class="font-medium text-slate-700">{{ lead.fatherName || '-' }}</div>
              </div>
              <div>
                <div class="text-slate-400 mb-0.5">Nama Ibu</div>
                <div class="font-medium text-slate-700">{{ lead.motherName || '-' }}</div>
              </div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">Minat Jurusan / Program</div>
              <div class="font-medium text-slate-800 flex items-center gap-1">
                <Heart class="w-3.5 h-3.5 text-rose-500" />
                {{ lead.interest || '-' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Column 2: Data Manajemen Lead & Kontak -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserCheck class="w-4 h-4 text-emerald-600" />
            <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">Informasi Manajemen Prospek</h2>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <div class="text-slate-400 mb-0.5">Lembaga Pemilik Lead</div>
              <div class="font-semibold text-slate-800">
                {{ lead.institution?.name || '-' }}
                <span v-if="lead.institution?.code" class="text-slate-500 font-normal">({{ lead.institution.code }})</span>
              </div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">Petugas Penangan (Lead By)</div>
              <div v-if="lead.leadBy" class="font-medium text-slate-800 flex items-center justify-between">
                <div>
                  <span>{{ lead.leadBy.name }}</span>
                  <span class="text-slate-400 text-[0.7rem] block">@{{ lead.leadBy.username }}</span>
                </div>
                <span v-if="lead.leadBy.phone" class="font-mono text-slate-500 text-[0.7rem]">{{ lead.leadBy.phone }}</span>
              </div>
              <div v-else class="text-slate-400 italic">Belum ada petugas yang ditugaskan</div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">Sumber Lead</div>
              <div class="font-medium text-slate-700">{{ lead.leadSource || '-' }}</div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">Waktu Terakhir Dihubungi</div>
              <div class="text-slate-700 font-medium">
                {{ lead.lastContactedAt ? formatDate(lead.lastContactedAt, true) : 'Belum pernah dihubungi' }}
              </div>
            </div>

            <div>
              <div class="text-slate-400 mb-0.5">Jadwal Tindak Lanjut Berikutnya</div>
              <div class="flex items-center justify-between">
                <span class="text-slate-800 font-medium">
                  {{ lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt, true) : 'Belum dijadwalkan' }}
                </span>
                <button
                  @click="openScheduleModal"
                  class="text-[0.7rem] text-cyan-700 font-semibold hover:underline"
                >
                  Ubah
                </button>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100">
              <div class="text-slate-400 mb-0.5">Dibuat Oleh Petugas</div>
              <div v-if="lead.createdBy" class="text-slate-700">
                {{ lead.createdBy.name }}
                <span class="text-slate-400 text-xs">(@{{ lead.createdBy.username }})</span>
              </div>
              <div v-else class="text-slate-400 italic">
                Sistem / Tidak diketahui
              </div>
            </div>

            <!-- Referensi Aplikasi Pendaftaran -->
            <div v-if="lead.application" class="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="text-emerald-800 font-semibold mb-1 flex items-center gap-1">
                <FileText class="w-3.5 h-3.5" /> Referensi Pendaftaran Terhubung
              </div>
              <div class="text-[0.72rem] text-emerald-900">
                No. Registrasi: <span class="font-mono font-bold">{{ lead.application.registrationNumber }}</span>
              </div>
              <div class="text-[0.7rem] text-emerald-700 mt-0.5">
                Status: {{ lead.application.status }}
              </div>
              <router-link
                :to="`/admin/pendaftar/${lead.application.id}`"
                class="inline-flex items-center gap-1 text-[0.7rem] text-emerald-800 underline font-semibold mt-1 hover:text-emerald-950"
              >
                Lihat Detail Pendaftar <ExternalLink class="w-3 h-3" />
              </router-link>
            </div>
          </div>
        </div>

        <!-- Column 3: Catatan & Akses Cepat Follow-up -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText class="w-4 h-4 text-emerald-600" />
              <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">Catatan & Ringkasan Lead</h2>
            </div>

            <div class="mt-3">
              <div v-if="lead.notes" class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {{ lead.notes }}
              </div>
              <div v-else class="text-slate-400 italic text-xs p-3">
                Tidak ada catatan khusus pada data calon siswa ini.
              </div>
            </div>
          </div>

          <!-- Quick Activity Actions Box -->
          <div class="pt-4 border-t border-slate-100 mt-4 space-y-2">
            <div class="text-[0.7rem] uppercase font-bold text-slate-400">Catat Aktivitas Cepat:</div>
            <div class="grid grid-cols-3 gap-2">
              <button
                @click="openActivityModal(CRM_ACTIVITY_TYPES.NOTE)"
                class="px-2 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-center transition-colors"
              >
                + Catatan
              </button>
              <button
                @click="openActivityModal(CRM_ACTIVITY_TYPES.CALL)"
                class="px-2 py-2 text-xs rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700 font-medium text-center transition-colors"
              >
                + Telepon
              </button>
              <button
                @click="openActivityModal(CRM_ACTIVITY_TYPES.CONSULTATION)"
                class="px-2 py-2 text-xs rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-700 font-medium text-center transition-colors"
              >
                + Konsultasi
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- SPRINT 2: Riwayat Follow-up & Aktivitas Komunikasi -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center gap-2">
            <MessageCircle class="w-5 h-5 text-emerald-600" />
            <div>
              <h2 class="text-sm font-bold text-slate-800">Riwayat Follow-up & Komunikasi</h2>
              <p class="text-xs text-slate-500">Log lengkap seluruh pengiriman WhatsApp, telepon, konsultasi, dan catatan petugas</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <BaseButton
              @click="openSendWaModal"
              variant="outline"
              size="sm"
              class="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
            >
              <Send class="w-3.5 h-3.5 mr-1" />
              Kirim WhatsApp
            </BaseButton>

            <BaseButton
              @click="openActivityModal(CRM_ACTIVITY_TYPES.NOTE)"
              variant="secondary"
              size="sm"
              class="text-xs"
            >
              + Catat Follow-up
            </BaseButton>
          </div>
        </div>

        <div v-if="loadingActivities" class="p-8 text-center text-slate-400 text-xs">
          <BaseLoading message="Memuat riwayat follow-up..." />
        </div>

        <div v-else-if="activities.length === 0" class="p-8 text-center text-slate-400 text-xs">
          Belum ada aktivitas follow-up yang tercatat pada lead ini.
        </div>

        <!-- Activity Timeline -->
        <div v-else class="p-6 space-y-4">
          <div
            v-for="(act, idx) in activities"
            :key="act.id"
            class="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <!-- Activity Icon / Badge -->
            <div class="mt-0.5 shrink-0">
              <span
                class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold"
                :class="CRM_ACTIVITY_BADGES[act.activityType]?.colorClasses || 'bg-slate-100 text-slate-700'"
              >
                {{ CRM_ACTIVITY_TYPE_LABELS[act.activityType] || act.activityType }}
              </span>
            </div>

            <!-- Content Area -->
            <div class="flex-1 min-w-0 space-y-1.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="font-bold text-slate-800 text-xs sm:text-sm">
                  {{ act.subject || CRM_ACTIVITY_TYPE_LABELS[act.activityType] }}
                </div>
                <div class="text-[0.7rem] text-slate-400 font-mono">
                  {{ formatDate(act.createdAt, true) }}
                </div>
              </div>

              <!-- Message / Description -->
              <div
                v-if="act.messageContent"
                class="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line shadow-2xs"
              >
                {{ act.messageContent }}
              </div>
              <div
                v-else-if="act.description"
                class="text-xs text-slate-600 leading-relaxed whitespace-pre-line"
              >
                {{ act.description }}
              </div>

              <!-- Extra Meta: Delivery Status, Template, Officer -->
              <div class="flex flex-wrap items-center gap-2 text-[0.7rem] text-slate-400 pt-1">
                <span v-if="act.messageStatus" class="inline-flex items-center gap-1 font-semibold">
                  Status Pesan:
                  <span
                    class="px-2 py-0.5 rounded-full text-[0.65rem]"
                    :class="CRM_MESSAGE_STATUS_BADGES[act.messageStatus]?.colorClasses || 'bg-slate-100 text-slate-700'"
                  >
                    {{ CRM_MESSAGE_STATUS_BADGES[act.messageStatus]?.label || act.messageStatus }}
                  </span>
                </span>

                <span v-if="act.templateName" class="text-slate-300">•</span>
                <span v-if="act.templateName" class="text-slate-600">
                  Template: <strong>{{ act.templateName }}</strong>
                </span>

                <span v-if="act.providerMessageId" class="text-slate-300">•</span>
                <span v-if="act.providerMessageId" class="font-mono text-slate-400 text-[0.65rem]">
                  ID: {{ act.providerMessageId }}
                </span>

                <span class="text-slate-300">•</span>
                <span>Oleh: {{ act.createdBy?.name || 'Sistem' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Riwayat Perubahan Status (History Table) -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <History class="w-5 h-5 text-emerald-600" />
            <div>
              <h2 class="text-sm font-bold text-slate-800">Riwayat Perubahan Status</h2>
              <p class="text-xs text-slate-500">Log lengkap seluruh perubahan status dan catatan penanganan</p>
            </div>
          </div>
          <button
            @click="openStatusModal"
            class="text-xs text-emerald-700 font-semibold hover:underline"
          >
            + Update Status
          </button>
        </div>

        <div v-if="!lead.statusHistories || lead.statusHistories.length === 0" class="p-8 text-center text-slate-400 text-xs">
          Belum ada riwayat perubahan status.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[0.7rem]">
              <tr>
                <th class="py-3 px-4 w-12 text-center">No</th>
                <th class="py-3 px-4 min-w-[150px]">Waktu Perubahan</th>
                <th class="py-3 px-4 min-w-[200px]">Perubahan Status</th>
                <th class="py-3 px-4 min-w-[160px]">Diubah Oleh</th>
                <th class="py-3 px-4 min-w-[250px]">Catatan Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(hist, idx) in lead.statusHistories"
                :key="hist.id"
                class="hover:bg-slate-50/60 transition-colors"
              >
                <td class="py-3 px-4 text-center text-slate-400 font-medium">
                  {{ idx + 1 }}
                </td>

                <td class="py-3 px-4 text-slate-600 font-mono text-[0.75rem] whitespace-nowrap">
                  {{ formatDate(hist.createdAt, true) }}
                </td>

                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <span v-if="hist.previousStatus" class="inline-flex items-center px-2 py-0.5 rounded text-[0.7rem] bg-slate-100 text-slate-600 font-medium">
                      {{ hist.previousStatusLabel }}
                    </span>
                    <span v-else class="text-slate-400 italic text-[0.7rem]">(Awal)</span>
                    
                    <span class="text-slate-400">→</span>

                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-semibold"
                      :class="CRM_LEAD_STATUS_BADGES[hist.newStatus]?.colorClasses || 'bg-slate-100 text-slate-700'"
                    >
                      {{ hist.newStatusLabel }}
                    </span>
                  </div>
                </td>

                <td class="py-3 px-4 font-medium text-slate-700">
                  {{ hist.changedBy?.name }}
                  <span class="text-slate-400 text-[0.7rem] block">@{{ hist.changedBy?.username }}</span>
                </td>

                <td class="py-3 px-4 text-slate-600 text-xs">
                  <span v-if="hist.notes" class="leading-relaxed whitespace-pre-line">{{ hist.notes }}</span>
                  <span v-else class="text-slate-400 italic">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SPRINT 2 MODAL: Kirim WhatsApp Manual -->
    <BaseModal
      :open="isSendWaModalOpen"
      title="Kirim WhatsApp Manual via GOWA"
      size="xl"
      @close="isSendWaModalOpen = false"
    >
      <form @submit.prevent="submitSendWhatsApp" class="space-y-4">
        <!-- Candidate Target Card -->
        <div class="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="text-slate-500 text-[0.7rem]">Tujuan Penerima:</div>
            <div class="font-bold text-slate-800 text-sm">{{ lead?.fullName }}</div>
            <div class="text-slate-600 font-mono">{{ formatPhoneDisplay(lead?.phone) }}</div>
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
          <span class="text-[0.7rem] text-slate-400 mt-1 block">Otomatis dinormalisasi ke format internasional (628...)</span>
        </div>

        <!-- Pilih Template -->
        <div>
          <label class="text-xs font-medium text-slate-700 block mb-1">Gunakan Template Pesan (Opsional)</label>
          <select
            v-model="sendWaForm.template_id"
            @change="handleTemplateSelect"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Pilih Template Promosi / Follow-up --</option>
            <option v-for="tpl in crmTemplates" :key="tpl.id" :value="tpl.id">
              {{ tpl.name }} ({{ tpl.institution?.code || 'Global' }})
            </option>
          </select>
        </div>

        <!-- Warning Missing Variables if any -->
        <div
          v-if="sendWaForm.missingVariables.length > 0"
          class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div class="flex-1">
            <div class="font-semibold">Perhatian: Variabel Belum Terisi Lengkap</div>
            <p class="text-[0.72rem] text-amber-700 mt-0.5">
              Variabel berikut tidak memiliki data pada lead ini:
              <strong>{{ formatMissingVariables(sendWaForm.missingVariables) }}</strong>.
              Harap periksa atau edit draf pesan sebelum mengirim.
            </p>
          </div>
        </div>

        <!-- Message Body Textarea (Editable) -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-medium text-slate-700">Draf Pesan WhatsApp (Dapat Diedit)</label>
            <span class="text-[0.7rem] text-slate-400">{{ sendWaForm.message.length }} karakter</span>
          </div>

          <BaseTextarea
            v-model="sendWaForm.message"
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
            Kirim WhatsApp Sekarang
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- SPRINT 2 MODAL: Atur Jadwal Follow-up -->
    <BaseModal
      :open="isScheduleModalOpen"
      title="Atur Jadwal Tindak Lanjut (Follow-up)"
      size="md"
      @close="isScheduleModalOpen = false"
    >
      <form @submit.prevent="submitSchedule(false)" class="space-y-4">
        <div>
          <label class="text-xs font-medium text-slate-700 block mb-1">Tanggal & Waktu Follow-up Berikutnya</label>
          <input
            v-model="scheduleForm.next_follow_up_at"
            type="datetime-local"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
          />
          <span class="text-[0.7rem] text-slate-400 mt-1 block">
            Jadwal ini hanya berfungsi sebagai pengingat petugas dan <strong>tidak mengirim WhatsApp otomatis</strong>.
          </span>
        </div>

        <div>
          <BaseTextarea
            v-model="scheduleForm.notes"
            label="Catatan Pengingat (Opsional)"
            placeholder="Contoh: Telepon kembali setelah calon siswa menerima SKL..."
            rows="3"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <div>
            <button
              v-if="lead?.nextFollowUpAt"
              type="button"
              @click="submitSchedule(true)"
              class="text-xs text-rose-600 font-semibold hover:underline"
              :disabled="scheduleSubmitting"
            >
              Hapus Jadwal
            </button>
          </div>
          <div class="flex gap-2">
            <BaseButton
              type="button"
              variant="outline"
              @click="isScheduleModalOpen = false"
              :disabled="scheduleSubmitting"
            >
              Batal
            </BaseButton>
            <BaseButton
              type="button"
              variant="primary"
              @click="submitSchedule(false)"
              :loading="scheduleSubmitting"
            >
              Simpan Jadwal
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- SPRINT 2 MODAL: Catat Aktivitas Manual (Catatan / Telepon / Konsultasi) -->
    <BaseModal
      :open="isActivityModalOpen"
      title="Catat Aktivitas Follow-up"
      size="md"
      @close="isActivityModalOpen = false"
    >
      <form @submit.prevent="submitActivity" class="space-y-4">
        <div>
          <label class="text-xs font-medium text-slate-700 block mb-1">Jenis Aktivitas</label>
          <select
            v-model="activityForm.activity_type"
            class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option :value="CRM_ACTIVITY_TYPES.NOTE">Catatan Internal</option>
            <option :value="CRM_ACTIVITY_TYPES.CALL">Panggilan Telepon</option>
            <option :value="CRM_ACTIVITY_TYPES.CONSULTATION">Konsultasi / Kunjungan Langsung</option>
          </select>
        </div>

        <div>
          <BaseInput
            v-model="activityForm.subject"
            label="Subjek / Topik Pembicaraan"
            placeholder="Contoh: Konfirmasi Minat Asrama"
          />
        </div>

        <div>
          <BaseTextarea
            v-model="activityForm.description"
            label="Catatan Hasil Tindak Lanjut"
            placeholder="Tuliskan poin penting yang disampaikan atau disepakati..."
            rows="4"
            :required="true"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="isActivityModalOpen = false"
            :disabled="activitySubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            @click="submitActivity"
            :loading="activitySubmitting"
          >
            Simpan Aktivitas
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Ubah Status -->
    <BaseModal
      :open="isStatusModalOpen"
      title="Perbarui Status Lead"
      size="md"
      @close="isStatusModalOpen = false"
    >
      <div v-if="lead" class="space-y-4">
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div class="text-slate-500">Calon Peserta Didik:</div>
          <div class="font-bold text-slate-800 text-sm">{{ lead.fullName }}</div>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-slate-500">Status Saat Ini:</span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full font-semibold"
              :class="CRM_LEAD_STATUS_BADGES[lead.status]?.colorClasses || 'bg-slate-100 text-slate-700'"
            >
              {{ lead.statusLabel }}
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
            placeholder="Jelaskan alasan perubahan atau ringkasan hasil follow-up..."
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

    <!-- Modal Edit Lead -->
    <BaseModal
      :open="isEditModalOpen"
      title="Edit Data Lead"
      size="2xl"
      @close="isEditModalOpen = false"
    >
      <form @submit.prevent="submitEdit" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Lembaga -->
          <div>
            <label class="text-xs font-medium text-slate-700 block mb-1">Lembaga</label>
            <select
              v-if="canChooseInstitution"
              v-model="editForm.institution_id"
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
              :disabled="!isSuperAdmin"
            >
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
                <span class="truncate">
                  {{ lead.institution?.name || '-' }}
                  <span v-if="lead.institution?.code">({{ lead.institution.code }})</span>
                </span>
              </div>
              <span class="text-[0.65rem] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                Otomatis
              </span>
            </div>
          </div>

          <!-- Nama Lengkap -->
          <div>
            <BaseInput
              v-model="editForm.full_name"
              label="Nama Calon Peserta Didik"
              :required="true"
            />
          </div>

          <!-- SMP Asal -->
          <div>
            <BaseInput
              v-model="editForm.school_origin"
              label="SMP / MTs Asal"
            />
          </div>

          <!-- No HP / WhatsApp -->
          <div>
            <BaseInput
              v-model="editForm.phone"
              label="No. HP / WhatsApp"
            />
          </div>

          <!-- Nama Ayah -->
          <div>
            <BaseInput
              v-model="editForm.father_name"
              label="Nama Ayah"
            />
          </div>

          <!-- Nama Ibu -->
          <div>
            <BaseInput
              v-model="editForm.mother_name"
              label="Nama Ibu"
            />
          </div>

          <!-- Minat / Jurusan -->
          <div>
            <BaseInput
              v-model="editForm.interest"
              label="Minat / Program Pilihan"
            />
          </div>

          <!-- Status Lead -->
          <div>
            <label class="text-xs font-medium text-slate-700 block mb-1">Status Lead</label>
            <select
              v-model="editForm.status"
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
              v-model="editForm.lead_by_user_id"
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
              v-model="editForm.lead_source"
              label="Sumber Informasi Lead"
            />
          </div>
        </div>

        <!-- Alamat -->
        <div>
          <BaseTextarea
            v-model="editForm.address"
            label="Alamat Lengkap"
            rows="2"
          />
        </div>

        <!-- Catatan Tambahan -->
        <div>
          <BaseTextarea
            v-model="editForm.notes"
            label="Catatan Tambahan"
            rows="2"
          />
        </div>

        <!-- Catatan Riwayat jika status diubah -->
        <div>
          <BaseInput
            v-model="editForm.status_notes"
            label="Catatan Perubahan Status (Jika Mengubah Status)"
            placeholder="Jelaskan alasan atau konteks perubahan..."
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="isEditModalOpen = false"
            :disabled="editSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            @click="submitEdit"
            :loading="editSubmitting"
          >
            Simpan Perubahan
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Konfirmasi Hapus -->
    <BaseConfirmModal
      :open="isDeleteModalOpen"
      title="Hapus Data Lead"
      :message="`Apakah Anda yakin ingin menghapus data lead '${lead?.fullName}'? Tindakan ini akan menghapus data lead dan seluruh riwayat perubahannya tanpa memengaruhi data pendaftar SPSMB.`"
      confirmText="Ya, Hapus Lead"
      cancelText="Batal"
      confirmVariant="danger"
      :loading="deleteSubmitting"
      @close="isDeleteModalOpen = false"
      @confirm="confirmDelete"
    />

  </div>
</template>
