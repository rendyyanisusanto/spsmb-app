<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  try {
    const hash = route.params.hash
    let b64 = hash.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) {
      b64 += '='
    }
    const decoded = atob(b64) // Decode Base64
    const parts = decoded.split('::')
    
    if (parts.length === 2 && parts[0] && parts[1]) {
      const registrationNumber = parts[0]
      const continueToken = parts[1]
      
      // Simpan session secara lokal di device ini
      localStorage.setItem('spsmb_continue_session', JSON.stringify({
        registrationNumber,
        continueToken
      }))
      
      // Arahkan langsung ke form pendaftaran lengkap
      router.replace('/pendaftaran/lengkap')
    } else {
      // Hash tidak valid
      router.replace('/pendaftaran')
    }
  } catch (err) {
    // Hash rusak atau manipulasi
    router.replace('/pendaftaran')
  }
})
</script>

<template>
  <div class="flex justify-center items-center min-h-screen">
    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A4D2E]"></div>
  </div>
</template>
