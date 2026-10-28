<template>
  <BaseModal :open="computedOpen" :title="title" @close="handleClose">
    <div class="py-4 text-slate-600 dark:text-slate-300">
      <slot>
        {{ message }}
      </slot>
    </div>
    <template #footer>
      <div class="flex justify-end space-x-3">
        <BaseButton variant="outline" @click="handleClose" :disabled="computedLoading">
          {{ cancelText }}
        </BaseButton>
        <BaseButton :variant="confirmVariant" @click="handleConfirm" :loading="computedLoading">
          {{ confirmText }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

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
    default: 'Konfirmasi'
  },
  message: {
    type: String,
    default: 'Apakah Anda yakin ingin melakukan aksi ini?'
  },
  confirmText: {
    type: String,
    default: 'Ya, Lanjutkan'
  },
  cancelText: {
    type: String,
    default: 'Batal'
  },
  confirmVariant: {
    type: String,
    default: 'danger'
  },
  loading: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: undefined
  }
})

const emit = defineEmits(['close', 'confirm'])

const computedOpen = computed(() => (props.isOpen !== undefined ? props.isOpen : props.open))
const computedLoading = computed(() => (props.isLoading !== undefined ? props.isLoading : props.loading))

const handleClose = () => {
  if (computedLoading.value) return
  emit('close')
}

const handleConfirm = () => {
  emit('confirm')
}
</script>
