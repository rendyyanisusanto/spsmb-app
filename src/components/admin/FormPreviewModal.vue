<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  targets: { type: Array, default: () => [] },
  sections: { type: Array, default: () => [] },
  fields: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

const handleClose = () => {
  emit('close')
}

// Group fields purely by section, merging across targets
const activeSectionsData = computed(() => {
  const data = []
  
  for (const section of props.sections) {
    const sectionFields = props.fields.filter(f => f.section.id === section.id && f.isActive)
    
    if (sectionFields.length === 0) continue
    
    // Sort fields by their sortOrder
    sectionFields.sort((a, b) => a.sortOrder - b.sortOrder)
    
    data.push({
      ...section,
      fields: sectionFields
    })
  }
  
  return data
})
</script>

<template>
  <BaseModal :open="open" @close="handleClose" title="Preview Form Pendaftaran" size="4xl">
    
    <div v-if="activeSectionsData.length === 0" class="py-8 text-center text-slate-500">
      Tidak ada form aktif untuk ditampilkan.
    </div>

    <div v-else class="space-y-8 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar pb-10">
      
      <div v-for="(section, sIdx) in activeSectionsData" :key="section.id" class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10 backdrop-blur-sm">
           <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shadow-sm">{{ sIdx + 1 }}</div>
           <h3 class="text-lg font-bold text-slate-800">{{ section.name }}</h3>
        </div>
          
          <div class="p-6 space-y-6">
            <template v-for="field in section.fields" :key="field.id">
              <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700">
                  {{ field.label }} <span v-if="field.isRequired" class="text-red-500">*</span>
                </label>
                <p v-if="field.helpText" class="text-xs text-slate-500">{{ field.helpText }}</p>
                
                <div class="mt-2">
                  <input v-if="['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'DATE'].includes(field.inputType)"
                    :type="field.inputType.toLowerCase()"
                    :placeholder="field.placeholder || 'Ketik jawaban Anda...'"
                    disabled
                    class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed shadow-sm focus:outline-none"
                  />
                  
                  <textarea v-else-if="field.inputType === 'TEXTAREA'"
                    :placeholder="field.placeholder || 'Ketik jawaban panjang Anda...'"
                    disabled
                    rows="3"
                    class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed shadow-sm focus:outline-none"
                  ></textarea>
                  
                  <select v-else-if="field.inputType === 'SELECT'"
                    disabled
                    class="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed shadow-sm focus:outline-none appearance-none"
                  >
                    <option selected>{{ field.placeholder || 'Pilih salah satu...' }}</option>
                    <option v-for="(opt, idx) in field.options" :key="idx" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  
                  <div v-else-if="field.inputType === 'RADIO'" class="space-y-2 mt-1">
                    <label v-for="(opt, idx) in field.options" :key="idx" class="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-not-allowed bg-slate-50 opacity-80">
                      <input type="radio" :name="`preview_${field.id}`" disabled class="w-4 h-4 text-slate-400 border-slate-300">
                      <span class="text-sm font-medium text-slate-700">{{ opt.label }}</span>
                    </label>
                  </div>
                  
                  <div v-else-if="field.inputType === 'CHECKBOX'" class="space-y-2 mt-1">
                    <label v-for="(opt, idx) in field.options" :key="idx" class="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-not-allowed bg-slate-50 opacity-80">
                      <input type="checkbox" disabled class="w-4 h-4 rounded text-slate-400 border-slate-300">
                      <span class="text-sm font-medium text-slate-700">{{ opt.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    
    <template #footer>
      <div class="flex items-center justify-end w-full">
        <button @click="handleClose" class="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 transition-colors shadow-md">
          Tutup Preview
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
