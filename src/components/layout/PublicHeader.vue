<script setup>
import { School } from 'lucide-vue-next'
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      <div class="flex items-center gap-4">
        <div class="bg-emerald-600 p-2 sm:p-3 rounded-xl text-white shadow-sm flex-shrink-0">
          <School class="h-6 w-6 sm:h-8 sm:w-8" />
        </div>
        <div>
          <p class="text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Seleksi Penerimaan Santri & Murid Baru</p>
          <h1 class="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">SPSMB ASY-SYADZILI</h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">Tahun Pelajaran 2027/2028</p>
        </div>
      </div>
    </div>
  </header>
</template>
