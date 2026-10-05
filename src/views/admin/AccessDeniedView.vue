<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <div class="mb-6 p-6 bg-orange-50 rounded-full text-orange-500">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">403 / Akses Ditolak</h1>
    <p class="text-gray-600 mb-8 max-w-md">
      Anda tidak memiliki izin untuk mengakses halaman ini.
    </p>
    <BaseButton @click="goDashboard" variant="primary">
      Kembali ke Dashboard
    </BaseButton>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()

const goDashboard = () => {
  router.push('/admin')
}
</script>
