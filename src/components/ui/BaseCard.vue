<script setup>
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div v-if="$slots.header" class="px-6 py-4 border-b border-slate-100">
      <slot name="header"></slot>
    </div>
    <div class="p-6">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="px-6 py-4 bg-slate-50 border-t border-slate-100">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
