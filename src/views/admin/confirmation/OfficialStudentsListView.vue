<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import confirmationService from '@/services/confirmationService'
import * as institutionService from '@/services/institutionService'
import {
  CheckCircle2,
  GraduationCap,
  Search,
  Filter,
  Eye,
  Building2,
  Calendar,
  ArrowLeft,
  X,
  User,
  CreditCard
} from 'lucide-vue-next'

const router = useRouter()
const { hasRole, user } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))

const loading = ref(false)
const students = ref([])
const institutions = ref([])
const tracks = ref([])
const pagination = ref({ total: 0, page: 1, limit: 15, totalPages: 1 })

// Filters
const filterInstitution = ref('')
const filterTrack = ref('')
const filterAcademicYear = ref('')
const searchQuery = ref('')

// Detail modal
const showDetailModal = ref(false)
const selectedStudent = ref(null)

const fetchInstitutions = async () => {
  try {
    const res = await institutionService.getPublicInstitutions()
    if (res && res.data) {
      institutions.value = res.data
      if (!isSuperAdmin.value && user.value?.institutions?.length > 0) {
        filterInstitution.value = user.value.institutions[0].id
      }
    }
  } catch (err) {
    console.error('Failed to fetch institutions:', err)
  }
}

const fetchTracks = async () => {
  try {
    const res = await confirmationService.getTracks({
      institution_id: filterInstitution.value || undefined
    })
    if (res && res.data) {
      tracks.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch tracks:', err)
  }
}

const fetchStudents = async (page = 1) => {
  loading.value = true
  try {
    const params = {
      institution_id: filterInstitution.value || undefined,
      confirmation_track_id: filterTrack.value || undefined,
      academic_year: filterAcademicYear.value || undefined,
      q: searchQuery.value || undefined,
      page,
      limit: pagination.value.limit
    }

    const res = await confirmationService.getOfficialStudents(params)
    if (res && res.data) {
      students.value = res.data
      pagination.value = {
        total: res.total,
        page: res.page,
        limit: res.limit,
        totalPages: res.totalPages
      }
    }
  } catch (err) {
    console.error('Failed to fetch official students:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchInstitutions()
  await fetchTracks()
  await fetchStudents()
})

const handleInstitutionChange = async () => {
  filterTrack.value = ''
  await fetchTracks()
  await fetchStudents(1)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatCurrency = (val) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
}

const openDetail = (student) => {
  selectedStudent.value = student
  showDetailModal.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
          <CheckCircle2 class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Daftar Siswa & Santri Resmi Diterima</h1>
          <p class="text-sm text-slate-500">Rekapitulasi calon peserta didik yang telah berhasil melewati konfirmasi dan resmi diterima.</p>
        </div>
      </div>

      <router-link
        to="/admin/konfirmasi"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs md:text-sm font-semibold transition-all"
      >
        <ArrowLeft class="w-4 h-4" />
        Kembali ke Konfirmasi
      </router-link>
    </div>

    <!-- Filters Section -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Institution -->
        <div v-if="isSuperAdmin">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Lembaga</label>
          <select
            v-model="filterInstitution"
            @change="handleInstitutionChange"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Lembaga</option>
            <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
              {{ inst.name }} ({{ inst.code }})
            </option>
          </select>
        </div>

        <!-- Track -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Jalur Penerimaan</label>
          <select
            v-model="filterTrack"
            @change="fetchStudents(1)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Jalur</option>
            <option v-for="t in tracks" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.institution_name }})
            </option>
          </select>
        </div>

        <!-- Academic Year -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Tahun Penerimaan</label>
          <input
            v-model="filterAcademicYear"
            @keyup.enter="fetchStudents(1)"
            type="text"
            placeholder="Contoh: 2027/2028"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <!-- Search Input -->
        <div :class="isSuperAdmin ? '' : 'sm:col-span-2'">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Pencarian</label>
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              @keyup.enter="fetchStudents(1)"
              type="text"
              placeholder="Nama / NIS / No. Reg..."
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-slate-400">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
        <p class="text-xs">Memuat data siswa resmi...</p>
      </div>

      <div v-else-if="students.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4 w-12 text-center">No</th>
              <th class="py-3.5 px-4">No. Induk (NIS)</th>
              <th class="py-3.5 px-4">Nama Siswa / Santri</th>
              <th class="py-3.5 px-4">Lembaga</th>
              <th class="py-3.5 px-4">Jalur Penerimaan</th>
              <th class="py-3.5 px-4 text-center">Tahun</th>
              <th class="py-3.5 px-4">Tanggal Ditetapkan</th>
              <th class="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(st, index) in students"
              :key="st.confirmation_id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <!-- No -->
              <td class="py-3 px-4 text-center text-slate-500 font-medium">
                {{ (pagination.page - 1) * pagination.limit + index + 1 }}
              </td>

              <!-- NIS -->
              <td class="py-3 px-4">
                <span class="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs">
                  {{ st.official_student_number }}
                </span>
              </td>

              <!-- Nama Siswa -->
              <td class="py-3 px-4">
                <div class="font-bold text-slate-800 text-sm mb-0.5">{{ st.full_name }}</div>
                <div class="text-[11px] text-slate-500">Reg: {{ st.registration_number }} • Asal: {{ st.previous_school }}</div>
              </td>

              <!-- Lembaga -->
              <td class="py-3 px-4">
                <div class="font-medium text-slate-800">{{ st.institution_name }}</div>
                <div class="text-[10px] text-slate-400">{{ st.institution_code }}</div>
              </td>

              <!-- Jalur -->
              <td class="py-3 px-4">
                <span class="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {{ st.track_name }}
                </span>
              </td>

              <!-- Tahun -->
              <td class="py-3 px-4 text-center font-medium text-slate-600">
                {{ st.academic_year }}
              </td>

              <!-- Tanggal Ditetapkan -->
              <td class="py-3 px-4">
                <div class="text-slate-700 font-medium">{{ formatDate(st.decision_date) }}</div>
                <div class="text-[10px] text-slate-400">Oleh: {{ st.decided_by_name || 'Admin' }}</div>
              </td>

              <!-- Aksi -->
              <td class="py-3 px-4 text-right">
                <button
                  type="button"
                  @click="router.push(`/admin/konfirmasi/${st.application_id}`)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl text-xs font-semibold transition-all"
                >
                  <Eye class="w-3.5 h-3.5" />
                  Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 text-slate-500">
        <GraduationCap class="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h4 class="font-bold text-slate-700 text-sm mb-1">Belum ada siswa/santri resmi diterima</h4>
        <p class="text-xs text-slate-400">Lakukan proses verifikasi dan penetapan resmi pada menu Konfirmasi Pendaftar.</p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>Menampilkan halaman {{ pagination.page }} dari {{ pagination.totalPages }} (Total {{ pagination.total }} siswa resmi)</div>
        <div class="flex items-center gap-1">
          <button
            :disabled="pagination.page <= 1"
            @click="fetchStudents(pagination.page - 1)"
            class="px-3 py-1 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchStudents(pagination.page + 1)"
            class="px-3 py-1 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
