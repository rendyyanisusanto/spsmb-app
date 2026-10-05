<script setup>
import { ref, computed, onMounted } from 'vue'
import * as userService from '@/services/userService'
import * as institutionService from '@/services/institutionService'
import { useAuth } from '@/composables/useAuth'
import { logAudit } from '@/utils/auditLogger'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

// Data
const loading = ref(true)
const saving = ref(false)
const users = ref([])

const availableInstitutions = ref([])
const availableRoles = ref([])

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await userService.getUsers({ limit: 100 })
    if (res.success) {
      users.value = res.data
    }
  } catch (err) {
    console.error(err)
  }
  loading.value = false
}

const loadDependencies = async () => {
  try {
    const [rolesRes, instRes] = await Promise.all([
      userService.getRoles(),
      institutionService.getInstitutions()
    ])
    if (rolesRes.success) availableRoles.value = rolesRes.data
    if (instRes.success) availableInstitutions.value = instRes.data
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  loadDependencies()
  fetchUsers()
})

// Filters
const search = ref('')
const filterRole = ref('ALL')
const filterStatus = ref('ALL')
const filterInstitution = ref('ALL')

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    let match = true
    if (search.value) {
      const query = search.value.toLowerCase()
      match = match && (
        u.name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        (u.email && u.email.toLowerCase().includes(query))
      )
    }
    if (filterRole.value !== 'ALL') {
      match = match && u.roles?.some(r => r.name === filterRole.value)
    }
    if (filterStatus.value !== 'ALL') {
      const isAct = filterStatus.value === 'ACTIVE'
      match = match && u.isActive === isAct
    }
    if (filterInstitution.value !== 'ALL') {
      match = match && u.institutions?.some(i => i.id == filterInstitution.value)
    }
    return match
  })
})

const summary = computed(() => {
  return {
    total: users.value.length,
    superAdmin: users.value.filter(u => u.roles?.some(r => r.name === 'SUPER_ADMIN')).length,
    adminLembaga: users.value.filter(u => u.roles?.some(r => r.name === 'ADMIN_SPSMB')).length,
    active: users.value.filter(u => u.isActive).length
  }
})

// Modals
const showFormModal = ref(false)
const showResetModal = ref(false)

const form = ref({
  id: null,
  name: '',
  username: '',
  email: '',
  phone: '',
  roleId: null,
  institutionId: null,
  password: '',
  confirmPassword: '',
  isActive: true
})

const resetForm = ref({
  id: null,
  username: '',
  password: '',
  confirmPassword: ''
})

const openAdd = () => {
  const superAdminRole = availableRoles.value.find(r => r.name === 'SUPER_ADMIN')
  form.value = {
    id: null,
    name: '',
    username: '',
    email: '',
    phone: '',
    roleId: superAdminRole?.id || null,
    institutionId: null,
    password: '',
    confirmPassword: '',
    isActive: true
  }
  showFormModal.value = true
}

const openEdit = (u) => {
  form.value = {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email || '',
    phone: u.phone || '',
    roleId: u.roles?.[0]?.id || null,
    institutionId: u.institutions?.[0]?.id || null,
    password: '',
    confirmPassword: '',
    isActive: u.isActive
  }
  showFormModal.value = true
}

const openReset = (u) => {
  resetForm.value = {
    id: u.id,
    username: u.username,
    password: '',
    confirmPassword: ''
  }
  showResetModal.value = true
}

