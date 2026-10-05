<template>
  <div class="flex flex-col items-center justify-center p-8 text-center" :class="containerClass">
    <div class="mb-4 text-red-500 bg-red-50 p-4 rounded-full">
      <slot name="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </slot>
    </div>
    <h3 class="text-lg font-medium text-gray-900 mb-1">{{ title }}</h3>
    <p class="text-gray-500 text-sm max-w-sm mb-6">{{ message }}</p>
    <BaseButton v-if="showRetry" @click="$emit('retry')" variant="outline" size="sm">
      Coba Lagi
    </BaseButton>
  </div>
</template>

<script setup>
import BaseButton from './BaseButton.vue'

defineProps({
  title: {
    type: String,
    default: 'Terjadi Kesalahan'
  },
  message: {
    type: String,
    default: 'Terjadi kesalahan saat memuat data.'
  },
  showRetry: {
    type: Boolean,
    default: true
  },
  containerClass: {
    type: String,
    default: 'min-h-[200px] border-2 border-dashed border-red-100 rounded-lg'
  }
})

defineEmits(['retry'])
</script>
