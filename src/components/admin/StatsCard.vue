<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  value: [String, Number],
  icon: String, // will map to lucide icon name or generic string
  color: String, // 'primary', 'success', 'info', 'warning'
  description: String,
  trend: String,
  trendValue: String
})

const colorConfig = computed(() => {
  const configs = {
    primary: {
      bg: 'bg-blue-50',
      iconText: 'text-blue-600',
      iconBg: 'bg-blue-100',
      border: 'border-l-4 border-blue-500'
    },
    success: {
      bg: 'bg-green-50',
      iconText: 'text-green-600',
      iconBg: 'bg-green-100',
      border: 'border-l-4 border-green-500'
    },
    info: {
      bg: 'bg-cyan-50',
      iconText: 'text-cyan-600',
      iconBg: 'bg-cyan-100',
      border: 'border-l-4 border-cyan-500'
    },
    warning: {
      bg: 'bg-amber-50',
      iconText: 'text-amber-600',
      iconBg: 'bg-amber-100',
      border: 'border-l-4 border-amber-500'
    }
  }
  return configs[props.color] || configs.primary
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative" :class="colorConfig.border">
    <div class="p-5">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-sm font-medium text-slate-500 mb-1">{{ title }}</p>
          <h3 class="text-2xl font-bold text-slate-800">{{ value }}</h3>
        </div>
        <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="colorConfig.iconBg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide" :class="colorConfig.iconText">
            <template v-if="icon === 'Users'"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></template>
            <template v-else-if="icon === 'TrendingUp'"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></template>
            <template v-else-if="icon === 'UserCog'"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/></template>
            <template v-else-if="icon === 'Zap'"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></template>
            <template v-else><circle cx="12" cy="12" r="10"/></template>
          </svg>
        </div>
      </div>
      <div class="mt-4 flex items-center text-sm">
        <span v-if="trend" :class="trend === 'up' ? 'text-green-500' : 'text-red-500'" class="flex items-center font-medium mr-2">
          <svg v-if="trend === 'up'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up mr-1"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-down mr-1"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
          {{ trendValue }}
        </span>
        <span class="text-slate-500">{{ description }}</span>
      </div>
    </div>
  </div>
</template>
