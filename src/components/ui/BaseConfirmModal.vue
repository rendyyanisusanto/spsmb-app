<template>
  <BaseModal :open="open" :title="title" @close="handleClose">
    <div class="py-4 text-gray-600">
      <slot>
        {{ message }}
      </slot>
    </div>
    <template #footer>
      <div class="flex justify-end space-x-3">
        <BaseButton variant="outline" @click="handleClose" :disabled="loading">
          {{ cancelText }}
        </BaseButton>
        <BaseButton :variant="confirmVariant" @click="handleConfirm" :loading="loading">
          {{ confirmText }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
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
  }
})

const emit = defineEmits(['close', 'confirm'])

const handleClose = () => {
  if (props.loading) return
  emit('close')
}

const handleConfirm = () => {
  emit('confirm')
}
</script>
