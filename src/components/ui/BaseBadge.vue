<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default' 
  }
})

const classes = computed(() => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variants = {
    default: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
    success: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    danger: 'bg-red-100 text-red-800 hover:bg-red-200',
    info: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  }
  
  return [base, variants[props.variant]]
})
</script>

<template>
  <div :class="classes">
    <slot></slot>
  </div>
</template>
