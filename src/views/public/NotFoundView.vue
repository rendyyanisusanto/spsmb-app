<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <div class="mb-6 p-6 bg-red-50 rounded-full text-red-500">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">404 Not Found</h1>
    <p class="text-gray-600 mb-8 max-w-md">
      Halaman tidak ditemukan. Halaman yang Anda cari mungkin telah dihapus atau URL yang Anda masukkan salah.
    </p>
    <BaseButton @click="goHome" variant="primary">
      Kembali ke Beranda
    </BaseButton>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>
