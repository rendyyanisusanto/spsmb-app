<script setup>
import { computed } from 'vue'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-vue-next'

const props = defineProps({
  variant: {
    type: String,
    default: 'info' 
  },
  title: String
})

const alertConfig = computed(() => {
  const configs = {
    success: {
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconClass: 'text-emerald-500',
      icon: CheckCircle2
    },
    warning: {
      classes: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      iconClass: 'text-yellow-500',
      icon: AlertTriangle
    },
    danger: {
      classes: 'bg-red-50 text-red-800 border-red-200',
      iconClass: 'text-red-500',
      icon: XCircle
    },
    info: {
      classes: 'bg-blue-50 text-blue-800 border-blue-200',
      iconClass: 'text-blue-500',
      icon: Info
    }
  }
  return configs[props.variant]
})
</script>

<template>
  <div :class="['rounded-lg border p-4', alertConfig.classes]" role="alert">
    <div class="flex">
      <div class="flex-shrink-0">
        <component :is="alertConfig.icon" class="h-5 w-5" :class="alertConfig.iconClass" aria-hidden="true" />
      </div>
      <div class="ml-3 w-full">
        <h3 v-if="title" class="text-sm font-medium mb-1">{{ title }}</h3>
        <div class="text-sm">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>
