<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: String,
  placeholder: String,
  rows: {
    type: [Number, String],
    default: 3
  },
  required: Boolean,
  disabled: Boolean,
  error: String
})

const emit = defineEmits(['update:modelValue'])

const textareaClasses = computed(() => {
  return [
    'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
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
    <textarea
      :value="modelValue"
      @input="emit('update:modelValue', $event.target.value)"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :required="required"
      :class="textareaClasses"
      v-bind="$attrs"
    ></textarea>
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
  </div>
</template>