// Actions
const saveUser = async () => {
  if (!form.value.name || !form.value.username || !form.value.roleId) {
    alert('Nama, Username, dan Role wajib diisi!')
    return
  }
  
  const selectedRole = availableRoles.value.find(r => r.id === form.value.roleId)
  if (selectedRole?.name === 'ADMIN_SPSMB' && !form.value.institutionId) {
    alert('Lembaga wajib diisi untuk Admin Lembaga!')
    return
  }
  
  if (!form.value.id) {
    if (!form.value.password) {
      alert('Password wajib diisi saat membuat user baru!')
      return
    }
    if (form.value.password !== form.value.confirmPassword) {
      alert('Konfirmasi password tidak cocok!')
      return
    }
  }
  
  saving.value = true
  
  const payload = {
    name: form.value.name,
    username: form.value.username,
    email: form.value.email,
    phone: form.value.phone,
    roleIds: [form.value.roleId],
    institutionIds: form.value.institutionId ? [form.value.institutionId] : [],
    isActive: form.value.isActive,
    ...(form.value.id ? {} : { password: form.value.password })
  }
  
  try {
    if (form.value.id) {
      await userService.updateUser(form.value.id, payload)
    } else {
      await userService.createUser(payload)
    }
    await fetchUsers()
    showFormModal.value = false
  } catch (err) {
    alert(err?.response?.data?.errors || err?.response?.data?.message || 'Terjadi kesalahan')
  } finally {
    saving.value = false
  }
}

