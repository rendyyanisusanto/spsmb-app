<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import {
  getSchoolById,
  updateSchool,
  updateSchoolStatus,
  getStatusHistories,
  previewLetter,
  issueLetter,
  getLetters,
  getLetterById,
  getReports,
  createReport,
  updateReport,
  deleteReport,
  uploadPhotos,
  deletePhoto
} from '@/services/crmSchoolService';
import {
  CRM_SCHOOL_STATUS,
  CRM_SCHOOL_STATUS_LABELS,
  CRM_SCHOOL_STATUS_BADGES,
  EDUCATION_LEVEL_OPTIONS,
  getStatusBadge
} from '@/constants/crmSchoolStatus';
import { downloadLetterAsPdf, printLetterElement } from '@/utils/schoolLetterPdf';
import { resolveStorageUrl } from '@/utils/imageUrl';

import BaseLoading from '@/components/ui/BaseLoading.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseErrorState from '@/components/ui/BaseErrorState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';

import {
  ArrowLeft,
  School,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  Calendar,
  CalendarClock,
  Clock,
  FileText,
  FileCheck,
  Printer,
  Download,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Camera,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Compass,
  Building2,
  MessageSquare,
  ShieldCheck,
  Send,
  X
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { user, hasRole } = useAuth();

const schoolId = computed(() => route.params.id);

// --- Permissions ---
const canManageLetterSettings = computed(() => hasRole(['SUPER_ADMIN', 'ADMIN_SPSMB']));

// --- States ---
const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref('');

const school = ref(null);
const statusHistories = ref([]);
const issuedLetters = ref([]);
const presentationReports = ref([]);

// Active / selected report for viewing photos or editing
const activeReportIndex = ref(0);

// --- Modal States ---
// 1. Edit School Modal
const isEditModalOpen = ref(false);
const isEditSubmitting = ref(false);
const editFormError = ref('');
const editForm = reactive({
  school_name: '',
  education_level: 'SMP',
  address: '',
  village: '',
  district: '',
  city_regency: '',
  province: 'Jawa Timur',
  principal_name: '',
  contact_person: '',
  contact_position: '',
  phone: '',
  email: '',
  source: '',
  team_text: '',
  internal_notes: ''
});

// 2. Status Modal
const isStatusModalOpen = ref(false);
const isStatusSubmitting = ref(false);
const statusFormError = ref('');
const statusForm = reactive({
  newStatus: '',
  note: '',
  scheduled_at: '',
  scheduled_location: '',
  rejection_reason: ''
});

// 3. Issue Letter Modal (Live Preview & Issue)
const isLetterModalOpen = ref(false);
const isLetterLoading = ref(false);
const isLetterIssuing = ref(false);
const letterError = ref('');
const letterPreviewData = ref(null);
const letterIssueDate = ref(new Date().toISOString().split('T')[0]);
const letterPaperRef = ref(null);

// 4. View Saved Letter Snapshot Modal
const isSnapshotModalOpen = ref(false);
const selectedSnapshot = ref(null);
const snapshotPaperRef = ref(null);

// 5. Presentation Report Modal (Create / Edit)
const isReportModalOpen = ref(false);
const isEditingReport = ref(false);
const editingReportId = ref(null);
const isReportSubmitting = ref(false);
const reportFormError = ref('');
const reportForm = reactive({
  held_at: '',
  location: '',
  team_text: '',
  participant_count: 0,
  summary: '',
  evaluation: '',
  school_response: '',
  obstacles: '',
  follow_up_plan: '',
  additional_notes: ''
});
const reportPhotosFiles = ref([]);

// 6. Photo Lightbox Modal
const isLightboxOpen = ref(false);
const activePhoto = ref(null);

// 7. Delete Confirmations
const isDeleteConfirmOpen = ref(false);
const deleteActionType = ref(''); // 'REPORT' or 'PHOTO'
const itemToDeleteId = ref(null);
const isDeleting = ref(false);

// --- Helpers ---
const formatDateDisplay = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (_) {
    return dateString;
  }
};

const formatDateTimeDisplay = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return dateString;
  }
};

// --- Data Fetching ---
const fetchAllDetail = async () => {
  isLoading.value = true;
  isError.value = false;
  errorMessage.value = '';

  try {
    const [schoolRes, histRes, lettersRes, reportsRes] = await Promise.all([
      getSchoolById(schoolId.value),
      getStatusHistories(schoolId.value),
      getLetters(schoolId.value),
      getReports(schoolId.value)
    ]);

    school.value = schoolRes.data;
    statusHistories.value = histRes.data || [];
    issuedLetters.value = lettersRes.data || [];
    presentationReports.value = reportsRes.data || [];
  } catch (err) {
    isError.value = true;
    errorMessage.value = err.message || 'Gagal memuat detail target sekolah.';
  } finally {
    isLoading.value = false;
  }
};

// --- Status Management ---
const openStatusModal = () => {
  if (!school.value) return;
  statusFormError.value = '';
  statusForm.newStatus = school.value.status;
  statusForm.note = '';
  statusForm.scheduled_at = school.value.scheduled_at ? school.value.scheduled_at.replace(' ', 'T').slice(0, 16) : '';
  statusForm.scheduled_location = school.value.scheduled_location || '';
  statusForm.rejection_reason = school.value.rejection_reason || '';
  isStatusModalOpen.value = true;
};

const handleSaveStatus = async () => {
  if (!statusForm.newStatus) {
    statusFormError.value = 'Silakan pilih status baru.';
    return;
  }

  isStatusSubmitting.value = true;
  statusFormError.value = '';

  try {
    const payload = {
      status: statusForm.newStatus,
      note: statusForm.note || `Status diubah menjadi ${CRM_SCHOOL_STATUS_LABELS[statusForm.newStatus] || statusForm.newStatus}`
    };

    if (statusForm.newStatus === 'SCHEDULED') {
      payload.scheduled_at = statusForm.scheduled_at || null;
      payload.scheduled_location = statusForm.scheduled_location || null;
    } else if (statusForm.newStatus === 'REJECTED') {
      payload.rejection_reason = statusForm.rejection_reason || null;
    }

    await updateSchoolStatus(schoolId.value, payload);
    isStatusModalOpen.value = false;
    await fetchAllDetail();
  } catch (error) {
    statusFormError.value = error.message || 'Gagal memperbarui status target sekolah.';
  } finally {
    isStatusSubmitting.value = false;
  }
};

