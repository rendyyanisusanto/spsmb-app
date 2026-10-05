<script setup>
const props = defineProps({
  currentStep: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <div class="bg-slate-50/80 border-b border-slate-100 px-6 py-5 flex justify-center items-center">
    <!-- Step 1 -->
    <div class="flex items-center">
      <div 
        :class="[
          'flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm transition-colors shadow-sm',
          currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
        ]"
      >
        1
      </div>
      <span 
        :class="[
          'ml-2.5 text-sm font-semibold transition-colors',
          currentStep >= 1 ? 'text-slate-900' : 'text-slate-500'
        ]"
      >
        Petunjuk
      </span>
    </div>

    <!-- Line -->
    <div class="mx-4 sm:mx-8 h-1 w-12 sm:w-24 bg-slate-200 rounded-full overflow-hidden">
      <div 
        class="h-full bg-emerald-600 transition-all duration-500"
        :style="{ width: currentStep > 1 ? '100%' : '0%' }"
      ></div>
    </div>

    <!-- Step 2 -->
    <div class="flex items-center">
      <div 
        :class="[
          'flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm transition-colors shadow-sm',
          currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-400'
        ]"
      >
        2
      </div>
      <span 
        :class="[
          'ml-2.5 text-sm font-semibold transition-colors',
          currentStep >= 2 ? 'text-slate-900' : 'text-slate-400'
        ]"
      >
        Pendaftaran
      </span>
    </div>
  </div>
</template>
