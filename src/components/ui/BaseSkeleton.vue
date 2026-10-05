<template>
  <div class="animate-pulse bg-gray-200 rounded" :class="[widthClass, heightClass, className]"></div>
</template>

<script setup>
defineProps({
  widthClass: {
    type: String,
    default: 'w-full'
  },
  heightClass: {
    type: String,
    default: 'h-4'
  },
  className: {
    type: String,
    default: ''
  }
})
</script>
