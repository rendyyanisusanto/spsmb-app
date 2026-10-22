<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import confirmationService from '@/services/confirmationService'
import * as institutionService from '@/services/institutionService'
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  GraduationCap,
  FileCheck,
  CreditCard,
  Building2,
  ChevronRight
} from 'lucide-vue-next'

const router = useRouter()
const { hasRole, user } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))

const loading = ref(false)
const applicants = ref([])
const institutions = ref([])
const pagination = ref({ total: 0, page: 1, limit: 15, totalPages: 1 })

// Filters
const filterInstitution = ref('')
const filterStatus = ref('')
const filterDocStatus = ref('')
const filterPayStatus = ref('')
const searchQuery = ref('')

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

const fetchApplicants = async (page = 1) => {
  loading.value = true
  try {
    const params = {
      institution_id: filterInstitution.value || undefined,
      status: filterStatus.value || undefined,
      doc_status: filterDocStatus.value || undefined,
      pay_status: filterPayStatus.value || undefined,
      q: searchQuery.value || undefined,
      page,
      limit: pagination.value.limit
    }

    const res = await confirmationService.getConfirmationApplicants(params)
    if (res && res.data) {
      applicants.value = res.data
      pagination.value = {
        total: res.total,
        page: res.page,
        limit: res.limit,
        totalPages: res.totalPages
      }
    }
  } catch (err) {
    console.error('Failed to fetch confirmation applicants:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchInstitutions()
  await fetchApplicants()
})

const handleSearch = () => {
  fetchApplicants(1)
}

const goToProcess = (applicationId) => {
  router.push(`/admin/konfirmasi/${applicationId}`)
}

const formatCurrency = (val) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
          <GraduationCap class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Konfirmasi Siswa / Santri Baru</h1>
          <p class="text-sm text-slate-500">Pemeriksaan berkas, tagihan pembayaran, dan penetapan resmi diterima per lembaga.</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <router-link
          to="/admin/konfirmasi/siswa-resmi"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs md:text-sm font-semibold hover:bg-emerald-100 transition-all"
        >
          <CheckCircle2 class="w-4 h-4 text-emerald-600" />
          Lihat Siswa Resmi Diterima
        </router-link>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <!-- Institution Filter -->
        <div v-if="isSuperAdmin">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Lembaga</label>
          <select
            v-model="filterInstitution"
            @change="fetchApplicants(1)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Lembaga</option>
            <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
              {{ inst.name }} ({{ inst.code }})
            </option>
          </select>
        </div>

        <!-- Status Konfirmasi -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Status Konfirmasi</label>
          <select
            v-model="filterStatus"
            @change="fetchApplicants(1)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Status</option>
            <option value="BELUM_PROSES">Belum Diproses</option>
            <option value="PROSES">Sedang Proses</option>
            <option value="DITERIMA">Resmi Diterima</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>

        <!-- Status Dokumen -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Verifikasi Dokumen</label>
          <select
            v-model="filterDocStatus"
            @change="fetchApplicants(1)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Dokumen</option>
            <option value="BELUM_LENGKAP">Belum Lengkap</option>
            <option value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</option>
            <option value="TERVERIFIKASI">Terverifikasi</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>

        <!-- Status Pembayaran -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Status Pembayaran</label>
          <select
            v-model="filterPayStatus"
            @change="fetchApplicants(1)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Pembayaran</option>
            <option value="BELUM_BAYAR">Belum Bayar</option>
            <option value="SEBAGIAN">Sebagian</option>
            <option value="LUNAS">Lunas</option>
          </select>
        </div>

        <!-- Search Input -->
        <div :class="isSuperAdmin ? '' : 'sm:col-span-2'">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Pencarian</label>
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Nama / No. Reg..."
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Applicants Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-slate-400">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
        <p class="text-xs">Memuat data pendaftar...</p>
      </div>

      <div v-else-if="applicants.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4 w-12 text-center">No</th>
              <th class="py-3.5 px-4">Calon Santri / Siswa</th>
              <th class="py-3.5 px-4">Lembaga Pilihan</th>
              <th class="py-3.5 px-4">Jalur Konfirmasi</th>
              <th class="py-3.5 px-4 text-center">Berkas Dokumen</th>
              <th class="py-3.5 px-4 text-center">Pembayaran</th>
              <th class="py-3.5 px-4 text-center">Status Akhir</th>
              <th class="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(app, index) in applicants"
              :key="app.application_id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <!-- No -->
              <td class="py-3 px-4 text-center text-slate-500 font-medium">
                {{ (pagination.page - 1) * pagination.limit + index + 1 }}
              </td>

              <!-- Calon Siswa -->
              <td class="py-3 px-4">
                <div class="font-bold text-slate-800 text-sm mb-0.5">{{ app.full_name }}</div>
                <div class="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span class="font-mono font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">{{ app.registration_number }}</span>
                  <span>•</span>
                  <span>WA: {{ app.whatsapp }}</span>
                </div>
              </td>

              <!-- Lembaga -->
              <td class="py-3 px-4">
                <div class="font-medium text-slate-800">
                  {{ app.formal_institution_name || app.pondok_institution_name || 'Non Formal' }}
                </div>
                <div class="text-[10px] text-slate-400">
                  {{ app.formal_institution_name ? app.pondok_institution_name : 'Santri Murni' }}
                </div>
              </td>

              <!-- Jalur Konfirmasi -->
              <td class="py-3 px-4">
                <span v-if="app.track_name" class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {{ app.track_name }}
                </span>
                <span v-else class="text-[11px] text-slate-400 italic">Belum Dipilih</span>
              </td>

              <!-- Status Dokumen -->
              <td class="py-3 px-4 text-center">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  :class="{
                    'bg-emerald-50 text-emerald-700 border border-emerald-200': app.document_verification_status === 'TERVERIFIKASI',
                    'bg-amber-50 text-amber-700 border border-amber-200': app.document_verification_status === 'MENUNGGU_VERIFIKASI',
                    'bg-rose-50 text-rose-700 border border-rose-200': app.document_verification_status === 'DITOLAK',
                    'bg-slate-100 text-slate-600': !app.document_verification_status || app.document_verification_status === 'BELUM_LENGKAP'
                  }"
                >
                  <component
                    :is="app.document_verification_status === 'TERVERIFIKASI' ? CheckCircle2 : (app.document_verification_status === 'DITOLAK' ? XCircle : Clock)"
                    class="w-3 h-3"
                  />
                  {{ app.document_verification_status || 'Belum Lengkap' }}
                </span>
              </td>

              <!-- Status Pembayaran -->
              <td class="py-3 px-4 text-center">
                <div class="inline-flex flex-col items-center">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                    :class="{
                      'bg-emerald-50 text-emerald-700 border border-emerald-200': app.payment_status === 'LUNAS',
                      'bg-amber-50 text-amber-700 border border-amber-200': app.payment_status === 'SEBAGIAN',
                      'bg-slate-100 text-slate-600': !app.payment_status || app.payment_status === 'BELUM_BAYAR'
                    }"
                  >
                    <CreditCard class="w-3 h-3" />
                    {{ app.payment_status || 'Belum Bayar' }}
                  </span>
                  <span v-if="app.total_paid_amount > 0" class="text-[10px] text-slate-400 mt-0.5">
                    {{ formatCurrency(app.total_paid_amount) }}
                  </span>
                </div>
              </td>

              <!-- Status Akhir -->
              <td class="py-3 px-4 text-center">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  :class="{
                    'bg-emerald-100 text-emerald-900 border border-emerald-300': app.confirmation_status === 'DITERIMA',
                    'bg-amber-50 text-amber-800 border border-amber-200': app.confirmation_status === 'PROSES',
                    'bg-rose-50 text-rose-800 border border-rose-200': app.confirmation_status === 'DITOLAK',
                    'bg-slate-100 text-slate-500': !app.confirmation_status
                  }"
                >
                  <span class="w-1.5 h-1.5 rounded-full"
                    :class="{
                      'bg-emerald-600': app.confirmation_status === 'DITERIMA',
                      'bg-amber-500': app.confirmation_status === 'PROSES',
                      'bg-rose-500': app.confirmation_status === 'DITOLAK',
                      'bg-slate-400': !app.confirmation_status
                    }"
                  ></span>
                  {{ app.confirmation_status === 'DITERIMA' ? 'Resmi Diterima' : (app.confirmation_status === 'PROSES' ? 'Dalam Proses' : (app.confirmation_status === 'DITOLAK' ? 'Ditolak' : 'Belum Diproses')) }}
                </span>
                <div v-if="app.official_student_number" class="text-[10px] font-mono font-semibold text-emerald-700 mt-0.5">
                  {{ app.official_student_number }}
                </div>
              </td>

              <!-- Aksi -->
              <td class="py-3 px-4 text-right">
                <button
                  type="button"
                  @click="goToProcess(app.application_id)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs shadow-sm transition-all"
                  :class="app.confirmation_status === 'DITERIMA' 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-[#1A4D2E] text-white hover:bg-[#235f3b]'"
                >
                  <span>{{ app.confirmation_status ? 'Detail Proses' : 'Proses Konfirmasi' }}</span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 text-slate-500">
        <Users class="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h4 class="font-bold text-slate-700 text-sm mb-1">Tidak ada pendaftar untuk dikonfirmasi</h4>
        <p class="text-xs text-slate-400">Pendaftar harus berstatus SUBMITTED untuk dapat diproses ke tahap konfirmasi.</p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>Menampilkan halaman {{ pagination.page }} dari {{ pagination.totalPages }} (Total {{ pagination.total }} data)</div>
        <div class="flex items-center gap-1">
          <button
            :disabled="pagination.page <= 1"
            @click="fetchApplicants(pagination.page - 1)"
            class="px-3 py-1 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchApplicants(pagination.page + 1)"
            class="px-3 py-1 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
