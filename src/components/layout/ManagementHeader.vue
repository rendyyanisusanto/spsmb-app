<script setup>
import { Menu, Bell, User } from 'lucide-vue-next'

const emit = defineEmits(['toggle-sidebar'])
</script>

<template>
  <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
    <div class="flex items-center gap-4">
      <button 
        @click="emit('toggle-sidebar')"
        class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <Menu class="h-5 w-5" />
      </button>
      <h2 class="text-lg font-semibold text-slate-800 hidden sm:block">Management Area</h2>
    </div>
    
    <div class="flex items-center gap-3">
      <button class="p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 relative">
        <Bell class="h-5 w-5" />
        <span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
      </button>
      <div class="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-200 transition">
        <User class="h-4 w-4" />
      </div>
    </div>
  </header>
</template>
