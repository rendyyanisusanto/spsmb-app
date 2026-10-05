<script setup>
import { ref } from 'vue'
import { RouterView, RouterLink } from 'vue-router'
import ManagementHeader from '@/components/layout/ManagementHeader.vue'
import { LayoutDashboard, Users, School, FileText, MessageSquare, Settings, LogOut, X } from 'lucide-vue-next'

const sidebarOpen = ref(false)

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/management' },
  { name: 'Pendaftar', icon: Users, href: '#' },
  { name: 'Lembaga', icon: School, href: '#' },
  { name: 'Form', icon: FileText, href: '#' },
  { name: 'Template WhatsApp', icon: MessageSquare, href: '#' },
  { name: 'Pengaturan', icon: Settings, href: '#' },
]

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}
</script>

<template>
  <div class="min-h-screen flex bg-slate-50">
    <!-- Mobile sidebar backdrop -->
    <div 
      v-if="sidebarOpen" 
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
      @click="sidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="h-16 flex items-center justify-between px-6 border-b border-slate-200 flex-shrink-0">
        <div class="flex items-center gap-2 text-emerald-600">
          <School class="h-6 w-6" />
          <span class="text-lg font-bold text-slate-900">SPSMB Admin</span>
        </div>
        <button @click="sidebarOpen = false" class="lg:hidden text-slate-500 hover:text-slate-700">
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <div class="flex-grow overflow-y-auto py-4 px-3 flex flex-col gap-1">
        <RouterLink 
          v-for="item in navItems" 
          :key="item.name"
          :to="item.href"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="item.href === '/management' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-100'"
        >
          <component :is="item.icon" class="h-5 w-5" :class="item.href === '/management' ? 'text-emerald-600' : 'text-slate-400'" />
          {{ item.name }}
        </RouterLink>
      </div>

      <div class="p-4 border-t border-slate-200 flex-shrink-0">
        <button class="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <LogOut class="h-5 w-5 text-red-500" />
          Keluar
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <ManagementHeader @toggle-sidebar="toggleSidebar" />
      <main class="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