// --- Edit School Management ---
const openEditModal = () => {
  if (!school.value) return;
  editFormError.value = '';
  Object.assign(editForm, {
    school_name: school.value.school_name || '',
    education_level: school.value.education_level || 'SMP',
    address: school.value.address || '',
    village: school.value.village || '',
    district: school.value.district || '',
    city_regency: school.value.city_regency || '',
    province: school.value.province || 'Jawa Timur',
    principal_name: school.value.principal_name || '',
    contact_person: school.value.contact_person || '',
    contact_position: school.value.contact_position || '',
    phone: school.value.phone || '',
    email: school.value.email || '',
    source: school.value.source || '',
    team_text: school.value.team_text || '',
    internal_notes: school.value.internal_notes || ''
  });
  isEditModalOpen.value = true;
};

const handleSaveEdit = async () => {
  if (!editForm.school_name || editForm.school_name.trim() === '') {
    editFormError.value = 'Nama sekolah wajib diisi.';
    return;
  }

  isEditSubmitting.value = true;
  editFormError.value = '';

  try {
    await updateSchool(schoolId.value, editForm);
    isEditModalOpen.value = false;
    await fetchAllDetail();
  } catch (error) {
    editFormError.value = error.message || 'Gagal menyimpan perubahan data sekolah.';
  } finally {
    isEditSubmitting.value = false;
  }
};

// --- Letter Preview & Issuance ---
const openLetterModal = async () => {
  isLetterModalOpen.value = true;
  isLetterLoading.value = true;
  letterError.value = '';
  letterIssueDate.value = new Date().toISOString().split('T')[0];

  try {
    const res = await previewLetter(schoolId.value, { issue_date: letterIssueDate.value });
    letterPreviewData.value = res.data;
  } catch (error) {
    letterError.value = error.message || 'Gagal memuat pratinjau surat.';
  } finally {
    isLetterLoading.value = false;
  }
};

const handleRefreshPreview = async () => {
  isLetterLoading.value = true;
  letterError.value = '';
  try {
    const res = await previewLetter(schoolId.value, { issue_date: letterIssueDate.value });
    letterPreviewData.value = res.data;
  } catch (error) {
    letterError.value = error.message || 'Gagal memperbarui pratinjau surat.';
  } finally {
    isLetterLoading.value = false;
  }
};

const handleIssueLetter = async () => {
  isLetterIssuing.value = true;
  letterError.value = '';

  try {
    const res = await issueLetter(schoolId.value, { issue_date: letterIssueDate.value });
    await fetchAllDetail();

    // Open the snapshot viewer directly
    isLetterModalOpen.value = false;
    openSnapshotModal(res.data);
  } catch (error) {
    letterError.value = error.message || 'Gagal menerbitkan surat permohonan presentasi.';
  } finally {
    isLetterIssuing.value = false;
  }
};

const handleDownloadPdf = async (elementRef, filename) => {
  if (!elementRef) return;
  try {
    await downloadLetterAsPdf(elementRef, filename);
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e?.type ? `Event ${e.type}` : String(e));
    alert('Gagal mendownload PDF: ' + msg);
  }
};

const handlePrintLetter = (elementRef) => {
  if (!elementRef) return;
  printLetterElement(elementRef);
};

// --- Letter Snapshot Viewer ---
const openSnapshotModal = async (letter) => {
  try {
    const res = await getLetterById(letter.id);
    selectedSnapshot.value = res.data;
    isSnapshotModalOpen.value = true;
  } catch (e) {
    alert('Gagal memuat snapshot surat: ' + e.message);
  }
};

// --- Presentation Reports Management ---
const openCreateReportModal = () => {
  isEditingReport.value = false;
  editingReportId.value = null;
  reportFormError.value = '';
  reportPhotosFiles.value = [];

  Object.assign(reportForm, {
    held_at: new Date().toISOString().slice(0, 16),
    location: school.value?.scheduled_location || `Aula ${school.value?.school_name || ''}`,
    team_text: school.value?.team_text || '',
    participant_count: 50,
    summary: '',
    evaluation: '',
    school_response: '',
    obstacles: '',
    follow_up_plan: '',
    additional_notes: ''
  });

  isReportModalOpen.value = true;
};

const openEditReportModal = (report) => {
  isEditingReport.value = true;
  editingReportId.value = report.id;
  reportFormError.value = '';
  reportPhotosFiles.value = [];

  Object.assign(reportForm, {
    held_at: report.held_at ? report.held_at.replace(' ', 'T').slice(0, 16) : '',
    location: report.location || '',
    team_text: report.team_text || '',
    participant_count: report.participant_count || 0,
    summary: report.summary || '',
    evaluation: report.evaluation || '',
    school_response: report.school_response || '',
    obstacles: report.obstacles || '',
    follow_up_plan: report.follow_up_plan || '',
    additional_notes: report.additional_notes || ''
  });

  isReportModalOpen.value = true;
};

const onReportPhotosSelected = (e) => {
  const files = Array.from(e.target.files);
  reportPhotosFiles.value = files;
};

const handleSaveReport = async () => {
  if (!reportForm.held_at) {
    reportFormError.value = 'Waktu pelaksanaan presentasi wajib diisi.';
    return;
  }
  if (reportForm.participant_count === undefined || reportForm.participant_count < 0) {
    reportFormError.value = 'Jumlah peserta harus berupa angka bulat >= 0.';
    return;
  }

  isReportSubmitting.value = true;
  reportFormError.value = '';

  try {
    let savedReport;
    if (isEditingReport.value) {
      const res = await updateReport(editingReportId.value, reportForm);
      savedReport = res.data;
    } else {
      const res = await createReport(schoolId.value, reportForm);
      savedReport = res.data;
    }

    // Upload photos if any selected
    if (reportPhotosFiles.value.length > 0 && savedReport?.id) {
      const formData = new FormData();
      for (const file of reportPhotosFiles.value) {
        formData.append('photos', file);
      }
      await uploadPhotos(savedReport.id, formData);
    }

    isReportModalOpen.value = false;
    await fetchAllDetail();
  } catch (error) {
    reportFormError.value = error.message || 'Gagal menyimpan laporan presentasi.';
  } finally {
    isReportSubmitting.value = false;
  }
};

