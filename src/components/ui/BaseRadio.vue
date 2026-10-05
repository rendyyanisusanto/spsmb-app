<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  value: {
    type: [String, Number, Boolean],
    required: true
  },
  label: String,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="flex items-center space-x-2 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': disabled }">
    <input
      type="radio"
      :value="value"
      :checked="modelValue === value"
      @change="emit('update:modelValue', value)"
      :disabled="disabled"
      class="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 disabled:cursor-not-allowed"
      v-bind="$attrs"
    />
    <span v-if="label" class="text-sm font-medium text-slate-700">{{ label }}</span>
  </label>
</template>
