<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { fetchDashboardDataMock } from '@/data/mock/dashboard'
import StatsCard from '@/components/admin/StatsCard.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import { formatDate } from '@/utils/date'
const { user } = useAuth()
const loading = ref(true)
const error = ref('')

const stats = ref({
  totalApplicants: 0,
  todayApplicants: 0,
  totalUsers: 0,
  statsByLembaga: {}
})

const recentPendaftar = ref([])

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const institutionName = user.value?.institutions?.[0]?.name
    const res = await fetchDashboardDataMock(user.value?.primaryRole, institutionName)
    if (res.success) {
      stats.value = res.stats
      recentPendaftar.value = res.recent
    } else {
      error.value = 'Gagal memuat data dashboard'
    }
  } catch (err) {
    error.value = 'Terjadi kesalahan sistem'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const getInitials = (name) => {
  if (!name) return 'U'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

const getBadgeClass = (lembaga) => {
  const classes = {
    'SMP IT Asy-Syadzili': 'bg-blue-100 text-blue-700 border-blue-200',
    'SMA IT Asy-Syadzili': 'bg-green-100 text-green-700 border-green-200',
    'SMK IT Asy-Syadzili': 'bg-amber-100 text-amber-700 border-amber-200',
    'Non Formal': 'bg-slate-100 text-slate-700 border-slate-200'
  }
  return classes[lembaga] || 'bg-blue-100 text-blue-700 border-blue-200'
}


</script>

<template>
  <div class="dashboard-container">
    <!-- Error Alert -->
    <BaseErrorState v-if="error" :message="error" @retry="loadData" class="mb-6" />

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Total Pendaftar"
        :value="loading ? '...' : stats.totalApplicants.toLocaleString()"
        icon="Users"
        color="primary"
        :description="user?.primaryRole === 'ADMIN_SPSMB' ? `Pendaftar ${user.institutions?.[0]?.name}` : 'Semua lembaga'"
      />
      
      <StatsCard
        title="Pendaftar Hari Ini"
        :value="loading ? '...' : stats.todayApplicants.toLocaleString()"
        icon="TrendingUp"
        color="success"
        trend="up"
        trendValue="+12%"
        description="Pendaftaran baru hari ini"
      />

      <StatsCard
        v-if="user?.role === 'SUPER_ADMIN'"
        title="Total Users"
        :value="loading ? '...' : stats.totalUsers.toLocaleString()"
        icon="UserCog"
        color="info"
        description="Admin dan user sistem"
      />

      <StatsCard
        :title="user?.primaryRole === 'ADMIN_SPSMB' ? user.institutions?.[0]?.name : 'Status Sistem'"
        :value="user?.primaryRole === 'ADMIN_SPSMB' 
          ? (loading ? '...' : (stats.statsByLembaga[user.institutions?.[0]?.name] || 0).toLocaleString())
          : 'Online'"
        icon="Zap"
        color="warning"
        :description="user?.primaryRole === 'ADMIN_SPSMB' ? 'Pendaftar lembaga Anda' : 'Sistem berjalan normal'"
      />
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <router-link to="/admin/pendaftar" class="group block no-underline">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full flex items-center">
          <div class="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-4 group-hover:bg-blue-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          </div>
          <div>
            <h6 class="text-slate-800 font-semibold mb-0.5">Data Pendaftar</h6>
            <p class="text-sm text-slate-500 m-0">Kelola pendaftar</p>
          </div>
        </div>
      </router-link>

      <router-link v-if="user?.role === 'SUPER_ADMIN'" to="/admin/users" class="group block no-underline">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full flex items-center">
          <div class="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mr-4 group-hover:bg-green-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <h6 class="text-slate-800 font-semibold mb-0.5">Management Users</h6>
            <p class="text-sm text-slate-500 m-0">Kelola pengguna</p>
          </div>
        </div>
      </router-link>

      <router-link to="/admin/reports" class="group block no-underline">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full flex items-center">
          <div class="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center mr-4 group-hover:bg-cyan-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
          </div>
          <div>
            <h6 class="text-slate-800 font-semibold mb-0.5">Laporan</h6>
            <p class="text-sm text-slate-500 m-0">Lihat statistik</p>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Recent Pendaftar Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
        <div>
          <h5 class="text-lg font-bold text-slate-800 m-0">Pendaftar Terbaru</h5>
          <p class="text-sm text-slate-500 mt-1 mb-0">Total {{ recentPendaftar.length }} item</p>
        </div>
        <router-link to="/admin/pendaftar" class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye mr-2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          Lihat Semua
        </router-link>
      </div>

      <div class="overflow-x-auto">
        <BaseLoading v-if="loading" />
        <BaseEmptyState v-else-if="recentPendaftar.length === 0" title="Belum ada pendaftar" description="Belum ada data pendaftar terbaru" />

        <table v-else class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50">
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Nama</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Lembaga</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tanggal Daftar</th>
              <th class="py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-24 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="pendaftar in recentPendaftar" :key="pendaftar.id" class="hover:bg-slate-50 transition-colors">
              <td class="py-3 px-5">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">
                    {{ getInitials(pendaftar.nama) }}
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-800 truncate">{{ pendaftar.nama }}</div>
                    <div class="text-sm text-slate-500 truncate">{{ pendaftar.no_hp }}</div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-5">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border" :class="getBadgeClass(pendaftar.lembaga_pendidikan)">
                  {{ pendaftar.lembaga_pendidikan }}
                </span>
              </td>
              <td class="py-3 px-5 text-sm text-slate-500">
                {{ formatDate(pendaftar.created_at) }}
              </td>
              <td class="py-3 px-5 text-center">
                <router-link :to="`/admin/pendaftar/${pendaftar.id}`" class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye mr-1.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Detail
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
