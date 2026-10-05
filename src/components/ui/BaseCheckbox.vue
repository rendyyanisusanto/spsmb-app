<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  label: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="flex items-center space-x-2 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="emit('update:modelValue', $event.target.checked)"
      :disabled="disabled"
      class="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 disabled:cursor-not-allowed"
      v-bind="$attrs"
    />
    <span v-if="label" class="text-sm font-medium text-slate-700">{{ label }}</span>
  </label>
</template>
