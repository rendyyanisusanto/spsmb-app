<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const { user, logout, hasRole } = useAuth()
const router = useRouter()
const route = useRoute()

const sidebarVisible = ref(false)

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const closeSidebar = () => {
  sidebarVisible.value = false
}

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

const menuItems = [
  { icon: 'LayoutDashboard', label: 'Dashboard', href: '/admin', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'Users', label: 'Pendaftar', href: '/admin/pendaftar', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'Building2', label: 'Lembaga', href: '/admin/lembaga', roles: ['SUPER_ADMIN'] },
  { icon: 'CalendarDays', label: 'Periode / Gelombang', href: '/admin/periode', roles: ['SUPER_ADMIN'] },
  { icon: 'GraduationCap', label: 'Program / Jurusan', href: '/admin/program', roles: ['SUPER_ADMIN'] },
  { icon: 'FormInput', label: 'Form Pendaftaran', href: '/admin/form', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'FileText', label: 'Persyaratan / Dokumen', href: '/admin/persyaratan', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'MessageSquare', label: 'Template WhatsApp', href: '/admin/whatsapp/template', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'History', label: 'Riwayat WhatsApp', href: '/admin/whatsapp/log', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'UserCog', label: 'User & Role', href: '/admin/users', roles: ['SUPER_ADMIN'] },
  { icon: 'ShieldAlert', label: 'Audit Log', href: '/admin/audit-log', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'FileSpreadsheet', label: 'Laporan', href: '/admin/laporan', roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'] },
  { icon: 'Settings', label: 'Pengaturan', href: '/admin/settings', roles: ['SUPER_ADMIN'] }
]

const visibleMenuItems = computed(() => {
  return menuItems.filter(item => hasRole(item.roles))
})

const formatRole = (role) => {
  const map = {
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN_SPSMB': 'Admin Lembaga',
    'PETUGAS': 'Petugas'
  }
  return map[role] || role
}

const getPageTitle = computed(() => {
  const currentMenu = menuItems.find(item => item.href === route.path)
  return currentMenu ? currentMenu.label : 'Detail'
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 font-sans">
    
    <!-- Sidebar Overlay for Mobile -->
    <div 
      v-if="sidebarVisible"
      class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
      @click="closeSidebar"
    ></div>

    <!-- Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col"
      :class="sidebarVisible ? 'translate-x-0' : '-translate-x-full'"
      style="background: linear-gradient(180deg, #1A4D2E 0%, #2d6741 50%, #1A4D2E 100%); box-shadow: 4px 0 10px rgba(0,0,0,0.1);"
    >
      <!-- Sidebar Header -->
      <div class="p-6 border-b border-white/10 flex items-center">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mr-4 bg-white/90 text-[#1A4D2E]">
          <i data-lucide="building-2" class="w-6 h-6"></i>
        </div>
        <div>
          <h5 class="text-white font-bold text-lg leading-tight mb-0">Admin Panel</h5>
          <span class="text-white/80 text-xs">SPMB Asy-Syadzili</span>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
        <div class="text-[0.65rem] font-bold text-white/50 uppercase tracking-wider mb-2 px-4 mt-2">Menu Utama</div>
        
        <router-link
          v-for="item in visibleMenuItems"
          :key="item.href"
          :to="item.href"
          @click="closeSidebar"
          class="flex items-center px-4 py-3 rounded-xl transition-all duration-200 border text-sm"
          :class="route.path === item.href || (item.href !== '/admin' && route.path.startsWith(item.href)) ? 'bg-white/15 border-white/30 text-white font-medium' : 'border-transparent text-white/80 hover:bg-white/5 hover:border-white/20'"
        >
          <span class="w-5 h-5 mr-3 flex items-center justify-center">
            <!-- Icon placeholder -->
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard" v-if="item.icon === 'LayoutDashboard'"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users" v-if="item.icon === 'Users'"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2" v-if="item.icon === 'Building2'"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days" v-if="item.icon === 'CalendarDays'"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap" v-if="item.icon === 'GraduationCap'"><path d="M21.42 10.922a2 2 0 0 0-.019-3.838L12.83 4.33a2 2 0 0 0-1.66 0L2.6 7.08a2 2 0 0 0 0 3.84l8.57 3.75a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-form-input" v-if="item.icon === 'FormInput'"><rect width="20" height="12" x="2" y="6" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text" v-if="item.icon === 'FileText'"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square" v-if="item.icon === 'MessageSquare'"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history" v-if="item.icon === 'History'"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-cog" v-if="item.icon === 'UserCog'"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert" v-if="item.icon === 'ShieldAlert'"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-3 6-3s4 2 6 3a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-spreadsheet" v-if="item.icon === 'FileSpreadsheet'"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings" v-if="item.icon === 'Settings'"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
          {{ item.label }}
        </router-link>
      </div>

      <!-- User Info & Logout -->
      <div class="p-4 border-t border-white/10">
        <div class="bg-white/10 border border-white/20 rounded-xl p-3 mb-3">
          <div class="flex items-center mb-2">
            <div class="w-8 h-8 rounded-full bg-white/90 text-[#1A4D2E] flex items-center justify-center font-bold text-sm mr-3">
              {{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-white font-semibold text-sm truncate">{{ user?.name }}</div>
              <div class="text-white/70 text-xs truncate">{{ formatRole(user?.primaryRole) }}</div>
            </div>
          </div>
          <div v-if="user?.institutions?.length" class="bg-white/15 border border-white/30 rounded-lg px-2 py-1 text-center">
            <span class="text-white/80 text-[0.7rem] truncate block" :title="user.institutions.map(i => i.name).join(', ')">
              Lembaga: {{ user.institutions.length === 1 ? user.institutions[0].name : `${user.institutions.length} Lembaga` }}
            </span>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all duration-200 text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out mr-2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          Logout
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 bg-slate-50">
      
      <!-- Topbar -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div class="flex items-center min-w-0">
          <button
            @click="toggleSidebar"
            class="lg:hidden text-slate-500 hover:text-slate-700 mr-4 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          
          <div class="truncate pr-4">
            <h4 class="text-lg font-bold text-slate-800 m-0 leading-tight truncate">{{ getPageTitle }}</h4>
            <span class="text-xs text-slate-500 truncate block">Selamat datang kembali, {{ user?.name }}</span>
          </div>
        </div>

        <div class="flex items-center flex-shrink-0">
          <div class="flex items-center bg-slate-100 rounded-full px-4 py-2">
            <div class="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span class="text-sm text-slate-600 font-medium">{{ user?.username }}</span>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="flex-1 overflow-y-auto p-4 lg:p-8">
        <router-view></router-view>
      </div>

    </main>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

.font-sans {
  font-family: 'Poppins', sans-serif;
}
</style>
