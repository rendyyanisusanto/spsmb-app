<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import {
  getSchools,
  getSchoolStats,
  checkDuplicate,
  createSchool,
  updateSchool,
  updateSchoolStatus,
  deleteSchool
} from '@/services/crmSchoolService';
import {
  CRM_SCHOOL_STATUS,
  CRM_SCHOOL_STATUS_LABELS,
  CRM_SCHOOL_STATUS_BADGES,
  EDUCATION_LEVEL_OPTIONS,
  getStatusBadge
} from '@/constants/crmSchoolStatus';

import BaseLoading from '@/components/ui/BaseLoading.vue';
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue';
import BaseErrorState from '@/components/ui/BaseErrorState.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';

import {
  School,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Compass,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Settings,
  ShieldCheck,
  Building2,
  ExternalLink
} from 'lucide-vue-next';

const router = useRouter();
const { user, hasRole } = useAuth();

// --- Permissions ---
const canManageLetterSettings = computed(() => hasRole(['SUPER_ADMIN', 'ADMIN_SPSMB']));

// --- States ---
const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref('');

const schools = ref([]);
const stats = ref({
  total: 0,
  leads: 0,
  followedUp: 0,
  rejected: 0,
  scheduled: 0,
  completed: 0
});

// Filters & Pagination
const filters = reactive({
  search: '',
  status: 'ALL',
  educationLevel: 'ALL',
  scheduled: '',
  cityRegency: '',
  district: '',
  sortBy: 'cst.created_at',
  sortOrder: 'DESC',
  page: 1,
  limit: 10
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1
});

// --- Search Debounce ---
let searchDebounceTimer = null;
const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    filters.page = 1;
    fetchSchools();
  }, 400);
};

// --- Modal: Add / Edit Target Sekolah ---
const isFormModalOpen = ref(false);
const isEditing = ref(false);
const isFormSubmitting = ref(false);
const formError = ref('');

const formData = reactive({
  id: null,
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
  status: 'LEADS',
  scheduled_at: '',
  scheduled_location: '',
  rejection_reason: '',
  team_text: '',
  internal_notes: '',
  initial_note: ''
});

// Realtime Duplicate Check
const potentialDuplicates = ref([]);
let duplicateDebounceTimer = null;

const checkSchoolDuplicate = () => {
  clearTimeout(duplicateDebounceTimer);
  if (!formData.school_name || formData.school_name.trim().length < 3) {
    potentialDuplicates.value = [];
    return;
  }
  duplicateDebounceTimer = setTimeout(async () => {
    try {
      const res = await checkDuplicate(formData.school_name, formData.city_regency, formData.id);
      if (res?.data?.duplicates) {
        potentialDuplicates.value = res.data.duplicates;
      }
    } catch (e) {
      // silently ignore check errors
    }
  }, 500);
};

// --- Modal: Quick Status Change ---
const isStatusModalOpen = ref(false);
const statusTarget = ref(null);
const isStatusSubmitting = ref(false);
const statusFormError = ref('');

const statusFormData = reactive({
  newStatus: '',
  note: '',
  scheduled_at: '',
  scheduled_location: '',
  rejection_reason: ''
});

// --- Modal: Delete Confirmation ---
const isDeleteModalOpen = ref(false);
const targetToDelete = ref(null);
const isDeleting = ref(false);
const deleteError = ref('');

// --- Helpers ---
const formatDateDisplay = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
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

