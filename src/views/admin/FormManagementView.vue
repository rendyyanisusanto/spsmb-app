<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { getTargets, getSections, getFields, createSection, updateSection, deleteSection, createField, updateField, deleteField, updateFieldStatus, updateFieldRequired, updateFieldOrder } from '@/services/formService'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import FormPreviewModal from '@/components/admin/FormPreviewModal.vue'

const { user, hasRole } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))

const loading = ref(true)
const error = ref('')

const targets = ref([])
const sectionsList = ref([])
const fields = ref([])
const selectedTargetId = ref(null)
const isPreviewModalOpen = ref(false)

const activeTarget = computed(() => targets.value.find(t => t.id === selectedTargetId.value))

const canManageCurrentTarget = computed(() => {
  if (!activeTarget.value) return false;
  if (isSuperAdmin.value) return true;
  return activeTarget.value.targetType === 'INSTITUTION';
})

const fetchConfig = async () => {
  loading.value = true
  error.value = ''
  try {
    const [tRes, sRes, fRes] = await Promise.all([
      getTargets(),
      getSections(),
      getFields()
    ])
    
    targets.value = Array.isArray(tRes) ? tRes : (tRes?.data || [])
    sectionsList.value = Array.isArray(sRes) ? sRes : (sRes?.data || [])
    fields.value = Array.isArray(fRes) ? fRes : (fRes?.data || [])
    
    if (targets.value.length > 0 && !selectedTargetId.value) {
      selectedTargetId.value = targets.value[0].id
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal memuat konfigurasi form.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchConfig)

// SECTIONS LOGIC
const fieldsBySection = computed(() => {
  const grouped = {}
  sectionsList.value.forEach(s => { grouped[s.id] = [] })
  
  const currentFields = fields.value.filter(f => f.target.id === selectedTargetId.value)
  currentFields.forEach(f => {
    if (grouped[f.section.id]) {
      grouped[f.section.id].push(f)
    }
  })
  
  Object.keys(grouped).forEach(k => {
    grouped[k].sort((a, b) => a.sortOrder - b.sortOrder)
  })
  
  return grouped
})

const addSection = async () => {
  const name = prompt('Masukkan nama kelompok (section) baru:')
  if (name && name.trim()) {
    try {
      await createSection({ name: name.trim(), code: name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })
      fetchConfig()
    } catch(err) {
      alert(err.response?.data?.message || 'Gagal menambah kelompok')
    }
  }
}

const editSectionName = async (section) => {
  const newName = prompt('Ubah nama kelompok:', section.name)
  if (newName && newName.trim() && newName.trim() !== section.name) {
    try {
      await updateSection(section.id, { name: newName.trim() })
      fetchConfig()
    } catch(err) {
      alert(err.response?.data?.message || 'Gagal mengubah kelompok')
    }
  }
}

const handleDeleteSection = async (section) => {
  if (!confirm(`Hapus kelompok "${section.name}"?\nKelompok tidak dapat dihapus jika masih ada field pertanyaan di dalamnya.`)) return
  try {
    await deleteSection(section.id)
    fetchConfig()
  } catch(err) {
    alert(err.response?.data?.message || 'Gagal menghapus kelompok')
  }
}

// EDITOR LOGIC
const activeFieldId = ref(null)
const editingField = ref(null)

const fieldTypesList = [
  { value: 'TEXT', label: 'Jawaban Singkat' },
  { value: 'TEXTAREA', label: 'Paragraf' },
  { value: 'NUMBER', label: 'Angka' },
  { value: 'DATE', label: 'Tanggal' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'RADIO', label: 'Pilihan Ganda' },
  { value: 'CHECKBOX', label: 'Kotak Centang' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Nomor Telepon' }
]

const setActiveField = (field) => {
  if (!canManageCurrentTarget.value) return
  if (activeFieldId.value === field.id) return
  
  if (activeFieldId.value && String(activeFieldId.value).startsWith('temp_')) {
     fields.value = fields.value.filter(f => f.id !== activeFieldId.value)
  }
  
  activeFieldId.value = field.id
  editingField.value = JSON.parse(JSON.stringify(field))
}

const unselectField = () => {
  if (activeFieldId.value && String(activeFieldId.value).startsWith('temp_')) {
    fields.value = fields.value.filter(f => f.id !== activeFieldId.value)
  }
  activeFieldId.value = null
  editingField.value = null
}

const addNewField = (sectionId) => {
  const sectionFields = fieldsBySection.value[sectionId]
  const maxOrder = sectionFields.length > 0 ? Math.max(...sectionFields.map(f => f.sortOrder)) : 0
  
  const newField = {
    id: 'temp_' + Date.now(),
    target: { id: selectedTargetId.value },
    section: { id: sectionId },
    fieldCode: '',
    label: '',
    helpText: '',
    placeholder: '',
    inputType: 'TEXT',
    isRequired: false,
    isActive: true,
    sortOrder: maxOrder + 1,
    options: []
  }
  
  fields.value.push(newField)
  setActiveField(newField)
}

const saveField = async (fieldData) => {
  try {
    if (!fieldData.label) {
      alert('Label/Pertanyaan wajib diisi')
      return false
    }
    if (!fieldData.fieldCode) {
      fieldData.fieldCode = fieldData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    }
    
    const payload = {
      formTargetId: fieldData.target.id,
      formSectionId: fieldData.section.id,
      fieldCode: fieldData.fieldCode,
      label: fieldData.label,
      inputType: fieldData.inputType,
      placeholder: fieldData.placeholder,
      helpText: fieldData.helpText,
      isRequired: fieldData.isRequired,
      isActive: fieldData.isActive,
      sortOrder: fieldData.sortOrder,
      options: fieldData.options
    }

    if (String(fieldData.id).startsWith('temp_')) {
      await createField(payload)
    } else {
      await updateField(fieldData.id, payload)
    }
    await fetchConfig()
    unselectField()
    return true
  } catch(err) {
    alert(err.response?.data?.message || 'Gagal menyimpan field')
    return false
  }
}

const handleDelete = async (fieldId) => {
  if (String(fieldId).startsWith('temp_')) {
    fields.value = fields.value.filter(f => f.id !== fieldId)
    unselectField()
    return
  }
  if (!confirm('Hapus kolom pertanyaan ini?')) return
  try {
    await deleteField(fieldId)
    await fetchConfig()
    unselectField()
  } catch(err) {
    alert(err.response?.data?.message || 'Gagal menghapus field')
  }
}

const toggleRequired = async (fieldId, val) => {
  if (String(fieldId).startsWith('temp_')) return
  try {
    await updateFieldRequired(fieldId, val)
    await fetchConfig()
  } catch(err) {}
}

const toggleActive = async (fieldId, val) => {
  if (String(fieldId).startsWith('temp_')) return
  try {
    await updateFieldStatus(fieldId, val)
    await fetchConfig()
  } catch(err) {}
}

const moveField = async (field, direction) => {
  if (String(field.id).startsWith('temp_')) return
  const sectionFields = fieldsBySection.value[field.section.id]
  const currentIndex = sectionFields.findIndex(f => f.id === field.id)
  
  if (direction === 'up' && currentIndex > 0) {
    const prev = sectionFields[currentIndex - 1]
    await Promise.all([
      updateFieldOrder(field.id, prev.sortOrder),
      updateFieldOrder(prev.id, field.sortOrder)
    ])
  } else if (direction === 'down' && currentIndex < sectionFields.length - 1) {
    const next = sectionFields[currentIndex + 1]
    await Promise.all([
      updateFieldOrder(field.id, next.sortOrder),
      updateFieldOrder(next.id, field.sortOrder)
    ])
  }
  await fetchConfig()
}

// Option Management
const addOption = () => {
  editingField.value.options.push({
    label: `Opsi ${editingField.value.options.length + 1}`,
    value: `opsi_${editingField.value.options.length + 1}`,
    sortOrder: editingField.value.options.length + 1
  })
}

const removeOption = (idx) => {
  editingField.value.options.splice(idx, 1)
}

const scrollToSection = (sectionId) => {
  const el = document.getElementById(`section-${sectionId}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const onWrapperClick = (e) => {
  if (e.target.classList.contains('forms-wrapper') || e.target.classList.contains('section-container')) {
    unselectField()
  }
}
</script>

<template>
  <div class="form-management-container forms-wrapper pb-20" @click="onWrapperClick">
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Management Form Pendaftaran</h1>
        <p class="text-slate-500 m-0">Atur field dan struktur formulir pendaftaran SPSMB.</p>
      </div>
      
      <div class="flex items-center gap-3 w-full sm:w-auto flex-col sm:flex-row">
        <button @click="isPreviewModalOpen = true" class="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition-colors border border-slate-300 shadow-sm flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview Form
        </button>
        <div class="w-full sm:w-64">
          <select 
            v-model="selectedTargetId"
            class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 shadow-sm font-semibold text-slate-700"
          >
            <option v-for="t in targets" :key="t.id" :value="t.id">Target Form: {{ t.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <BaseErrorState v-if="error" :message="error" @retry="fetchConfig" class="mb-6" />
    <BaseLoading v-if="loading" text="Memuat konfigurasi form..." class="py-12" />

    <div v-else class="flex flex-col lg:flex-row gap-8 forms-wrapper">
      
      <div class="flex-grow space-y-10 forms-wrapper w-full lg:max-w-[70%]">
        
        <div v-if="!canManageCurrentTarget" class="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-lg flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <div class="text-sm font-medium">Anda sedang melihat form <b>{{ activeTarget?.name || 'ini' }}</b>. Anda hanya memiliki akses <i>Read-Only</i> pada target form ini.</div>
        </div>

        <div v-for="(section, sIndex) in sectionsList" :key="section.id" :id="`section-${section.id}`" class="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden section-container transition-all relative group/section">
          
          <div class="h-1.5 w-full bg-slate-800"></div>

          <div class="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between group/header">
            <div class="flex items-center gap-4">
              <div class="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
                {{ sIndex + 1 }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-xl font-bold text-slate-800 m-0 tracking-tight">{{ section.name }}</h2>
                  <button v-if="isSuperAdmin" @click="editSectionName(section)" class="text-slate-300 hover:text-slate-800 p-1 opacity-0 group-hover/header:opacity-100 transition-opacity" title="Edit Nama Kelompok">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button v-if="isSuperAdmin" @click="handleDeleteSection(section)" class="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover/header:opacity-100 transition-opacity" title="Hapus Kelompok">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1-2-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1 block">Code: {{ section.code }}</span>
              </div>
            </div>
          </div>
          
          <div class="p-6 bg-slate-50/50 space-y-4 forms-wrapper min-h-[80px]">
            
            <div v-if="!fieldsBySection[section.id]?.length" class="bg-white rounded-xl p-8 text-center border border-dashed border-slate-300 shadow-sm">
              <p class="text-slate-500 font-medium text-sm m-0">Belum ada field di kelompok ini pada target form terpilih.</p>
            </div>

            <div v-for="(field, index) in fieldsBySection[section.id]" :key="field.id" 
                 class="bg-white rounded-xl transition-all relative border"
                 :class="{
                   'border-slate-800 ring-1 ring-slate-800 shadow-lg scale-[1.01] z-10': activeFieldId === field.id, 
                   'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer': activeFieldId !== field.id, 
                   'opacity-60 bg-slate-100/50': !field.isActive
                 }"
                 @click.stop="setActiveField(field)">
              
              <!-- READ-ONLY -->
              <div v-if="activeFieldId !== field.id" class="p-4 sm:p-5">
                <div class="flex items-start gap-3">
                  <div class="flex-grow">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span class="font-bold text-slate-700">{{ field.label || 'Pertanyaan tanpa judul' }}</span>
                      <span v-if="field.isRequired" class="text-red-500 font-bold">*</span>
                      <span v-if="!field.isActive" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600 uppercase tracking-wide">Nonaktif</span>
                    </div>
                    
                    <div class="mt-3">
                      <div v-if="['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'DATE'].includes(field.inputType)" class="w-full sm:w-1/2 border-b border-slate-300 pb-1 text-slate-400 text-sm">
                        Teks jawaban singkat...
                      </div>
                      <div v-else-if="field.inputType === 'TEXTAREA'" class="w-full sm:w-3/4 border-b border-slate-300 pb-1 border-dashed text-slate-400 text-sm">
                        Teks jawaban panjang...
                      </div>
                      <div v-else-if="field.inputType === 'RADIO'" class="space-y-2">
                        <div v-for="(opt, i) in (field.options?.length ? field.options.slice(0,3) : [{label: 'Opsi 1'}])" :key="i" class="flex items-center gap-2 text-slate-500">
                          <div class="w-4 h-4 rounded-full border border-slate-300"></div>
                          <span class="text-sm">{{ opt.label }}</span>
                        </div>
                      </div>
                      <div v-else-if="field.inputType === 'CHECKBOX'" class="space-y-2">
                        <div v-for="(opt, i) in (field.options?.length ? field.options.slice(0,3) : [{label: 'Opsi 1'}])" :key="i" class="flex items-center gap-2 text-slate-500">
                          <div class="w-4 h-4 rounded border border-slate-300"></div>
                          <span class="text-sm">{{ opt.label }}</span>
                        </div>
                      </div>
                      <div v-else-if="field.inputType === 'SELECT'" class="w-full sm:w-1/2 flex justify-between items-center bg-white border border-slate-200 shadow-sm rounded px-3 py-2 text-slate-500 text-sm">
                        <span>{{ field.options?.[0]?.label || 'Pilih salah satu...' }}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- EDIT MODE -->
              <div v-else class="p-6 bg-white rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.03)]" @click.stop>
                
                <div class="flex flex-col md:flex-row gap-4 mb-4">
                  <div class="flex-grow">
                    <input type="text" v-model="editingField.label" class="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 px-4 py-2.5 rounded-lg text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800/10 placeholder-slate-400" placeholder="Pertanyaan">
                  </div>
                  <div class="w-full md:w-56 shrink-0">
                    <select v-model="editingField.inputType" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800/10 focus:border-slate-800 text-slate-700 cursor-pointer font-medium">
                      <option v-for="t in fieldTypesList" :key="t.value" :value="t.value">{{ t.label }}</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-4 bg-slate-50/80 rounded-lg border border-slate-100">
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Kode Internal (snake_case)</label>
                    <input type="text" v-model="editingField.fieldCode" placeholder="contoh: asal_sekolah" class="w-full text-sm font-mono bg-white border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 text-slate-700">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Teks Petunjuk (Opsional)</label>
                    <input type="text" v-model="editingField.helpText" placeholder="Contoh: Isi dengan nama lengkap..." class="w-full text-sm bg-white border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 text-slate-700">
                  </div>
                </div>

                <div v-if="['RADIO', 'CHECKBOX', 'SELECT'].includes(editingField.inputType)" class="mb-5 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <div class="bg-slate-50/80 px-4 py-2 border-b border-slate-200">
                    <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Opsi Jawaban</span>
                  </div>
                  <div class="p-4 space-y-3">
                    <div v-for="(opt, idx) in editingField.options" :key="idx" class="flex items-center gap-3">
                      <div class="flex-grow flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div class="flex-grow flex items-center gap-2">
                          <input type="text" v-model="opt.label" class="w-full border-b border-slate-200 hover:border-slate-400 focus:border-slate-800 focus:outline-none bg-transparent px-1 py-1 text-sm text-slate-800" placeholder="Label Opsi">
                        </div>
                        <div class="sm:w-1/3 flex items-center gap-2">
                          <span class="text-xs text-slate-400 font-mono flex-shrink-0 ml-1">Value:</span>
                          <input type="text" v-model="opt.value" class="w-full border-b border-slate-200 hover:border-slate-400 focus:border-slate-800 focus:outline-none bg-transparent px-1 py-1 text-sm text-slate-500 font-mono" placeholder="value_opsi">
                        </div>
                      </div>
                      <button @click="removeOption(idx)" class="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Hapus opsi">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                    <div class="flex items-center gap-2 mt-3 pt-2">
                      <button @click="addOption" class="text-sm text-slate-700 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                        + Tambah opsi baru
                      </button>
                    </div>
                  </div>
                </div>

                <div class="pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4">
                  <div class="flex items-center gap-2">
                    <button @click="saveField(editingField)" class="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                      Simpan Field
                    </button>
                    <button @click="unselectField" class="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                      Batal
                    </button>
                  </div>

                  <div class="flex items-center gap-4 ml-auto">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <span class="text-sm font-medium text-slate-600">Aktif</span>
                      <input type="checkbox" v-model="editingField.isActive" class="w-4 h-4 accent-slate-800 rounded">
                    </label>
                    <div class="h-4 w-px bg-slate-200 hidden sm:block"></div>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <span class="text-sm font-medium text-slate-600">Wajib</span>
                      <input type="checkbox" v-model="editingField.isRequired" class="w-4 h-4 accent-slate-800 rounded">
                    </label>
                    <div class="h-4 w-px bg-slate-200 hidden sm:block"></div>
                    <button @click="handleDelete(editingField.id)" class="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors" title="Hapus Kolom">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1-2-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="canManageCurrentTarget" class="pt-4 pb-2 flex justify-center">
              <button @click="addNewField(section.id)" class="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg shadow-[0_2px_5px_rgba(0,0,0,0.02)] hover:shadow-md text-sm font-bold inline-flex items-center gap-2 transition-all w-full sm:w-auto justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                Tambah Field Baru
              </button>
            </div>

          </div>
        </div>
        
        <div v-if="isSuperAdmin" class="pt-4 pb-12 flex justify-center border-t border-slate-200 mt-8 pt-8">
          <button @click="addSection" class="bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 px-6 py-3 rounded-lg shadow-md hover:shadow-lg font-bold inline-flex items-center gap-2 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Tambah Kelompok Baru
          </button>
        </div>
      </div>

      <div class="w-full lg:w-72 shrink-0">
        <div class="sticky top-24 space-y-6">
          
          <div class="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200 p-5">
            <h3 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Sinkronisasi
            </h3>
            <p class="text-xs text-slate-500 mb-4 leading-relaxed">Semua perubahan form dan konfigurasi Anda langsung tersimpan secara real-time ke server.</p>
            <div class="bg-emerald-50 text-emerald-600 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-emerald-100">
              ✓ Real-time Sinkron
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200 p-5 hidden lg:block">
            <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Navigasi Kelompok
            </h3>
            <div class="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <button 
                v-for="(section, idx) in sectionsList" 
                :key="`nav-${idx}`"
                @click="scrollToSection(section.id)"
                class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors truncate"
              >
                {{ idx + 1 }}. {{ section.name }}
              </button>
            </div>
          </div>

        </div>
      </div>
      
    </div>
    
    <FormPreviewModal 
      :open="isPreviewModalOpen" 
      @close="isPreviewModalOpen = false" 
      :targets="targets" 
      :sections="sectionsList" 
      :fields="fields" 
    />
  </div>
</template>

<style scoped>
input, textarea, select {
  font-family: inherit;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
