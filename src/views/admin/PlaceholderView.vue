<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageTitle = computed(() => {
  const pathMap = {
    '/admin/lembaga': 'Manajemen Lembaga',
    '/admin/periode': 'Periode & Gelombang',
    '/admin/program': 'Program & Jurusan',
    '/admin/form': 'Form Pendaftaran',
    '/admin/persyaratan': 'Persyaratan & Dokumen',
    '/admin/whatsapp/template': 'Template WhatsApp',
    '/admin/whatsapp/log': 'Riwayat WhatsApp',
    '/admin/users': 'Manajemen User',
    '/admin/audit-log': 'Audit Log',
    '/admin/settings': 'Pengaturan Sistem'
  }
  return pathMap[route.path] || 'Halaman Belum Tersedia'
})
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
    <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-construction"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-slate-800 mb-2">{{ pageTitle }}</h2>
    <p class="text-slate-500 max-w-md">
      Halaman ini masih dalam tahap pengembangan dan akan diselesaikan pada sprint berikutnya.
    </p>
  </div>
</template>
