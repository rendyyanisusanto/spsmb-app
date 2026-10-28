<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  LayoutDashboard,
  Users,
  Settings2,
  FileSpreadsheet,
  Building2,
  CalendarDays,
  GraduationCap,
  FormInput,
  FileText,
  FileCheck,
  Radio,
  MessageSquare,
  History,
  UserCog,
  ShieldAlert,
  HelpCircle,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  Contact,
  School,
  UserCheck,
  CheckSquare,
  CreditCard,
  GitBranch,
  X
} from 'lucide-vue-next'

const { user, logout, hasRole } = useAuth()
const router = useRouter()
const route = useRoute()

const sidebarVisible = ref(false)
const openMenus = ref({})

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

// Menu groups configuration
const menuSections = [
  {
    title: 'Menu Utama',
    items: [
      {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/admin',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
      },
      {
        icon: Users,
        label: 'Pendaftar',
        href: '/admin/pendaftar',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
      },
      {
        icon: Settings2,
        label: 'Setting SPSMB',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'],
        children: [
          {
            icon: FormInput,
            label: 'Form Pendaftaran Lengkap',
            href: '/admin/form',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          },
          {
            icon: FileCheck,
            label: 'Persyaratan / Dokumen',
            href: '/admin/persyaratan',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          },
          {
            icon: MessageSquare,
            label: 'Template Whatsapp',
            href: '/admin/whatsapp/template',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          },
          {
            icon: HelpCircle,
            label: 'FAQ',
            href: '/admin/faq',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          }
        ]
      },
      {
        icon: FileSpreadsheet,
        label: 'Laporan',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'],
        children: [
          {
            icon: FileSpreadsheet,
            label: 'Laporan SPSMB',
            href: '/admin/laporan',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          },
          {
            icon: History,
            label: 'Riwayat Whatsapp',
            href: '/admin/whatsapp/log',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          },
          {
            icon: ShieldAlert,
            label: 'Audit Log',
            href: '/admin/audit-log',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          }
        ]
      }
    ]
  },
  {
    title: 'CRM',
    items: [
      {
        icon: Contact,
        label: 'CRM',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS'],
        children: [
          {
            icon: Users,
            label: 'Manajemen Lead',
            href: '/admin/crm/leads',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS']
          },
          {
            icon: MessageSquare,
            label: 'Template WA CRM',
            href: '/admin/crm/templates',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS']
          }
        ]
      },
      {
        icon: School,
        label: 'Promosi Sekolah',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS'],
        children: [
          {
            icon: School,
            label: 'Target Sekolah',
            href: '/admin/crm/schools',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS']
          },
          {
            icon: FileText,
            label: 'Pengaturan Surat',
            href: '/admin/crm/schools/letter-settings',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          }
        ]
      }
    ]
  },
  // Sementara disembunyikan:
  /*
  {
    title: 'Konfirmasi Siswa',
    items: [
      {
        icon: UserCheck,
        label: 'Konfirmasi Siswa',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS'],
        children: [
          {
            icon: CheckSquare,
            label: 'Proses Konfirmasi',
            href: '/admin/konfirmasi',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS']
          },
          {
            icon: GraduationCap,
            label: 'Siswa / Santri Resmi',
            href: '/admin/konfirmasi/siswa-resmi',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB', 'PETUGAS']
          },
          {
            icon: GitBranch,
            label: 'Master Jalur Konfirmasi',
            href: '/admin/konfirmasi/jalur',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          },
          {
            icon: CreditCard,
            label: 'Master Komponen Tagihan',
            href: '/admin/konfirmasi/tagihan',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          }
        ]
      }
    ]
  },
  */
  {
    title: 'Data & Sistem',
    items: [
      {
        icon: Building2,
        label: 'Master Data',
        roles: ['SUPER_ADMIN'],
        children: [
          {
            icon: Building2,
            label: 'Lembaga',
            href: '/admin/lembaga',
            roles: ['SUPER_ADMIN']
          },
          {
            icon: CalendarDays,
            label: 'Periode / Gelombang',
            href: '/admin/periode',
            roles: ['SUPER_ADMIN']
          },
          {
            icon: GraduationCap,
            label: 'Program / Jurusan',
            href: '/admin/program',
            roles: ['SUPER_ADMIN']
          }
        ]
      },
      {
        icon: Settings,
        label: 'Pengaturan Sistem',
        roles: ['SUPER_ADMIN', 'ADMIN_SPSMB'],
        children: [
          {
            icon: Radio,
            label: 'Gateway WhatsApp',
            href: '/admin/whatsapp/gateway',
            roles: ['SUPER_ADMIN', 'ADMIN_SPSMB']
          },
          {
            icon: UserCog,
            label: 'User & Role',
            href: '/admin/users',
            roles: ['SUPER_ADMIN']
          },
          {
            icon: Settings,
            label: 'Pengaturan',
            href: '/admin/settings',
            roles: ['SUPER_ADMIN']
          }
        ]
      }
    ]
  }
]