const saveResetPassword = async () => {
  if (!resetForm.value.password || !resetForm.value.confirmPassword) {
    alert('Password wajib diisi!')
    return
  }
  if (resetForm.value.password !== resetForm.value.confirmPassword) {
    alert('Konfirmasi password tidak cocok!')
    return
  }
  
  saving.value = true
  
  try {
    await userService.resetPassword(resetForm.value.id, {
      password: resetForm.value.password,
      passwordConfirmation: resetForm.value.confirmPassword
    })
    showResetModal.value = false
    alert('Password berhasil direset.')
  } catch (err) {
    alert(err?.response?.data?.errors || err?.response?.data?.message || 'Terjadi kesalahan')
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (user) => {
  const { user: authUser } = useAuth()
  if (authUser.value?.id === user.id && user.isActive) {
    alert('Anda tidak dapat menonaktifkan akun yang sedang digunakan.')
    return
  }
  
  const newStatus = !user.isActive
  try {
    await userService.updateStatus(user.id, newStatus)
    await fetchUsers()
  } catch (err) {
    alert(err?.response?.data?.errors || err?.response?.data?.message || 'Terjadi kesalahan')
  }
}
</script>

<template>
  <div class="user-management-view pb-20">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Manajemen User</h1>
        <p class="text-slate-500 m-0">Kelola akun administrator dan hak akses SPSMB.</p>
      </div>
      <button @click="openAdd" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Tambah User
      </button>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total User</div>
        <div class="text-2xl font-black text-slate-800">{{ summary.total }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div class="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Super Admin</div>
        <div class="text-2xl font-black text-blue-700">{{ summary.superAdmin }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div class="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Admin Lembaga</div>
        <div class="text-2xl font-black text-emerald-700">{{ summary.adminLembaga }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">User Aktif</div>
        <div class="text-2xl font-black text-slate-800">{{ summary.active }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
      <div class="flex-grow">
        <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Pencarian</label>
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" v-model="search" placeholder="Cari nama, username, email..." class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-800">
        </div>
      </div>
      <div class="w-full md:w-48">
        <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Role</label>
        <select v-model="filterRole" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-slate-800">
          <option value="ALL">Semua Role</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN_SPSMB">Admin Lembaga</option>
        </select>
      </div>
      <div class="w-full md:w-48">
        <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status</label>
        <select v-model="filterStatus" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-slate-800">
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </div>
      <div class="w-full md:w-48">
        <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Lembaga</label>
        <select v-model="filterInstitution" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-slate-800">
          <option value="ALL">Semua Lembaga</option>
          <option v-for="inst in availableInstitutions" :key="inst.id" :value="inst.id">{{ inst.name }}</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
      <BaseLoading v-if="loading" text="Memuat data user..." class="py-12" />
      
      <BaseEmptyState 
        v-else-if="filteredUsers.length === 0" 
        title="Tidak ditemukan" 
        description="Belum ada user atau tidak ditemukan user yang sesuai filter." 
        class="py-12"
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <th class="p-4">User</th>
              <th class="p-4">Kontak</th>
              <th class="p-4">Role & Lembaga</th>
              <th class="p-4">Status</th>
              <th class="p-4">Terakhir Login</th>
              <th class="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filteredUsers" :key="u.id" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              <td class="p-4">
                <div class="font-bold text-slate-800">{{ u.name }}</div>
                <div class="text-xs text-slate-500 font-mono mt-0.5">@{{ u.username }}</div>
              </td>
              <td class="p-4 text-sm text-slate-600">
                {{ u.email || '-' }}
              </td>
              <td class="p-4">
                <div class="font-bold text-xs" :class="u.roles?.[0]?.name === 'SUPER_ADMIN' ? 'text-blue-600' : 'text-emerald-600'">
                  {{ u.roles?.[0]?.name === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin Lembaga' }}
                </div>
                <div class="text-xs text-slate-500 mt-0.5">{{ u.institutions?.[0]?.name || '-' }}</div>
              </td>
              <td class="p-4">
                <span v-if="u.isActive" class="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-widest border border-emerald-200">
                  Aktif
                </span>
                <span v-else class="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-200">
                  Nonaktif
                </span>
              </td>
              <td class="p-4 text-sm text-slate-500 font-mono">
                {{ u.lastLogin || 'Belum pernah' }}
              </td>
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openReset(u)" class="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-800 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap">
                    Reset Password
                  </button>
                  <button @click="openEdit(u)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap">
                    Edit
                  </button>
                  <button @click="toggleStatus(u)" :class="['px-3 py-1.5 border rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap', u.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50']">
                    {{ u.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Tambah / Edit -->
    <BaseModal 
      :open="showFormModal" 
      :title="form.id ? 'Edit User' : 'Tambah User Baru'"
      @close="showFormModal = false"
      size="2xl"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nama Lengkap *</label>
            <input type="text" v-model="form.name" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Username *</label>
            <input type="text" v-model="form.username" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800" :disabled="!!form.id">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Email</label>
          <input type="email" v-model="form.email" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Role *</label>
            <select v-model="form.roleId" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
              <option v-for="r in availableRoles" :key="r.id" :value="r.id">{{ r.name === 'SUPER_ADMIN' ? 'Super Admin' : (r.name === 'ADMIN_SPSMB' ? 'Admin Lembaga' : r.name) }}</option>
            </select>
          </div>
          <div v-if="availableRoles.find(r => r.id === form.roleId)?.name === 'ADMIN_SPSMB'">
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Lembaga *</label>
            <select v-model="form.institutionId" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
              <option value="" disabled>Pilih Lembaga...</option>
              <option v-for="inst in availableInstitutions" :key="inst.id" :value="inst.id">{{ inst.name }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Status</label>
            <select v-model="form.isActive" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
              <option :value="true">Aktif</option>
              <option :value="false">Nonaktif</option>
            </select>
          </div>
        </div>

        <div v-if="!form.id" class="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-4">
          <p class="text-xs font-bold text-slate-600 uppercase mb-2">Password Akun</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Password *</label>
              <input type="password" v-model="form.password" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Konfirmasi Password *</label>
              <input type="password" v-model="form.confirmPassword" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
            </div>
          </div>
        </div>

      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showFormModal = false" :disabled="saving" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Batal</button>
          <button @click="saveUser" :disabled="saving" class="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <svg v-if="saving" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            {{ saving ? 'Menyimpan...' : 'Simpan User' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Reset Password -->
    <BaseModal 
      :open="showResetModal" 
      title="Reset Password"
      @close="showResetModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-slate-600">Mereset password untuk user <span class="font-bold">@{{ resetForm.username }}</span></p>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Password Baru *</label>
          <input type="password" v-model="resetForm.password" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Konfirmasi Password Baru *</label>
          <input type="password" v-model="resetForm.confirmPassword" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800">
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showResetModal = false" :disabled="saving" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Batal</button>
          <button @click="saveResetPassword" :disabled="saving" class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <svg v-if="saving" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            {{ saving ? 'Menyimpan...' : 'Reset Password' }}
          </button>
        </div>
      </template>
    </BaseModal>

  </div>
</template>
