<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  isOpen: {
    type: Boolean,
    default: undefined
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'lg' // md, lg, xl, 2xl, 3xl, 4xl, 5xl, full
  },
  maxWidth: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const computedOpen = computed(() => (props.isOpen !== undefined ? props.isOpen : props.open))

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="computedOpen" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 p-4 backdrop-blur-sm">
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
        >
          <div v-if="computedOpen" :class="[
            'relative w-full transform rounded-2xl bg-white dark:bg-slate-900 shadow-2xl transition-all',
            maxWidth ? maxWidth : {
              'max-w-md': size === 'md',
              'max-w-lg': size === 'lg',
              'max-w-xl': size === 'xl',
              'max-w-2xl': size === '2xl',
              'max-w-3xl': size === '3xl',
              'max-w-4xl': size === '4xl',
              'max-w-5xl': size === '5xl',
              'max-w-full': size === 'full'
            }
          ]">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ title }}</h3>
              <button
                type="button"
                @click="handleClose"
                class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-500 transition-colors"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
            
            <div class="px-6 py-4">
              <slot></slot>
            </div>
            
            <div v-if="$slots.footer" class="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 rounded-b-2xl">
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