const confirmDeleteReport = (reportId) => {
  deleteActionType.value = 'REPORT';
  itemToDeleteId.value = reportId;
  isDeleteConfirmOpen.value = true;
};

const confirmDeletePhoto = (photoId) => {
  deleteActionType.value = 'PHOTO';
  itemToDeleteId.value = photoId;
  isDeleteConfirmOpen.value = true;
};

const handleConfirmDelete = async () => {
  isDeleting.value = true;
  try {
    if (deleteActionType.value === 'REPORT') {
      await deleteReport(itemToDeleteId.value);
    } else if (deleteActionType.value === 'PHOTO') {
      await deletePhoto(itemToDeleteId.value);
    }
    isDeleteConfirmOpen.value = false;
    await fetchAllDetail();
  } catch (error) {
    alert(error.message || 'Gagal menghapus data.');
  } finally {
    isDeleting.value = false;
  }
};

// Open photo in lightbox
const openLightbox = (photo) => {
  activePhoto.value = photo;
  isLightboxOpen.value = true;
};

onMounted(() => {
  fetchAllDetail();
});
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-16">
    <!-- Back & Header Actions Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div class="flex items-center gap-3.5">
        <button
          type="button"
          @click="router.push('/admin/crm/schools')"
          class="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Kembali ke Daftar Target"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>

        <div v-if="school">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-if="school.education_level"
              class="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {{ school.education_level }}
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="getStatusBadge(school.status).class">
              <span class="w-1.5 h-1.5 rounded-full" :class="getStatusBadge(school.status).dot"></span>
              {{ getStatusBadge(school.status).label }}
            </span>
          </div>

          <h1 class="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            {{ school.school_name }}
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
            <span class="flex items-center gap-1">
              <MapPin class="w-3.5 h-3.5 text-slate-400" />
              {{ [school.district, school.city_regency, school.province].filter(Boolean).join(', ') || 'Wilayah belum diset' }}
            </span>
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="school" class="flex items-center gap-2 flex-wrap">
        <BaseButton
          variant="outline"
          class="flex items-center gap-1.5 text-xs"
          @click="openStatusModal"
        >
          <RefreshCw class="w-4 h-4 text-amber-600" />
          Ubah Status
        </BaseButton>

        <BaseButton
          variant="outline"
          class="flex items-center gap-1.5 text-xs"
          @click="openEditModal"
        >
          <Edit class="w-4 h-4 text-slate-500" />
          Edit Data
        </BaseButton>

        <BaseButton
          variant="secondary"
          class="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
          @click="openLetterModal"
        >
          <FileText class="w-4 h-4 text-indigo-600" />
          Cetak / Terbitkan Surat
        </BaseButton>

        <BaseButton
          variant="primary"
          class="flex items-center gap-1.5 text-xs shadow-sm"
          @click="openCreateReportModal"
        >
          <Plus class="w-4 h-4" />
          Tambah Laporan
        </BaseButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-20">
      <BaseLoading text="Memuat detail target sekolah..." />
    </div>

    <!-- Error State -->
    <div v-else-if="isError" class="p-8">
      <BaseErrorState
        title="Gagal Memuat Target Sekolah"
        :message="errorMessage"
        @retry="fetchAllDetail"
      />
    </div>

    <!-- Main Detail Grid -->
    <div v-else-if="school" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: School Profile, Schedule, Team & Status History (5 cols) -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Card: Profil & Kontak Sekolah -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <School class="w-4 h-4 text-blue-600" />
              <h2 class="text-sm font-bold text-slate-900 dark:text-white">Profil & Kontak Sekolah</h2>
            </div>
            <button
              type="button"
              class="text-xs text-blue-600 hover:underline"
              @click="openEditModal"
            >
              Ubah
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <span class="text-slate-400 block mb-0.5">Alamat Lengkap</span>
              <p class="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {{ school.address || '-' }}
              </p>
              <p class="text-slate-500 mt-0.5">
                Desa: {{ school.village || '-' }} • Kec: {{ school.district || '-' }} • Kab/Kota: {{ school.city_regency || '-' }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <span class="text-slate-400 block mb-0.5">Kepala Sekolah</span>
                <p class="font-semibold text-slate-800 dark:text-slate-200">
                  {{ school.principal_name || '-' }}
                </p>
              </div>

              <div>
                <span class="text-slate-400 block mb-0.5">Kontak Person (PIC)</span>
                <p class="font-semibold text-slate-800 dark:text-slate-200">
                  {{ school.contact_person || '-' }}
                </p>
                <p v-if="school.contact_position" class="text-slate-500 text-[11px]">
                  {{ school.contact_position }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <span class="text-slate-400 block mb-0.5">Telepon / WhatsApp</span>
                <a
                  v-if="school.phone"
                  :href="`https://wa.me/${school.phone.replace(/[^0-9]/g, '')}`"
                  target="_blank"
                  class="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Phone class="w-3 h-3" />
                  {{ school.phone }}
                </a>
                <span v-else class="text-slate-500">-</span>
              </div>

              <div>
                <span class="text-slate-400 block mb-0.5">Email</span>
                <a
                  v-if="school.email"
                  :href="`mailto:${school.email}`"
                  class="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 truncate"
                >
                  <Mail class="w-3 h-3 shrink-0" />
                  <span class="truncate">{{ school.email }}</span>
                </a>
                <span v-else class="text-slate-500">-</span>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400">
              <span>Sumber Data: <strong class="text-slate-600 dark:text-slate-300 font-normal">{{ school.source || 'Manual CRM' }}</strong></span>
              <span>Dibuat: {{ formatDateDisplay(school.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Card: Jadwal, Lokasi & Tim Pelaksana -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <CalendarClock class="w-4 h-4 text-indigo-600" />
              <h2 class="text-sm font-bold text-slate-900 dark:text-white">Jadwal & Tim Pelaksana</h2>
            </div>
            <button
              type="button"
              class="text-xs text-indigo-600 hover:underline"
              @click="openStatusModal"
            >
              Atur Jadwal
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
              <Calendar class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span class="text-indigo-900 dark:text-indigo-300 font-semibold block">
                  {{ school.scheduled_at ? formatDateTimeDisplay(school.scheduled_at) : 'Belum Dijadwalkan' }}
                </span>
                <p class="text-slate-500 mt-0.5 text-[11px]">
                  Lokasi: <span class="text-slate-700 dark:text-slate-300 font-medium">{{ school.scheduled_location || 'Belum diset' }}</span>
                </p>
              </div>
            </div>

            <div>
              <span class="text-slate-400 block mb-0.5">Tim Pelaksana (Teks Bebas)</span>
              <p class="font-medium text-slate-800 dark:text-slate-200 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 leading-relaxed">
                {{ school.team_text || 'Belum ada tim yang ditugaskan' }}
              </p>
            </div>

            <div v-if="school.status === 'REJECTED' && school.rejection_reason" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <div class="font-semibold flex items-center gap-1.5 mb-1 text-rose-900">
                <XCircle class="w-4 h-4 text-rose-600" />
                <span>Alasan Penolakan Sekolah:</span>
              </div>
              <p>{{ school.rejection_reason }}</p>
            </div>
          </div>
        </div>

        <!-- Card: Catatan Internal Tim -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MessageSquare class="w-4 h-4 text-slate-600" />
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Catatan Internal</h2>
            <span class="text-[10px] text-slate-400 ml-auto italic">Tidak muncul di surat</span>
          </div>

          <p class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700">
            {{ school.internal_notes || 'Belum ada catatan internal untuk target sekolah ini.' }}
          </p>
        </div>

        <!-- Card: Riwayat Perubahan Status -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-slate-500" />
              <h2 class="text-sm font-bold text-slate-900 dark:text-white">Riwayat Status</h2>
            </div>
            <span class="text-xs text-slate-400 font-medium">{{ statusHistories.length }} Catatan</span>
          </div>

          <div v-if="statusHistories.length === 0" class="text-xs text-slate-400 italic py-2">
            Belum ada riwayat perubahan status.
          </div>

          <div v-else class="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            <div
              v-for="hist in statusHistories"
              :key="hist.id"
              class="relative flex items-start gap-3 text-xs pl-1"
            >
              <div class="w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 flex items-center justify-center shrink-0 z-10 mt-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              </div>

              <div class="flex-1 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="font-bold text-slate-800 dark:text-slate-200">
                    {{ CRM_SCHOOL_STATUS_LABELS[hist.new_status] || hist.new_status }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ formatDateTimeDisplay(hist.changed_at) }}
                  </span>
                </div>

                <p v-if="hist.note" class="text-slate-600 dark:text-slate-400 mt-1 text-[11px] leading-relaxed">
                  {{ hist.note }}
                </p>

                <div class="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <User class="w-3 h-3" />
                  <span>Oleh: {{ hist.changed_by_name || 'Sistem' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Issued Letters & Presentation Reports (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        <!-- Card: Riwayat Surat Permohonan Presentasi -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <FileText class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Surat Permohonan Presentasi</h2>
                <p class="text-xs text-slate-400">Snapshot resmi surat permohonan izin ke sekolah</p>
              </div>
            </div>

            <BaseButton
              variant="outline"
              size="sm"
              class="flex items-center gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              @click="openLetterModal"
            >
              <Plus class="w-4 h-4" />
              Terbitkan Surat Baru
            </BaseButton>
          </div>

          <!-- List of Issued Letters -->
          <div v-if="issuedLetters.length === 0" class="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <FileText class="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>Belum ada surat permohonan presentasi yang diterbitkan untuk sekolah ini.</p>
            <button
              type="button"
              class="mt-2 text-indigo-600 hover:underline font-semibold"
              @click="openLetterModal"
            >
              + Klik di sini untuk membuat pratinjau dan menerbitkan surat
            </button>
          </div>

          <div v-else class="space-y-2.5">
            <div
              v-for="letter in issuedLetters"
              :key="letter.id"
              class="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4 hover:border-indigo-300 transition"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {{ letter.letter_number }}
                  </span>
                  <span class="text-xs text-slate-500 font-medium">
                    {{ formatDateDisplay(letter.issue_date) }}
                  </span>
                </div>
                <div class="text-xs text-slate-600 dark:text-slate-400">
                  Tujuan: <strong>{{ letter.recipient_name_snapshot || letter.school_name_snapshot }}</strong>
                </div>
                <div class="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>Diterbitkan oleh: {{ letter.generated_by_name || 'Admin' }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200"
                  @click="openSnapshotModal(letter)"
                >
                  <Eye class="w-3.5 h-3.5 text-blue-500" />
                  Lihat & Cetak Ulang
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Card: Laporan Presentasi & Dokumentasi Foto -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <FileCheck class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Laporan Presentasi & Foto</h2>
                <p class="text-xs text-slate-400">Dokumentasi hasil sosialisasi dan evaluasi lapangan</p>
              </div>
            </div>

            <BaseButton
              variant="primary"
              size="sm"
              class="flex items-center gap-1.5 text-xs shadow-xs"
              @click="openCreateReportModal"
            >
              <Plus class="w-4 h-4" />
              Tambah Laporan
            </BaseButton>
          </div>

          <!-- Reports List / Accordion -->
          <div v-if="presentationReports.length === 0" class="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Camera class="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p>Belum ada laporan presentasi yang dicatat.</p>
            <p class="text-[11px] text-slate-400 mt-1">
              Catatan: Status <strong>Selesai (COMPLETED)</strong> membutuhkan minimal 1 laporan presentasi.
            </p>
            <BaseButton
              variant="outline"
              size="sm"
              class="mt-3 text-xs"
              @click="openCreateReportModal"
            >
              + Input Laporan Kunjungan Sekarang
            </BaseButton>
          </div>

          <div v-else class="space-y-5">
            <div
              v-for="(rep, idx) in presentationReports"
              :key="rep.id"
              class="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs space-y-4"
            >
              <!-- Report Header -->
              <div class="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Laporan Kunjungan #{{ idx + 1 }}
                    </span>
                    <span class="text-xs text-slate-500 font-medium">
                      {{ formatDateTimeDisplay(rep.held_at) }}
                    </span>
                  </div>
                  <div class="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-3">
                    <span class="flex items-center gap-1">
                      <MapPin class="w-3.5 h-3.5 text-slate-400" />
                      {{ rep.location || 'Lokasi belum diset' }}
                    </span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">
                      • {{ rep.participant_count }} Peserta Didik
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    class="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition"
                    title="Edit Laporan"
                    @click="openEditReportModal(rep)"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition"
                    title="Hapus Laporan"
                    @click="confirmDeleteReport(rep.id)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Report Body Details -->
              <div class="space-y-3 text-xs leading-relaxed">
                <div v-if="rep.team_text">
                  <span class="text-slate-400 block mb-0.5 font-medium">Tim Pelaksana</span>
                  <p class="text-slate-800 dark:text-slate-200 font-medium">{{ rep.team_text }}</p>
                </div>

                <div v-if="rep.summary">
                  <span class="text-slate-400 block mb-0.5 font-medium">Rangkuman Kegiatan & Materi</span>
                  <p class="text-slate-700 dark:text-slate-300 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                    {{ rep.summary }}
                  </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div v-if="rep.school_response">
                    <span class="text-slate-400 block mb-0.5 font-medium">Respons / Minat Siswa & Sekolah</span>
                    <p class="text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      {{ rep.school_response }}
                    </p>
                  </div>

                  <div v-if="rep.evaluation">
                    <span class="text-slate-400 block mb-0.5 font-medium">Evaluasi Lapangan</span>
                    <p class="text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      {{ rep.evaluation }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div v-if="rep.obstacles">
                    <span class="text-slate-400 block mb-0.5 font-medium">Kendala yang Dihadapi</span>
                    <p class="text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      {{ rep.obstacles }}
                    </p>
                  </div>

                  <div v-if="rep.follow_up_plan">
                    <span class="text-slate-400 block mb-0.5 font-medium">Rencana Tindak Lanjut</span>
                    <p class="text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      {{ rep.follow_up_plan }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Documentation Photos Gallery -->
              <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera class="w-3.5 h-3.5 text-emerald-600" />
                    Dokumentasi Foto ({{ rep.photos?.length || 0 }})
                  </span>
                </div>

                <div v-if="!rep.photos || rep.photos.length === 0" class="text-[11px] text-slate-400 italic">
                  Belum ada foto dokumentasi diunggah untuk laporan ini.
                </div>

                <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div
                    v-for="photo in rep.photos"
                    :key="photo.id"
                    class="group relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-4/3"
                  >
                    <img
                      :src="photo.file_path"
                      :alt="photo.caption || 'Foto Presentasi'"
                      class="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-300"
                      @click="openLightbox(photo)"
                    />

                    <!-- Photo Overlay Actions -->
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        class="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white transition"
                        title="Perbesar"
                        @click="openLightbox(photo)"
                      >
                        <Eye class="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        class="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition"
                        title="Hapus Foto"
                        @click="confirmDeletePhoto(photo.id)"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div v-if="photo.caption" class="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-2 py-0.5 truncate">
                      {{ photo.caption }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Terbitkan / Pratinjau Surat -->
    <BaseModal
      :open="isLetterModalOpen"
      title="Cetak & Terbitkan Surat Permohonan Presentasi"
      size="4xl"
      @close="isLetterModalOpen = false"
    >
      <div class="space-y-4">
        <!-- Controls Bar -->
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-700 dark:text-slate-300">Tanggal Surat:</span>
            <input
              v-model="letterIssueDate"
              type="date"
              @change="handleRefreshPreview"
              class="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div class="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              class="flex items-center gap-1.5 text-xs"
              @click="handlePrintLetter(letterPaperRef)"
            >
              <Printer class="w-3.5 h-3.5" />
              Cetak Langsung
            </BaseButton>

            <BaseButton
              variant="secondary"
              size="sm"
              class="flex items-center gap-1.5 text-xs"
              @click="handleDownloadPdf(letterPaperRef, `Surat_Permohonan_${school?.school_name || 'Sekolah'}.pdf`)"
            >
              <Download class="w-3.5 h-3.5" />
              Download PDF
            </BaseButton>

            <BaseButton
              variant="primary"
              size="sm"
              class="flex items-center gap-1.5 text-xs shadow-xs"
              :isLoading="isLetterIssuing"
              @click="handleIssueLetter"
            >
              <FileCheck class="w-3.5 h-3.5" />
              Terbitkan & Simpan Nomor Resmi
            </BaseButton>
          </div>
        </div>

        <div v-if="letterError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{{ letterError }}</span>
        </div>

        <!-- Letter Live Paper Container -->
        <div v-if="isLetterLoading" class="py-16">
          <BaseLoading text="Menyiapkan dokumen pratinjau surat..." />
        </div>

        <div v-else-if="letterPreviewData" class="max-h-[68vh] overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl flex justify-center">
          <div
            ref="letterPaperRef"
            class="bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 sm:p-14 shadow-lg leading-normal relative"
            style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;"
          >
            <!-- Kop Lembaga: Gambar Kop Utama jika tersedia -->
            <div v-if="letterPreviewData.settings.letterhead_image_path" class="mb-4">
              <img
                :src="resolveStorageUrl(letterPreviewData.settings.letterhead_image_path)"
                alt="Kop Surat Resmi"
                class="w-full object-contain max-h-36 mx-auto"
              />
            </div>
            <!-- Fallback: Kop Teks jika belum ada gambar kop -->
            <div v-else>
              <div class="flex items-center gap-5 pb-3 border-b-2 border-slate-900">
                <div v-if="letterPreviewData.settings.letterhead_logo_path" class="w-20 h-20 shrink-0 flex items-center justify-center">
                  <img :src="resolveStorageUrl(letterPreviewData.settings.letterhead_logo_path)" alt="Logo" class="max-w-full max-h-full object-contain" />
                </div>
                <div class="text-center flex-1">
                  <div class="font-bold text-base tracking-wide uppercase text-slate-950 font-sans">
                    {{ letterPreviewData.settings.school_name || 'NAMA LEMBAGA PENDIDIKAN' }}
                  </div>
                  <div class="text-xs font-semibold text-slate-700 font-sans mt-0.5">
                    PANITIA SELEKSI PENERIMAAN SANTRI / SISWA BARU (SPMB)
                  </div>
                  <div class="text-[10px] text-slate-600 font-sans mt-0.5">
                    {{ letterPreviewData.settings.school_address }}
                  </div>
                  <div class="text-[9px] text-slate-500 font-sans">
                    Telp: {{ letterPreviewData.settings.school_phone || '-' }} • Email: {{ letterPreviewData.settings.school_email || '-' }} • Web: {{ letterPreviewData.settings.school_website || '-' }}
                  </div>
                </div>
              </div>
              <div class="border-b border-slate-900 mt-0.5 mb-5"></div>
            </div>

            <!-- Letter Metas -->
            <div class="flex justify-between items-start mb-6" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              <table class="border-collapse p-0 m-0" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
                <tbody>
                  <tr>
                    <td class="pr-2 align-top font-normal">Nomor</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-normal">{{ letterPreviewData.sample_letter_number }}</td>
                  </tr>
                  <tr>
                    <td class="pr-2 align-top font-normal">Lampiran</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-normal">1 (Satu) Berkas Brosur</td>
                  </tr>
                  <tr>
                    <td class="pr-2 align-top font-normal">Hal</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-semibold">Permohonan Izin Presentasi SPMB</td>
                  </tr>
                </tbody>
              </table>
              <div class="text-right" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
                {{ letterPreviewData.settings.default_city || 'Malang' }}, {{ letterPreviewData.formatted_date }}
              </div>
            </div>

            <!-- Letter Body with populated placeholders -->
            <div class="space-y-4 my-6 leading-normal" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;" v-html="letterPreviewData.rendered_body"></div>

            <!-- Closing -->
            <div class="mt-6 mb-6" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              {{ letterPreviewData.settings.closing_text || 'Hormat kami,' }}
            </div>

            <!-- Dual Signers Block -->
            <div class="grid grid-cols-2 gap-8 text-center pt-2" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              <!-- Signer 1 -->
              <div>
                <div class="text-slate-900 mb-1">
                  {{ letterPreviewData.settings.principal_title || 'Kepala Lembaga' }},
                </div>
                <div class="h-20 flex items-center justify-center my-1">
                  <img
                    v-if="letterPreviewData.settings.principal_signature_path"
                    :src="resolveStorageUrl(letterPreviewData.settings.principal_signature_path)"
                    alt="TTD 1"
                    class="max-h-16 max-w-full object-contain"
                  />
                  <div v-else class="text-xs text-slate-300 italic font-serif">(Tanda Tangan)</div>
                </div>
                <div class="font-bold underline text-slate-900">
                  {{ letterPreviewData.settings.principal_name }}
                </div>
                <div v-if="letterPreviewData.settings.principal_nip" class="text-slate-900 mt-0.5">
                  NIP. {{ letterPreviewData.settings.principal_nip }}
                </div>
              </div>

              <!-- Signer 2 -->
              <div>
                <div class="text-slate-900 mb-1">
                  {{ letterPreviewData.settings.spmb_chair_title || 'Ketua Panitia SPMB' }},
                </div>
                <div class="h-20 flex items-center justify-center my-1">
                  <img
                    v-if="letterPreviewData.settings.spmb_chair_signature_path"
                    :src="resolveStorageUrl(letterPreviewData.settings.spmb_chair_signature_path)"
                    alt="TTD 2"
                    class="max-h-16 max-w-full object-contain"
                  />
                  <div v-else class="text-xs text-slate-300 italic font-serif">(Tanda Tangan)</div>
                </div>
                <div class="font-bold underline text-slate-900">
                  {{ letterPreviewData.settings.spmb_chair_name }}
                </div>
                <div v-if="letterPreviewData.settings.spmb_chair_nip" class="text-slate-900 mt-0.5">
                  NIP. {{ letterPreviewData.settings.spmb_chair_nip }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- Modal: View Immutable Saved Letter Snapshot -->
    <BaseModal
      :open="isSnapshotModalOpen"
      title="Snapshot Surat Permohonan Resmi Terbit"
      size="4xl"
      @close="isSnapshotModalOpen = false"
    >
      <div v-if="selectedSnapshot" class="space-y-4">
        <!-- Controls Bar -->
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span class="font-mono font-bold text-indigo-700 dark:text-indigo-400">{{ selectedSnapshot.letter_number }}</span>
            <span class="text-slate-400 ml-2">• Diterbitkan: {{ formatDateDisplay(selectedSnapshot.issue_date) }}</span>
          </div>

          <div class="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              class="flex items-center gap-1.5 text-xs"
              @click="handlePrintLetter(snapshotPaperRef)"
            >
              <Printer class="w-3.5 h-3.5" />
              Cetak Ulang
            </BaseButton>

            <BaseButton
              variant="secondary"
              size="sm"
              class="flex items-center gap-1.5 text-xs"
              @click="handleDownloadPdf(snapshotPaperRef, `Surat_${selectedSnapshot.letter_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)"
            >
              <Download class="w-3.5 h-3.5" />
              Download PDF
            </BaseButton>
          </div>
        </div>

        <!-- Rendered Immutable Snapshot -->
        <div class="max-h-[68vh] overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl flex justify-center">
          <div
            ref="snapshotPaperRef"
            class="bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 sm:p-14 shadow-lg leading-normal relative"
            style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;"
          >
            <!-- Kop Lembaga from snapshot: Gambar Kop Utama jika ada -->
            <div v-if="selectedSnapshot.signer_snapshot?.letterhead?.letterhead_image_path" class="mb-4">
              <img
                :src="resolveStorageUrl(selectedSnapshot.signer_snapshot.letterhead.letterhead_image_path)"
                alt="Kop Surat Resmi"
                class="w-full object-contain max-h-36 mx-auto"
              />
            </div>
            <!-- Fallback: Kop Teks dari snapshot -->
            <div v-else>
              <div class="flex items-center gap-5 pb-3 border-b-2 border-slate-900">
                <div v-if="selectedSnapshot.signer_snapshot?.letterhead?.letterhead_logo_path" class="w-20 h-20 shrink-0 flex items-center justify-center">
                  <img :src="resolveStorageUrl(selectedSnapshot.signer_snapshot.letterhead.letterhead_logo_path)" alt="Logo" class="max-w-full max-h-full object-contain" />
                </div>
                <div class="text-center flex-1">
                  <div class="font-bold text-base tracking-wide uppercase text-slate-950 font-sans">
                    {{ selectedSnapshot.signer_snapshot?.letterhead?.school_name || 'LEMBAGA PENDIDIKAN' }}
                  </div>
                  <div class="text-xs font-semibold text-slate-700 font-sans mt-0.5">
                    PANITIA SELEKSI PENERIMAAN SANTRI / SISWA BARU (SPMB)
                  </div>
                  <div class="text-[10px] text-slate-600 font-sans mt-0.5">
                    {{ selectedSnapshot.signer_snapshot?.letterhead?.school_address }}
                  </div>
                  <div class="text-[9px] text-slate-500 font-sans">
                    Telp: {{ selectedSnapshot.signer_snapshot?.letterhead?.school_phone || '-' }} • Email: {{ selectedSnapshot.signer_snapshot?.letterhead?.school_email || '-' }}
                  </div>
                </div>
              </div>
              <div class="border-b border-slate-900 mt-0.5 mb-5"></div>
            </div>

            <!-- Letter Metas -->
            <div class="flex justify-between items-start mb-6" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              <table class="border-collapse p-0 m-0" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
                <tbody>
                  <tr>
                    <td class="pr-2 align-top font-normal">Nomor</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-normal">{{ selectedSnapshot.letter_number }}</td>
                  </tr>
                  <tr>
                    <td class="pr-2 align-top font-normal">Lampiran</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-normal">1 (Satu) Berkas Brosur</td>
                  </tr>
                  <tr>
                    <td class="pr-2 align-top font-normal">Hal</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-semibold">Permohonan Izin Presentasi SPMB</td>
                  </tr>
                </tbody>
              </table>
              <div class="text-right" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
                {{ selectedSnapshot.signer_snapshot?.default_city || 'Malang' }}, {{ formatDateDisplay(selectedSnapshot.issue_date) }}
              </div>
            </div>

            <!-- Snapshot Body -->
            <div class="space-y-4 my-6 leading-normal" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;" v-html="selectedSnapshot.letter_content_snapshot"></div>

            <!-- Closing -->
            <div class="mt-6 mb-6" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              {{ selectedSnapshot.signer_snapshot?.closing_text || 'Hormat kami,' }}
            </div>

            <!-- Signers from snapshot -->
            <div class="grid grid-cols-2 gap-8 text-center pt-2" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              <div>
                <div class="text-slate-900 mb-1">
                  {{ selectedSnapshot.signer_snapshot?.principal?.title || 'Kepala Lembaga' }},
                </div>
                <div class="h-20 flex items-center justify-center my-1">
                  <img
                    v-if="selectedSnapshot.signer_snapshot?.principal?.signature_path"
                    :src="resolveStorageUrl(selectedSnapshot.signer_snapshot.principal.signature_path)"
                    alt="TTD 1"
                    class="max-h-16 max-w-full object-contain"
                  />
                  <div v-else class="text-xs text-slate-300 italic font-serif">(Tanda Tangan)</div>
                </div>
                <div class="font-bold underline text-slate-900">
                  {{ selectedSnapshot.signer_snapshot?.principal?.name }}
                </div>
                <div v-if="selectedSnapshot.signer_snapshot?.principal?.nip" class="text-slate-900 mt-0.5">
                  NIP. {{ selectedSnapshot.signer_snapshot.principal.nip }}
                </div>
              </div>

              <div>
                <div class="text-slate-900 mb-1">
                  {{ selectedSnapshot.signer_snapshot?.spmb_chair?.title || 'Ketua Panitia SPMB' }},
                </div>
                <div class="h-20 flex items-center justify-center my-1">
                  <img
                    v-if="selectedSnapshot.signer_snapshot?.spmb_chair?.signature_path"
                    :src="resolveStorageUrl(selectedSnapshot.signer_snapshot.spmb_chair.signature_path)"
                    alt="TTD 2"
                    class="max-h-16 max-w-full object-contain"
                  />
                  <div v-else class="text-xs text-slate-300 italic font-serif">(Tanda Tangan)</div>
                </div>
                <div class="font-bold underline text-slate-900">
                  {{ selectedSnapshot.signer_snapshot?.spmb_chair?.name }}
                </div>
                <div v-if="selectedSnapshot.signer_snapshot?.spmb_chair?.nip" class="text-slate-900 mt-0.5">
                  NIP. {{ selectedSnapshot.signer_snapshot.spmb_chair.nip }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- Modal: Input / Edit Laporan Presentasi -->
    <BaseModal
      :open="isReportModalOpen"
      :title="isEditingReport ? 'Edit Laporan Presentasi' : 'Tambah Laporan Presentasi SPMB'"
      size="2xl"
      @close="isReportModalOpen = false"
    >
      <form @submit.prevent="handleSaveReport" class="space-y-4">
        <div v-if="reportFormError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{{ reportFormError }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal & Waktu Pelaksanaan <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="reportForm.held_at"
              type="datetime-local"
              required
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jumlah Peserta (Siswa) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model.number="reportForm.participant_count"
              type="number"
              min="0"
              required
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lokasi / Ruangan
            </label>
            <input
              v-model="reportForm.location"
              type="text"
              placeholder="Contoh: Aula Lantai 2 / Ruang Kelas IX"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tim Pelaksana (Teks Bebas)
            </label>
            <input
              v-model="reportForm.team_text"
              type="text"
              placeholder="Contoh: Rendy (Presenter), Ferdy (Operator)"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Rangkuman Kegiatan & Materi Sosialisasi
          </label>
          <textarea
            v-model="reportForm.summary"
            rows="3"
            placeholder="Jelaskan jalannya presentasi, respon pembuka, dan materi yang disampaikan..."
            class="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Respons & Minat Siswa / Sekolah
            </label>
            <textarea
              v-model="reportForm.school_response"
              rows="2"
              placeholder="Antusiasme siswa, pertanyaan yang diajukan..."
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Evaluasi
            </label>
            <textarea
              v-model="reportForm.evaluation"
              rows="2"
              placeholder="Hal yang sudah berjalan baik & perlu ditingkatkan..."
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            ></textarea>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kendala yang Dihadapi
            </label>
            <textarea
              v-model="reportForm.obstacles"
              rows="2"
              placeholder="Kendala teknis, waktu, atau fasilitas..."
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rencana Tindak Lanjut
            </label>
            <textarea
              v-model="reportForm.follow_up_plan"
              rows="2"
              placeholder="Pengiriman brosur tambahan, follow up via WA..."
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            ></textarea>
          </div>
        </div>

        <!-- Upload Documentation Photos -->
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Camera class="w-4 h-4 text-emerald-600" />
              Unggah Foto Dokumentasi (Bisa pilih beberapa foto)
            </span>
            <span class="text-[11px] text-slate-400">PNG, JPG, WEBP (Maks 5MB/foto)</span>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            @change="onReportPhotosSelected"
            class="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          <div v-if="reportPhotosFiles.length > 0" class="text-[11px] text-emerald-600 font-medium">
            {{ reportPhotosFiles.length }} foto dipilih untuk diunggah.
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <BaseButton
            type="button"
            variant="outline"
            @click="isReportModalOpen = false"
            :disabled="isReportSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :isLoading="isReportSubmitting"
          >
            {{ isEditingReport ? 'Simpan Perubahan Laporan' : 'Simpan Laporan & Foto' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Modal: Ubah Status -->
    <BaseModal
      :open="isStatusModalOpen"
      title="Ubah Status Target Sekolah"
      size="lg"
      @close="isStatusModalOpen = false"
    >
      <form @submit.prevent="handleSaveStatus" class="space-y-4">
        <div v-if="statusFormError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{{ statusFormError }}</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Status Baru <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="statusForm.newStatus"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            <option value="LEADS">Leads (Baru)</option>
            <option value="FOLLOWED_UP">Sudah di-follow up</option>
            <option value="SCHEDULED">Dijadwalkan</option>
            <option value="COMPLETED">Selesai (Sudah ada laporan)</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>

        <!-- Conditional: SCHEDULED -->
        <div v-if="statusForm.newStatus === 'SCHEDULED'" class="space-y-3 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
          <div>
            <label class="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
              Tanggal & Jam Presentasi Disepakati
            </label>
            <input
              v-model="statusForm.scheduled_at"
              type="datetime-local"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
              Lokasi / Ruangan Presentasi
            </label>
            <input
              v-model="statusForm.scheduled_location"
              type="text"
              placeholder="Contoh: Aula Lantai 2 / Ruang Multimedia"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <!-- Conditional: REJECTED -->
        <div v-if="statusForm.newStatus === 'REJECTED'" class="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
          <label class="block text-xs font-semibold text-rose-900 dark:text-rose-300 mb-1">
            Alasan Penolakan dari Sekolah
          </label>
          <input
            v-model="statusForm.rejection_reason"
            type="text"
            placeholder="Contoh: Kebijakan sekolah tidak menerima promosi"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          />
        </div>

        <!-- Conditional: COMPLETED warning -->
        <div v-if="statusForm.newStatus === 'COMPLETED'" class="p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>Status <strong>Selesai</strong> hanya dapat disimpan jika minimal 1 Laporan Presentasi telah tersedia (Saat ini ada: {{ presentationReports.length }} laporan).</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Catatan Perubahan Status
          </label>
          <textarea
            v-model="statusForm.note"
            rows="2"
            placeholder="Tuliskan catatan tindak lanjut..."
            class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <BaseButton
            type="button"
            variant="outline"
            @click="isStatusModalOpen = false"
            :disabled="isStatusSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :isLoading="isStatusSubmitting"
          >
            Simpan Status Baru
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Modal: Edit Data Sekolah -->
    <BaseModal
      :open="isEditModalOpen"
      title="Edit Profil Target Sekolah"
      size="3xl"
      @close="isEditModalOpen = false"
    >
      <form @submit.prevent="handleSaveEdit" class="space-y-4">
        <div v-if="editFormError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{{ editFormError }}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Sekolah Sasaran <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="editForm.school_name"
              type="text"
              required
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jenjang Pendidikan
            </label>
            <select
              v-model="editForm.education_level"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option v-for="level in EDUCATION_LEVEL_OPTIONS" :key="level" :value="level">
                {{ level }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap
            </label>
            <input
              v-model="editForm.address"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kecamatan
            </label>
            <input
              v-model="editForm.district"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kabupaten / Kota
            </label>
            <input
              v-model="editForm.city_regency"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kepala Sekolah
            </label>
            <input
              v-model="editForm.principal_name"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kontak Person (PIC)
            </label>
            <input
              v-model="editForm.contact_person"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jabatan Kontak Person
            </label>
            <input
              v-model="editForm.contact_position"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <input
              v-model="editForm.phone"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Sekolah
            </label>
            <input
              v-model="editForm.email"
              type="email"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sumber Data
            </label>
            <input
              v-model="editForm.source"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tim Pelaksana (Teks Bebas)
            </label>
            <input
              v-model="editForm.team_text"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Internal Tim
            </label>
            <input
              v-model="editForm.internal_notes"
              type="text"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <BaseButton
            type="button"
            variant="outline"
            @click="isEditModalOpen = false"
            :disabled="isEditSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :isLoading="isEditSubmitting"
          >
            Simpan Perubahan
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Modal: Lightbox Preview Foto -->
    <div
      v-if="isLightboxOpen && activePhoto"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
      @click.self="isLightboxOpen = false"
    >
      <div class="relative max-w-4xl max-h-[90vh] bg-transparent flex flex-col items-center">
        <button
          type="button"
          class="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white cursor-pointer"
          @click="isLightboxOpen = false"
        >
          <X class="w-6 h-6" />
        </button>

        <img
          :src="activePhoto.file_path"
          :alt="activePhoto.caption || 'Foto Dokumentasi'"
          class="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
        />

        <div v-if="activePhoto.caption" class="mt-3 text-white text-sm font-medium bg-black/50 px-4 py-1.5 rounded-full">
          {{ activePhoto.caption }}
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Hapus Laporan / Foto -->
    <BaseConfirmModal
      :open="isDeleteConfirmOpen"
      :title="deleteActionType === 'REPORT' ? 'Hapus Laporan Presentasi?' : 'Hapus Foto Dokumentasi?'"
      :message="deleteActionType === 'REPORT'
        ? 'Apakah Anda yakin ingin menghapus laporan presentasi ini beserta seluruh foto dokumentasi yang terkait?'
        : 'Apakah Anda yakin ingin menghapus foto dokumentasi ini dari server?'"
      confirmText="Ya, Hapus"
      confirmVariant="danger"
      :loading="isDeleting"
      @confirm="handleConfirmDelete"
      @close="isDeleteConfirmOpen = false"
    />
  </div>
</template>
