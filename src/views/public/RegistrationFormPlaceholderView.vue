<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { CheckCircle } from 'lucide-vue-next'

const router = useRouter()

const goBack = () => {
  router.push('/pendaftaran')
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <BaseCard class="border-slate-200">
      <div class="text-center p-8 sm:p-12 space-y-6">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle class="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Formulir Pendaftaran Lengkap</h2>
          <p class="mt-3 text-slate-600 max-w-md mx-auto leading-relaxed">
            Halaman ini merupakan placeholder dan akan dikerjakan pada Sprint 3. 
            Data pendaftaran awal telah berhasil divalidasi dan dicetak pada console browser.
          </p>
        </div>
        <div class="pt-6">
          <BaseButton variant="outline" size="lg" @click="goBack">
            &larr; Kembali ke Pendaftaran Awal
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