// Filter sections and items according to user roles
const visibleMenuSections = computed(() => {
  return menuSections
    .map(section => {
      const filteredItems = section.items
        .map(item => {
          if (item.children) {
            const filteredChildren = item.children.filter(child => !child.roles || hasRole(child.roles))
            if (filteredChildren.length === 0) return null
            return {
              ...item,
              children: filteredChildren
            }
          }
          if (item.roles && !hasRole(item.roles)) return null
          return item
        })
        .filter(Boolean)

      if (filteredItems.length === 0) return null
      return {
        ...section,
        items: filteredItems
      }
    })
    .filter(Boolean)
})

const toggleSubmenu = (label) => {
  openMenus.value[label] = !openMenus.value[label]
}

const isItemActive = (href) => {
  if (!href) return false
  if (href === '/admin') return route.path === '/admin'
  if (route.path === href) return true
  if (href === '/admin/konfirmasi') {
    return route.path.startsWith('/admin/konfirmasi/') &&
      !route.path.startsWith('/admin/konfirmasi/siswa-resmi') &&
      !route.path.startsWith('/admin/konfirmasi/jalur') &&
      !route.path.startsWith('/admin/konfirmasi/tagihan')
  }
  if (href === '/admin/crm/schools') {
    return (route.path === '/admin/crm/schools' || route.path.startsWith('/admin/crm/schools/')) &&
      !route.path.startsWith('/admin/crm/schools/letter-settings')
  }
  return route.path.startsWith(href + '/')
}

const isParentActive = (item) => {
  if (!item.children) return isItemActive(item.href)
  return item.children.some(child => isItemActive(child.href))
}

// Auto-expand parent submenu when visiting any of its children
watch(
  () => route.path,
  () => {
    menuSections.forEach(section => {
      section.items.forEach(item => {
        if (item.children && isParentActive(item)) {
          openMenus.value[item.label] = true
        }
      })
    })
  },
  { immediate: true }
)

const formatRole = (role) => {
  const map = {
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN_SPSMB': 'Admin Lembaga',
    'PETUGAS': 'Petugas'
  }
  return map[role] || role
}

