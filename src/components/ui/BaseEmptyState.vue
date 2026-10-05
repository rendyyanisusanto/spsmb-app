<template>
  <div class="flex flex-col items-center justify-center p-8 text-center" :class="containerClass">
    <div class="mb-4 text-gray-400" :class="iconContainerClass">
      <slot name="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </slot>
    </div>
    <h3 class="text-lg font-medium text-gray-900 mb-1">{{ title }}</h3>
    <p class="text-gray-500 text-sm max-w-sm" v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  containerClass: {
    type: String,
    default: 'min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg'
  },
  iconContainerClass: {
    type: String,
    default: 'bg-gray-50 p-4 rounded-full'
  }
})
</script>