// --- Fetch Data ---
const fetchSchools = async () => {
  isLoading.value = true;
  isError.value = false;
  errorMessage.value = '';

  try {
    const res = await getSchools(filters);
    if (res && res.data) {
      schools.value = res.data;
      if (res.meta) {
        pagination.page = res.meta.page;
        pagination.limit = res.meta.limit;
        pagination.total = res.meta.total;
        pagination.totalPages = res.meta.totalPages;
        if (res.meta.stats) {
          stats.value = res.meta.stats;
        }
      }
    }
  } catch (error) {
    isError.value = true;
    errorMessage.value = error.message || 'Gagal memuat data target sekolah.';
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  filters.search = '';
  filters.status = 'ALL';
  filters.educationLevel = 'ALL';
  filters.scheduled = '';
  filters.cityRegency = '';
  filters.district = '';
  filters.page = 1;
  fetchSchools();
};

const setQuickStatusFilter = (status) => {
  filters.status = status;
  filters.page = 1;
  fetchSchools();
};

// --- Form Actions ---
const openCreateModal = () => {
  isEditing.value = false;
  formError.value = '';
  potentialDuplicates.value = [];

  Object.assign(formData, {
    id: null,
    school_name: '',
    education_level: 'SMP',
    address: '',
    village: '',
    district: '',
    city_regency: '',
    province: 'Jawa Timur',
    principal_name: '',
    contact_person: '',
    contact_position: 'Guru BK',
    phone: '',
    email: '',
    source: '',
    status: 'LEADS',
    scheduled_at: '',
    scheduled_location: '',
    rejection_reason: '',
    team_text: '',
    internal_notes: '',
    initial_note: 'Target sekolah baru dicatat'
  });

  isFormModalOpen.value = true;
};

const openEditModal = (school) => {
  isEditing.value = true;
  formError.value = '';
  potentialDuplicates.value = [];

  Object.assign(formData, {
    id: school.id,
    school_name: school.school_name || '',
    education_level: school.education_level || 'SMP',
    address: school.address || '',
    village: school.village || '',
    district: school.district || '',
    city_regency: school.city_regency || '',
    province: school.province || 'Jawa Timur',
    principal_name: school.principal_name || '',
    contact_person: school.contact_person || '',
    contact_position: school.contact_position || '',
    phone: school.phone || '',
    email: school.email || '',
    source: school.source || '',
    status: school.status || 'LEADS',
    scheduled_at: school.scheduled_at ? school.scheduled_at.replace(' ', 'T').slice(0, 16) : '',
    scheduled_location: school.scheduled_location || '',
    rejection_reason: school.rejection_reason || '',
    team_text: school.team_text || '',
    internal_notes: school.internal_notes || '',
    initial_note: ''
  });

  isFormModalOpen.value = true;
};

const handleSaveSchool = async () => {
  if (!formData.school_name || formData.school_name.trim() === '') {
    formError.value = 'Nama sekolah wajib diisi.';
    return;
  }

  isFormSubmitting.value = true;
  formError.value = '';

  try {
    const payload = { ...formData };
    if (!payload.scheduled_at) delete payload.scheduled_at;

    if (isEditing.value) {
      await updateSchool(formData.id, payload);
    } else {
      await createSchool(payload);
    }

    isFormModalOpen.value = false;
    await fetchSchools();
  } catch (error) {
    formError.value = error.message || 'Gagal menyimpan target sekolah.';
  } finally {
    isFormSubmitting.value = false;
  }
};

// --- Quick Status Change ---
const openStatusModal = (school) => {
  statusTarget.value = school;
  statusFormError.value = '';
  statusFormData.newStatus = school.status;
  statusFormData.note = '';
  statusFormData.scheduled_at = school.scheduled_at ? school.scheduled_at.replace(' ', 'T').slice(0, 16) : '';
  statusFormData.scheduled_location = school.scheduled_location || '';
  statusFormData.rejection_reason = school.rejection_reason || '';
  isStatusModalOpen.value = true;
};

const handleSaveStatus = async () => {
  if (!statusTarget.value) return;
  if (!statusFormData.newStatus) {
    statusFormError.value = 'Silakan pilih status baru.';
    return;
  }

  isStatusSubmitting.value = true;
  statusFormError.value = '';

  try {
    const payload = {
      status: statusFormData.newStatus,
      note: statusFormData.note || `Status diubah menjadi ${CRM_SCHOOL_STATUS_LABELS[statusFormData.newStatus] || statusFormData.newStatus}`
    };

    if (statusFormData.newStatus === 'SCHEDULED') {
      payload.scheduled_at = statusFormData.scheduled_at || null;
      payload.scheduled_location = statusFormData.scheduled_location || null;
    } else if (statusFormData.newStatus === 'REJECTED') {
      payload.rejection_reason = statusFormData.rejection_reason || null;
    }

    await updateSchoolStatus(statusTarget.value.id, payload);
    isStatusModalOpen.value = false;
    await fetchSchools();
  } catch (error) {
    statusFormError.value = error.message || 'Gagal mengubah status target sekolah.';
  } finally {
    isStatusSubmitting.value = false;
  }
};

// --- Delete Target ---
const openDeleteModal = (school) => {
  targetToDelete.value = school;
  deleteError.value = '';
  isDeleteModalOpen.value = true;
};

const handleConfirmDelete = async () => {
  if (!targetToDelete.value) return;
  isDeleting.value = true;
  deleteError.value = '';

  try {
    await deleteSchool(targetToDelete.value.id);
    isDeleteModalOpen.value = false;
    await fetchSchools();
  } catch (error) {
    deleteError.value = error.message || 'Gagal menghapus target sekolah.';
  } finally {
    isDeleting.value = false;
  }
};

// --- Navigation ---
const goToDetail = (id) => {
  router.push(`/admin/crm/schools/${id}`);
};

const goToLetterSettings = () => {
  router.push('/admin/crm/schools/letter-settings');
};

const changePage = (newPage) => {
  if (newPage < 1 || newPage > pagination.totalPages) return;
  filters.page = newPage;
  fetchSchools();
};

onMounted(() => {
  fetchSchools();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div>
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <School class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Target Sekolah & Presentasi SPMB
            </h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Pencatatan sekolah sasaran, jadwal sosialisasi, laporan kegiatan, dan penerbitan surat izin presentasi.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <BaseButton
          v-if="canManageLetterSettings"
          variant="outline"
          class="flex items-center gap-2"
          @click="goToLetterSettings"
        >
          <Settings class="w-4 h-4 text-slate-500" />
          Pengaturan Surat
        </BaseButton>

        <BaseButton
          variant="primary"
          class="flex items-center gap-2 shadow-sm"
          @click="openCreateModal"
        >
          <Plus class="w-4 h-4" />
          Tambah Target Sekolah
        </BaseButton>
      </div>
    </div>

    <!-- Stat Cards Overview -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      <!-- Total -->
      <button
        type="button"
        @click="setQuickStatusFilter('ALL')"
        class="text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer"
        :class="filters.status === 'ALL'
          ? 'bg-blue-50/70 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Semua Target</span>
          <School class="w-4 h-4 text-blue-600" />
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          {{ stats.total }}
        </div>
      </button>

      <!-- Leads -->
      <button
        type="button"
        @click="setQuickStatusFilter('LEADS')"
        class="text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer"
        :class="filters.status === 'LEADS'
          ? 'bg-sky-50/80 border-sky-400 dark:bg-sky-950/40 dark:border-sky-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Leads</span>
          <Compass class="w-4 h-4 text-sky-600" />
        </div>
        <div class="mt-2 text-2xl font-bold text-sky-700 dark:text-sky-400">
          {{ stats.leads }}
        </div>
      </button>

      <!-- Followed Up -->
      <button
        type="button"
        @click="setQuickStatusFilter('FOLLOWED_UP')"
        class="text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer"
        :class="filters.status === 'FOLLOWED_UP'
          ? 'bg-amber-50/80 border-amber-400 dark:bg-amber-950/40 dark:border-amber-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Di-Follow Up</span>
          <PhoneCall class="w-4 h-4 text-amber-600" />
        </div>
        <div class="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">
          {{ stats.followedUp }}
        </div>
      </button>

      <!-- Scheduled -->
      <button
        type="button"
        @click="setQuickStatusFilter('SCHEDULED')"
        class="text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer"
        :class="filters.status === 'SCHEDULED'
          ? 'bg-indigo-50/80 border-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Dijadwalkan</span>
          <CalendarClock class="w-4 h-4 text-indigo-600" />
        </div>
        <div class="mt-2 text-2xl font-bold text-indigo-700 dark:text-indigo-400">
          {{ stats.scheduled }}
        </div>
      </button>

      <!-- Completed -->
      <button
        type="button"
        @click="setQuickStatusFilter('COMPLETED')"
        class="text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer"
        :class="filters.status === 'COMPLETED'
          ? 'bg-emerald-50/80 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Selesai</span>
          <CheckCircle2 class="w-4 h-4 text-emerald-600" />
        </div>
        <div class="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
          {{ stats.completed }}
        </div>
      </button>

      <!-- Rejected -->
      <button
        type="button"
        @click="setQuickStatusFilter('REJECTED')"
        class="text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer"
        :class="filters.status === 'REJECTED'
          ? 'bg-rose-50/80 border-rose-400 dark:bg-rose-950/40 dark:border-rose-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Ditolak</span>
          <XCircle class="w-4 h-4 text-rose-600" />
        </div>
        <div class="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400">
          {{ stats.rejected }}
        </div>
      </button>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <!-- Search Input -->
        <div class="relative lg:col-span-2">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            v-model="filters.search"
            @input="handleSearchInput"
            type="text"
            placeholder="Cari nama sekolah, kontak, telepon, kota..."
            class="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <!-- Filter Status -->
        <div>
          <select
            v-model="filters.status"
            @change="() => { filters.page = 1; fetchSchools(); }"
            class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="LEADS">Leads</option>
            <option value="FOLLOWED_UP">Sudah di-follow up</option>
            <option value="SCHEDULED">Dijadwalkan</option>
            <option value="COMPLETED">Selesai</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>

        <!-- Filter Jenjang -->
        <div>
          <select
            v-model="filters.educationLevel"
            @change="() => { filters.page = 1; fetchSchools(); }"
            class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">Semua Jenjang</option>
            <option v-for="level in EDUCATION_LEVEL_OPTIONS" :key="level" :value="level">
              {{ level }}
            </option>
          </select>
        </div>

        <!-- Filter Jadwal -->
        <div>
          <select
            v-model="filters.scheduled"
            @change="() => { filters.page = 1; fetchSchools(); }"
            class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Semua Jadwal</option>
            <option value="HAS_SCHEDULE">Ada Jadwal</option>
            <option value="NO_SCHEDULE">Belum Dijadwalkan</option>
            <option value="UPCOMING">Akan Datang</option>
            <option value="PAST">Jadwal Lewat</option>
          </select>
        </div>
      </div>

      <!-- Secondary Filter row -->
      <div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
        <div class="flex items-center gap-2">
          <span>Filter Wilayah:</span>
          <input
            v-model="filters.cityRegency"
            @input="handleSearchInput"
            type="text"
            placeholder="Kabupaten / Kota..."
            class="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-40"
          />
          <input
            v-model="filters.district"
            @input="handleSearchInput"
            type="text"
            placeholder="Kecamatan..."
            class="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-36"
          />
        </div>

        <button
          type="button"
          @click="resetFilters"
          class="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="py-16">
        <BaseLoading text="Memuat daftar target sekolah..." />
      </div>

      <!-- Error State -->
      <div v-else-if="isError" class="p-8">
        <BaseErrorState
          title="Gagal Memuat Target Sekolah"
          :message="errorMessage"
          @retry="fetchSchools"
        />
      </div>

      <!-- Empty State -->
      <div v-else-if="schools.length === 0" class="p-12">
        <BaseEmptyState
          title="Tidak Ada Target Sekolah Ditemukan"
          message="Belum ada data target sekolah yang sesuai dengan kriteria pencarian Anda."
        >
          <template #action>
            <BaseButton variant="outline" size="sm" @click="resetFilters">
              Reset Filter Pencarian
            </BaseButton>
          </template>
        </BaseEmptyState>
      </div>

      <!-- Table Content -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
            <tr>
              <th scope="col" class="py-3.5 px-4">Sekolah & Jenjang</th>
              <th scope="col" class="py-3.5 px-4">Wilayah</th>
              <th scope="col" class="py-3.5 px-4">Kontak Person</th>
              <th scope="col" class="py-3.5 px-4 text-center">Status</th>
              <th scope="col" class="py-3.5 px-4">Jadwal Presentasi</th>
              <th scope="col" class="py-3.5 px-4 text-center">Laporan & Surat</th>
              <th scope="col" class="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
            <tr
              v-for="school in schools"
              :key="school.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
            >
              <!-- Sekolah & Jenjang -->
              <td class="py-3.5 px-4">
                <div class="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span class="hover:text-blue-600 cursor-pointer" @click="goToDetail(school.id)">
                    {{ school.school_name }}
                  </span>
                  <span
                    v-if="school.education_level"
                    class="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {{ school.education_level }}
                  </span>
                </div>
                <div class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-2">
                  <span v-if="school.source">Sumber: {{ school.source }}</span>
                  <span v-if="school.principal_name">• KS: {{ school.principal_name }}</span>
                </div>
              </td>

              <!-- Wilayah -->
              <td class="py-3.5 px-4 text-xs">
                <div class="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <MapPin class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{{ school.city_regency || '-' }}</span>
                </div>
                <div class="text-slate-400 dark:text-slate-500 mt-0.5">
                  {{ [school.district, school.province].filter(Boolean).join(', ') || '-' }}
                </div>
              </td>

              <!-- Kontak Person -->
              <td class="py-3.5 px-4 text-xs">
                <div class="font-medium text-slate-800 dark:text-slate-200">
                  {{ school.contact_person || '-' }}
                  <span v-if="school.contact_position" class="text-slate-400 font-normal">
                    ({{ school.contact_position }})
                  </span>
                </div>
                <div class="flex items-center gap-3 mt-1 text-slate-500">
                  <a
                    v-if="school.phone"
                    :href="`https://wa.me/${school.phone.replace(/[^0-9]/g, '')}`"
                    target="_blank"
                    class="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <Phone class="w-3 h-3" />
                    {{ school.phone }}
                  </a>
                  <a
                    v-if="school.email"
                    :href="`mailto:${school.email}`"
                    class="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
                  >
                    <Mail class="w-3 h-3" />
                  </a>
                </div>
              </td>

              <!-- Status Badge -->
              <td class="py-3.5 px-4 text-center">
                <button
                  type="button"
                  @click="openStatusModal(school)"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition hover:opacity-80"
                  :class="getStatusBadge(school.status).class"
                  title="Klik untuk mengubah status"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatusBadge(school.status).dot"></span>
                  {{ getStatusBadge(school.status).label }}
                </button>
              </td>

              <!-- Jadwal Presentasi -->
              <td class="py-3.5 px-4 text-xs">
                <div v-if="school.scheduled_at" class="flex items-start gap-1.5">
                  <CalendarClock class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <div class="font-medium text-indigo-700 dark:text-indigo-400">
                      {{ formatDateTimeDisplay(school.scheduled_at) }}
                    </div>
                    <div class="text-slate-400 text-[11px] mt-0.5">
                      {{ school.scheduled_location || 'Lokasi belum diset' }}
                    </div>
                  </div>
                </div>
                <div v-else class="text-slate-400 flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5 text-slate-300" />
                  <span>Belum dijadwalkan</span>
                </div>
              </td>

              <!-- Laporan & Surat Counts -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-2 text-xs">
                  <span
                    class="px-2 py-0.5 rounded-md font-medium"
                    :class="school.reports_count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200'"
                    title="Jumlah laporan presentasi"
                  >
                    {{ school.reports_count }} Lap
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-md font-medium"
                    :class="school.letters_count > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-400 border border-slate-200'"
                    title="Jumlah surat permohonan diterbitkan"
                  >
                    {{ school.letters_count }} Surat
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Lihat Detail Target Sekolah"
                    @click="goToDetail(school.id)"
                  >
                    <Eye class="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Ubah Status Cepat"
                    @click="openStatusModal(school)"
                  >
                    <RefreshCw class="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Edit Data Sekolah"
                    @click="openEditModal(school)"
                  >
                    <Edit class="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Hapus Target"
                    @click="openDeleteModal(school)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Menampilkan <span class="font-semibold text-slate-800 dark:text-slate-200">{{ ((pagination.page - 1) * pagination.limit) + 1 }}</span>
          hingga <span class="font-semibold text-slate-800 dark:text-slate-200">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
          dari <span class="font-semibold text-slate-800 dark:text-slate-200">{{ pagination.total }}</span> target sekolah
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
            class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            <ChevronLeft class="w-4 h-4" />
            Sebelumnya
          </button>

          <span class="px-3 py-1 font-medium text-slate-700 dark:text-slate-300">
            Hal {{ pagination.page }} / {{ pagination.totalPages }}
          </span>

          <button
            type="button"
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
            class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            Berikutnya
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form: Tambah / Edit Target Sekolah -->
    <BaseModal
      :open="isFormModalOpen"
      :title="isEditing ? 'Edit Data Target Sekolah' : 'Tambah Target Sekolah Sasaran Baru'"
      size="3xl"
      @close="isFormModalOpen = false"
    >
      <form @submit.prevent="handleSaveSchool" class="space-y-4">
        <!-- Error Alert -->
        <div v-if="formError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{{ formError }}</span>
        </div>

        <!-- Potential Duplicate Warning Alert -->
        <div
          v-if="potentialDuplicates.length > 0"
          class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs space-y-1.5"
        >
          <div class="font-semibold flex items-center gap-1.5">
            <AlertTriangle class="w-4 h-4 text-amber-600" />
            <span>Peringatan: Ditemukan {{ potentialDuplicates.length }} sekolah dengan nama serupa di database:</span>
          </div>
          <ul class="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
            <li v-for="dup in potentialDuplicates" :key="dup.id">
              <strong>{{ dup.school_name }}</strong> ({{ dup.education_level || '-' }}) - {{ dup.city_regency || 'Kota belum diset' }} [Status: {{ dup.status }}]
            </li>
          </ul>
          <p class="text-[11px] text-amber-700 dark:text-amber-400 italic">
            * Anda tetap dapat melanjutkan menyimpan jika sekolah ini memang berbeda wilayah atau cabang.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <!-- Nama Sekolah -->
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Sekolah Sasaran <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="formData.school_name"
              @input="checkSchoolDuplicate"
              type="text"
              placeholder="Contoh: SMP Negeri 1 Pakis"
              required
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <!-- Jenjang -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jenjang Pendidikan
            </label>
            <select
              v-model="formData.education_level"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option v-for="level in EDUCATION_LEVEL_OPTIONS" :key="level" :value="level">
                {{ level }}
              </option>
            </select>
          </div>
        </div>

        <!-- Wilayah -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap
            </label>
            <input
              v-model="formData.address"
              type="text"
              placeholder="Jalan, nomor, atau patokan"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kecamatan
            </label>
            <input
              v-model="formData.district"
              type="text"
              placeholder="Kecamatan"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kabupaten / Kota
            </label>
            <input
              v-model="formData.city_regency"
              @input="checkSchoolDuplicate"
              type="text"
              placeholder="Kab. / Kota"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <!-- Kontak Sekolah -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kepala Sekolah
            </label>
            <input
              v-model="formData.principal_name"
              type="text"
              placeholder="Nama Kepala Sekolah & Gelar"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Kontak Person (PIC)
            </label>
            <input
              v-model="formData.contact_person"
              type="text"
              placeholder="Nama Guru BK / Waka / Staff"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jabatan Kontak Person
            </label>
            <input
              v-model="formData.contact_position"
              type="text"
              placeholder="Contoh: Guru BK / Waka Kesiswaan"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <!-- Telepon, Email, Sumber -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <input
              v-model="formData.phone"
              type="text"
              placeholder="08xxxxxxxxxx"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Sekolah
            </label>
            <input
              v-model="formData.email"
              type="email"
              placeholder="sekolah@example.sch.id"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sumber Data
            </label>
            <input
              v-model="formData.source"
              type="text"
              placeholder="Contoh: Database Diknas, Rekomendasi"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <!-- Tim Pelaksana & Catatan -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tim Pelaksana (Teks Bebas)
            </label>
            <input
              v-model="formData.team_text"
              type="text"
              placeholder="Contoh: Tim Alpha: Ust. Fauzi, Rendy, Ferdy"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Internal (Tidak muncul di surat)
            </label>
            <input
              v-model="formData.internal_notes"
              type="text"
              placeholder="Catatan strategi atau pesan khusus untuk tim"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <BaseButton
            type="button"
            variant="outline"
            @click="isFormModalOpen = false"
            :disabled="isFormSubmitting"
          >
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :isLoading="isFormSubmitting"
          >
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Target Sekolah' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Modal Ubah Status Cepat -->
    <BaseModal
      :open="isStatusModalOpen"
      title="Ubah Status Target Sekolah"
      size="lg"
      @close="isStatusModalOpen = false"
    >
      <form @submit.prevent="handleSaveStatus" class="space-y-4">
        <div v-if="statusTarget" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
          <div class="font-semibold text-slate-800 dark:text-slate-200">{{ statusTarget.school_name }}</div>
          <div class="text-slate-500 mt-0.5">Status saat ini: <span class="font-medium text-blue-600">{{ getStatusBadge(statusTarget.status).label }}</span></div>
        </div>

        <div v-if="statusFormError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{{ statusFormError }}</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Pilih Status Baru <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="statusFormData.newStatus"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="LEADS">Leads (Baru)</option>
            <option value="FOLLOWED_UP">Sudah di-follow up</option>
            <option value="SCHEDULED">Dijadwalkan</option>
            <option value="COMPLETED">Selesai (Sudah ada laporan)</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>

        <!-- Conditional: SCHEDULED -->
        <div v-if="statusFormData.newStatus === 'SCHEDULED'" class="space-y-3 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
          <div>
            <label class="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
              Tanggal & Jam Presentasi Disepakati
            </label>
            <input
              v-model="statusFormData.scheduled_at"
              type="datetime-local"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
              Lokasi / Ruangan Presentasi
            </label>
            <input
              v-model="statusFormData.scheduled_location"
              type="text"
              placeholder="Contoh: Aula Lantai 2 / Ruang Multimedia"
              class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <!-- Conditional: REJECTED -->
        <div v-if="statusFormData.newStatus === 'REJECTED'" class="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
          <label class="block text-xs font-semibold text-rose-900 dark:text-rose-300 mb-1">
            Alasan Penolakan dari Sekolah
          </label>
          <input
            v-model="statusFormData.rejection_reason"
            type="text"
            placeholder="Contoh: Kebijakan sekolah tidak menerima promosi, jadwal ujian padat"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          />
        </div>

        <!-- Conditional: COMPLETED info warning -->
        <div v-if="statusFormData.newStatus === 'COMPLETED'" class="p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>Status <strong>Selesai</strong> hanya dapat disimpan jika minimal 1 Laporan Presentasi telah dibuat dan tersimpan di sistem.</span>
        </div>

        <!-- Catatan Perubahan Status -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Catatan Perubahan Status
          </label>
          <textarea
            v-model="statusFormData.note"
            rows="2"
            placeholder="Tuliskan alasan atau ringkasan hasil komunikasi..."
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

    <!-- Modal Konfirmasi Hapus Target -->
    <BaseConfirmModal
      :open="isDeleteModalOpen"
      title="Hapus Target Sekolah?"
      :message="`Apakah Anda yakin ingin menghapus target sekolah &quot;${targetToDelete?.school_name}&quot;? Seluruh riwayat kunjungan dan status akan ikut terhapus.`"
      confirmText="Ya, Hapus Target"
      confirmVariant="danger"
      :loading="isDeleting"
      @confirm="handleConfirmDelete"
      @close="isDeleteModalOpen = false"
    >
      <div v-if="deleteError" class="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 shrink-0" />
        <span>{{ deleteError }}</span>
      </div>
    </BaseConfirmModal>
  </div>
</template>