const getPageTitle = computed(() => {
  if (route.path.includes('/pendaftar/') && route.path.endsWith('/edit')) return 'Edit Pendaftar'
  if (route.path.includes('/pendaftar/')) return 'Detail Pendaftar'
  if (route.path.includes('/crm/leads/')) return 'Detail Lead'
  if (route.path.includes('/crm/schools/letter-settings')) return 'Pengaturan Surat Presentasi'
  if (route.path.includes('/crm/schools/')) return 'Detail Target Sekolah'
  if (route.path.includes('/persyaratan/pendaftar/')) return 'Verifikasi Dokumen Pendaftar'

  // Exact match first
  for (const section of visibleMenuSections.value) {
    for (const item of section.items) {
      if (item.href && item.href === route.path) return item.label
      if (item.children) {
        const foundChild = item.children.find(c => c.href === route.path)
        if (foundChild) return foundChild.label
      }
    }
  }

  // Prefix match
  for (const section of visibleMenuSections.value) {
    for (const item of section.items) {
      if (item.href && item.href !== '/admin' && route.path.startsWith(item.href)) return item.label
      if (item.children) {
        const foundChild = item.children.find(c => route.path.startsWith(c.href))
        if (foundChild) return foundChild.label
      }
    }
  }

  return 'Admin Panel'
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 font-sans">
    
    <!-- Sidebar Overlay for Mobile -->
    <div 
      v-if="sidebarVisible"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
      @click="closeSidebar"
    ></div>

    <!-- Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col"
      :class="sidebarVisible ? 'translate-x-0' : '-translate-x-full'"
      style="background: linear-gradient(180deg, #1A4D2E 0%, #225a36 50%, #153c23 100%); box-shadow: 4px 0 16px rgba(0,0,0,0.12);"
    >
      <!-- Sidebar Header -->
      <div class="p-5 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center mr-3 bg-white/95 text-[#1A4D2E] shadow-sm">
            <Building2 class="w-6 h-6" />
          </div>
          <div>
            <h5 class="text-white font-bold text-base leading-tight mb-0.5 tracking-tight">Admin Panel</h5>
            <span class="text-emerald-200/80 text-xs font-medium">SPMB Asy-Syadzili</span>
          </div>
        </div>
        <button 
          @click="closeSidebar"
          class="lg:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation List -->
      <div class="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 scrollbar-hide">
        <div v-for="section in visibleMenuSections" :key="section.title" class="space-y-1">
          <!-- Section Title -->
          <div class="text-[0.68rem] font-bold text-emerald-200/60 uppercase tracking-wider px-3 pt-2 pb-1">
            {{ section.title }}
          </div>

          <div v-for="item in section.items" :key="item.label" class="space-y-1">
            <!-- Standalone Direct Link -->
            <router-link
              v-if="!item.children"
              :to="item.href"
              @click="closeSidebar"
              class="flex items-center px-3.5 py-2.5 rounded-xl transition-all duration-200 border text-sm"
              :class="isItemActive(item.href) 
                ? 'bg-white/20 border-white/30 text-white font-medium shadow-sm' 
                : 'border-transparent text-white/80 hover:bg-white/10 hover:text-white'"
            >
              <span class="w-5 h-5 mr-3 flex items-center justify-center flex-shrink-0">
                <component :is="item.icon" class="w-5 h-5" />
              </span>
              <span class="truncate">{{ item.label }}</span>
            </router-link>

            <!-- Parent Menu with Submenu (Dropdown) -->
            <div v-else class="space-y-1">
              <button
                type="button"
                @click="toggleSubmenu(item.label)"
                class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 border text-sm text-left select-none"
                :class="isParentActive(item) 
                  ? 'bg-white/15 border-white/25 text-white font-medium' 
                  : 'border-transparent text-white/80 hover:bg-white/10 hover:text-white'"
              >
                <div class="flex items-center min-w-0">
                  <span class="w-5 h-5 mr-3 flex items-center justify-center flex-shrink-0" :class="isParentActive(item) ? 'text-emerald-300' : 'text-white/80'">
                    <component :is="item.icon" class="w-5 h-5" />
                  </span>
                  <span class="truncate">{{ item.label }}</span>
                </div>
                <ChevronDown
                  class="w-4 h-4 ml-2 flex-shrink-0 transition-transform duration-200"
                  :class="openMenus[item.label] ? 'rotate-180 text-white' : 'text-white/60'"
                />
              </button>

              <!-- Submenu Items -->
              <div
                v-show="openMenus[item.label]"
                class="pl-4 pr-1 py-1 space-y-1 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-white/20"
              >
                <router-link
                  v-for="child in item.children"
                  :key="child.href"
                  :to="child.href"
                  @click="closeSidebar"
                  class="flex items-center pl-5 pr-3 py-2 rounded-lg text-xs transition-all duration-150 border"
                  :class="isItemActive(child.href) 
                    ? 'bg-white text-[#1A4D2E] font-bold border-white shadow-sm' 
                    : 'border-transparent text-white/80 hover:text-white hover:bg-white/10'"
                >
                  <span class="w-4 h-4 mr-2.5 flex items-center justify-center flex-shrink-0">
                    <component :is="child.icon" class="w-3.5 h-3.5" />
                  </span>
                  <span class="truncate">{{ child.label }}</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- User Info & Logout Footer -->
      <div class="p-4 border-t border-white/10">
        <div class="bg-white/10 border border-white/20 rounded-xl p-3 mb-3">
          <div class="flex items-center mb-2">
            <div class="w-8 h-8 rounded-full bg-white/95 text-[#1A4D2E] flex items-center justify-center font-bold text-sm mr-3 shadow-sm">
              {{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-white font-semibold text-sm truncate">{{ user?.name }}</div>
              <div class="text-white/70 text-xs truncate">{{ formatRole(user?.primaryRole) }}</div>
            </div>
          </div>
          <div v-if="user?.institutions?.length" class="bg-white/15 border border-white/25 rounded-lg px-2 py-1 text-center">
            <span class="text-white/85 text-[0.7rem] truncate block" :title="user.institutions.map(i => i.name).join(', ')">
              Lembaga: {{ user.institutions.length === 1 ? user.institutions[0].name : `${user.institutions.length} Lembaga` }}
            </span>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-sm"
        >
          <LogOut class="w-4 h-4 mr-2" />
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
            class="lg:hidden text-slate-500 hover:text-slate-700 mr-4 p-1 rounded-lg hover:bg-slate-100"
          >
            <Menu class="w-6 h-6" />
          </button>
          
          <div class="truncate pr-4">
            <h4 class="text-lg font-bold text-slate-800 m-0 leading-tight truncate">{{ getPageTitle }}</h4>
            <span class="text-xs text-slate-500 truncate block">Selamat datang kembali, {{ user?.name }}</span>
          </div>
        </div>

        <div class="flex items-center flex-shrink-0">
          <div class="flex items-center bg-slate-100 rounded-full px-4 py-2">
            <div class="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
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

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
