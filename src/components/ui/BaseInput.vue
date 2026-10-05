<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: String,
  type: {
    type: String,
    default: 'text'
  },
  placeholder: String,
  required: Boolean,
  disabled: Boolean,
  error: String,
  helperText: String
})

const emit = defineEmits(['update:modelValue'])

const inputClasses = computed(() => {
  return [
    'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    props.error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
  ]
})
</script>

<template>
  <div class="flex flex-col space-y-1.5 w-full">
    <label v-if="label" class="text-sm font-medium text-slate-700">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :type="type"
      :value="modelValue"
      @input="emit('update:modelValue', $event.target.value)"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="inputClasses"
      v-bind="$attrs"
    />
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    <p v-else-if="helperText" class="text-sm text-slate-500">{{ helperText }}</p>
  </div>
</template>
