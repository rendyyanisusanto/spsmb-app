<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { 
  getTemplates, 
  createTemplate, 
  updateTemplate, 
  duplicateTemplate, 
  useGlobalTemplate, 
  deleteTemplate,
  getEvents,
  getVariables,
  previewTemplate,
  updateTemplateStatus
} from '@/services/whatsappTemplateService'
import { getInstitutions } from '@/services/institutionService'
import { logAudit } from '@/utils/auditLogger'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const { user, hasRole } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))
const adminInstitution = computed(() => user.value?.institutions?.[0]?.name || null)

// Constants
const availableInstitutions = ref([{ value: 'GLOBAL', label: 'Umum / Global' }])
const eventTypes = ref([])
const templateVariables = ref([])

// Scope State
const selectedScope = ref('GLOBAL')
const selectedInstitution = ref(null)

if (!isSuperAdmin.value) {
  selectedScope.value = 'LEMBAGA'
  selectedInstitution.value = user.value?.institutions?.[0]?.id || null
}

const handleScopeChange = (val) => {
  if (val === 'GLOBAL') {
    selectedScope.value = 'GLOBAL'
    selectedInstitution.value = null
  } else {
    selectedScope.value = 'LEMBAGA'
    selectedInstitution.value = parseInt(val)
  }
  fetchTemplates()
}

// Data State
const loading = ref(true)
const allRawTemplates = ref([]) // will hold templates for current scope

const loadDropdowns = async () => {
  try {
    const instRes = await getInstitutions()
    if (instRes && instRes.data) {
      const institutions = instRes.data.map(i => ({ value: i.id, label: i.name }))
      availableInstitutions.value = [{ value: 'GLOBAL', label: 'Umum / Global' }, ...institutions]
    }
    
    const eventsRes = await getEvents()
    if (eventsRes && eventsRes.data) {
      eventTypes.value = eventsRes.data
    }
    
    const varsRes = await getVariables()
    if (varsRes && varsRes.data) {
      templateVariables.value = varsRes.data.map(v => ({ name: v.token, label: v.label }))
    }
  } catch(e) {
    console.error(e)
  }
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    const params = { scope: selectedScope.value }
    if (selectedScope.value === 'LEMBAGA' && selectedInstitution.value) {
      params.institutionId = selectedInstitution.value
    }
    // Also fetch global so we can resolve fallbacks visually
    const res = await getTemplates(params)
    let templatesForScope = res.data || []
    
    // if LEBMAGA, also fetch global to show which ones are overridden
    let globalTemplates = []
    if (selectedScope.value === 'LEMBAGA') {
      const globalRes = await getTemplates({ scope: 'GLOBAL' })
      globalTemplates = globalRes.data || []
    } else {
      globalTemplates = templatesForScope
    }
    
    // Build resolved array based on eventTypes
    allRawTemplates.value = eventTypes.value.map(evt => {
      const globalTpl = globalTemplates.find(t => t.eventCode === evt.value && t.scope === 'GLOBAL')
      
      if (selectedScope.value === 'LEMBAGA') {
        const overrideTpl = templatesForScope.find(t => t.eventCode === evt.value && t.scope === 'INSTITUTION' && t.institution?.id === selectedInstitution.value)
        if (overrideTpl) {
          return {
            ...overrideTpl,
            eventLabel: evt.label,
            isOverride: true,
            effectiveScope: 'LEMBAGA'
          }
        }
      }
      
      return {
        ...(globalTpl || { id: null, name: 'Belum Ada Template', isActive: false, message: '' }),
        eventLabel: evt.label,
        isOverride: false,
        effectiveScope: 'GLOBAL'
      }
    })
    
  } catch (err) {
    console.error(err)
  }
  loading.value = false
}

onMounted(async () => {
  loading.value = true
  await loadDropdowns()
  await fetchTemplates()
})

// UI MODALS
const showFormModal = ref(false)
const showPreviewModal = ref(false)

const form = ref({
  id: null,
  name: '',
  event: '',
  scope: 'GLOBAL',
  institutionId: null,
  message: '',
  active: true,
  code: ''
})

const unknownVars = ref([])

const checkUnknownVariables = () => {
  const matches = form.value.message.match(/\{\{(.*?)\}\}/g)
  unknownVars.value = []
  if (matches) {
    matches.forEach(m => {
      if (!templateVariables.value.find(v => v.name === m)) {
        unknownVars.value.push(m)
      }
    })
  }
}

const insertVariable = (varName) => {
  const textarea = document.getElementById('messageTextarea')
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = form.value.message
    form.value.message = text.substring(0, start) + varName + text.substring(end)
    
    // Focus back and set cursor
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + varName.length
      checkUnknownVariables()
    }, 10)
  } else {
    form.value.message += varName
    checkUnknownVariables()
  }
}

// ACTIONS
const openEdit = (tpl) => {
  form.value = {
    id: tpl.id,
    name: tpl.name,
    event: tpl.eventCode,
    scope: tpl.scope,
    institutionId: tpl.institution?.id || null,
    message: tpl.message || '',
    active: tpl.isActive,
    code: tpl.code
  }
  checkUnknownVariables()
  showFormModal.value = true
}

const openCreateOverride = (globalTpl) => {
  if (!globalTpl.id) {
    // If no global template exists, create new from scratch
    form.value = {
      id: null,
      name: 'Template Khusus Lembaga',
      event: globalTpl.eventCode || globalTpl.event, // wait, eventLabel mapping
      scope: 'INSTITUTION',
      institutionId: selectedInstitution.value,
      message: '',
      active: true,
      code: ''
    }
  } else {
    form.value = {
      id: 'duplicate_' + globalTpl.id, // mark for duplication
      originalId: globalTpl.id,
      name: globalTpl.name + ' (Khusus Lembaga)',
      event: globalTpl.eventCode,
      scope: 'INSTITUTION',
      institutionId: selectedInstitution.value,
      message: globalTpl.message || '',
      active: true,
      code: globalTpl.code + '_COPY'
    }
  }
  checkUnknownVariables()
  showFormModal.value = true
}

const showConfirmModal = ref(false)
const templateToDelete = ref(null)

const confirmDeleteOverride = (id) => {
  templateToDelete.value = id
  showConfirmModal.value = true
}

const deleteOverride = async () => {
  if (!templateToDelete.value) return
  try {
    loading.value = true
    await deleteTemplate(templateToDelete.value)
    await fetchTemplates()
    showConfirmModal.value = false
    templateToDelete.value = null
  } catch (e) {
    alert(e.response?.data?.message || 'Gagal menghapus override')
  } finally {
    loading.value = false
  }
}

const saveTemplate = async () => {
  if (!form.value.name.trim() || !form.value.message.trim()) {
    alert('Nama template dan isi pesan wajib diisi!')
    return
  }
  
  if (unknownVars.value.length > 0) {
    if (!confirm('Terdapat variabel tidak dikenal. Anda yakin ingin melanjutkan?')) return
  }
  
  try {
    loading.value = true
    
    if (String(form.value.id).startsWith('duplicate_')) {
      // Create via Duplicate API or just create new
      const code = form.value.code || `${form.value.event}_${form.value.institutionId}_${Date.now()}`
      await createTemplate({
        code: code,
        name: form.value.name,
        eventCode: form.value.event,
        scope: form.value.scope,
        institutionId: form.value.institutionId,
        message: form.value.message,
        isActive: form.value.active
      })
    } else if (form.value.id) {
      // Edit
      await updateTemplate(form.value.id, {
        name: form.value.name,
        eventCode: form.value.event,
        message: form.value.message,
        isActive: form.value.active
      })
    } else {
      // Create new (no global existed)
      const code = form.value.code || `${form.value.event}_${form.value.scope}_${Date.now()}`
      await createTemplate({
        code: code,
        name: form.value.name,
        eventCode: form.value.event,
        scope: form.value.scope,
        institutionId: form.value.institutionId,
        message: form.value.message,
        isActive: form.value.active
      })
    }
    
    logAudit({
      action: 'WHATSAPP_TEMPLATE_UPDATE',
      module: 'WHATSAPP',
      targetType: 'TEMPLATE',
      targetId: form.value.id || Date.now(),
      targetName: form.value.name,
      description: `Memperbarui template WhatsApp: ${form.value.name}`,
      before: null,
      after: { active: form.value.active, messageLength: form.value.message.length }
    })
    
    showFormModal.value = false
    await fetchTemplates()
  } catch (e) {
    alert(e.response?.data?.message || 'Terjadi kesalahan saat menyimpan template')
  } finally {
    loading.value = false
  }
}

const disableOverride = async (id) => {
  if (confirm('Nonaktifkan template ini dan gunakan template Global?')) {
    try {
      loading.value = true
      await useGlobalTemplate(id)
      await fetchTemplates()
    } catch(e) {
      alert(e.response?.data?.message || 'Gagal mengubah ke template global')
    } finally {
      loading.value = false
    }
  }
}

// PREVIEW
const previewRendered = ref('')
const previewTitle = ref('')
const openPreview = async (tpl) => {
  if (!tpl.message) return
  previewTitle.value = tpl.name
  try {
    const res = await previewTemplate(tpl.eventCode, tpl.message)
    previewRendered.value = res.data.renderedMessage
    showPreviewModal.value = true
  } catch(e) {
    alert('Gagal membuat preview')
  }
}

</script>

<template>
  <div class="whatsapp-template-management pb-20">
    
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Management Template WhatsApp</h1>
      <p class="text-slate-500 m-0">Kelola template pesan WhatsApp berdasarkan aktivitas dan status pendaftaran SPSMB.</p>
    </div>

    <!-- Filter Card -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-lg font-bold text-slate-800 mb-1">Scope Template</h2>
        <p class="text-xs text-slate-500 m-0">
          {{ isSuperAdmin ? 'Pilih untuk melihat Template Global atau Konfigurasi per Lembaga.' : 'Anda sedang melihat konfigurasi pesan khusus untuk lembaga Anda.' }}
        </p>
      </div>
      
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <div v-if="isSuperAdmin" class="w-full sm:w-64">
          <select 
            :value="selectedScope === 'GLOBAL' ? 'GLOBAL' : selectedInstitution"
            @change="(e) => handleScopeChange(e.target.value)"
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 font-bold text-slate-700 cursor-pointer"
          >
            <option v-for="opt in availableInstitutions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div v-else class="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold shadow-sm whitespace-nowrap">
          {{ adminInstitution }}
        </div>
      </div>
    </div>

    <!-- Table List -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
      <BaseLoading v-if="loading" text="Memuat template WhatsApp..." class="py-12" />
      
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <th class="p-4 w-[25%]">Event Sistem</th>
              <th class="p-4 w-[30%]">Nama Template</th>
              <th class="p-4 w-[15%]">Status & Scope</th>
              <th class="p-4 w-[15%]">Diubah</th>
              <th class="p-4 w-[15%] text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in allRawTemplates" :key="row.eventLabel" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              
              <!-- Event Column -->
              <td class="p-4">
                <span class="font-bold text-slate-800">{{ row.eventLabel }}</span>
                <span v-if="row.id === null" class="block text-xs text-red-500 mt-1 font-semibold">Template tidak ditemukan!</span>
              </td>
              
              <!-- Template Name Column -->
              <td class="p-4">
                <p v-if="row.id" class="font-bold text-slate-700 m-0">{{ row.name }}</p>
                <p v-if="row.id" class="text-xs text-slate-400 mt-1 line-clamp-1 border-l-2 border-slate-200 pl-2 italic">"{{ row.message }}"</p>
                <span v-else class="text-slate-400 italic text-sm">-</span>
              </td>
              
              <!-- Scope & Status Column -->
              <td class="p-4">
                <div v-if="row.id" class="flex flex-col gap-2 items-start">
                  <span v-if="row.effectiveScope === 'GLOBAL'" class="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase tracking-widest">
                    GLOBAL
                  </span>
                  <span v-else class="inline-flex items-center px-2 py-1 rounded bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest">
                    KHUSUS LEMBAGA
                  </span>
                  
                  <span v-if="row.isActive" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif & Digunakan
                  </span>
                  <span v-else class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Nonaktif
                  </span>
                </div>
              </td>
              
              <!-- Updated At -->
              <td class="p-4 text-sm text-slate-500 font-mono">
                {{ row.updatedAt?.split('T')[0] || '-' }}
              </td>
              
              <!-- Actions -->
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button v-if="row.id" @click="openPreview(row)" class="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-800 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap">
                    Preview
                  </button>
                  
                  <!-- If it's a Global scope view, or Super Admin editing Global directly -->
                  <template v-if="selectedScope === 'GLOBAL'">
                    <button v-if="row.id" @click="openEdit(row)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap">Edit</button>
                    <!-- SuperAdmin can create if doesn't exist -->
                    <button v-if="!row.id && isSuperAdmin" @click="openEdit({ eventCode: row.eventLabel, scope: 'GLOBAL', isActive: true })" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap">Tambah</button>
                  </template>
                  
                  <!-- If it's a Lembaga scope view -->
                  <template v-if="selectedScope === 'LEMBAGA'">
                    <!-- If currently using override -->
                    <template v-if="row.isOverride">
                      <button @click="openEdit(row)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap">Edit</button>
                      <button v-if="row.isActive" @click="disableOverride(row.id)" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors whitespace-nowrap" title="Gunakan Global">Use Global</button>
                      <button @click="confirmDeleteOverride(row.id)" class="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors whitespace-nowrap" title="Hapus Override">Hapus</button>
                    </template>
                    <!-- If currently falling back to global -->
                    <template v-else>
                      <button @click="openCreateOverride(row)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        Buat Versi Lembaga
                      </button>
                    </template>
                  </template>
                </div>
              </td>
              
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- MODAL EDIT / OVERRIDE -->
    <BaseModal 
      :open="showFormModal" 
      :title="form.id && !String(form.id).startsWith('duplicate') ? 'Edit Template' : 'Buat Template Baru'"
      @close="showFormModal = false"
      size="4xl"
    >
      <div>
        <p class="text-xs text-slate-500 m-0 mt-0.5 mb-4">Event: <span class="font-bold text-slate-700">{{ eventTypes.find(e => e.value === form.event)?.label || form.event }}</span></p>
        
        <!-- Body: 2 Columns on Desktop -->
        <div class="flex flex-col md:flex-row flex-grow overflow-hidden min-h-0 border rounded-lg md:max-h-[500px]">
          
          <!-- Left: Editor -->
          <div class="flex-grow p-6 overflow-y-auto border-r border-slate-100 bg-white">
            <div class="space-y-5">
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nama Template *</label>
                  <input type="text" v-model="form.name" class="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Kode Unik *</label>
                  <input type="text" v-model="form.code" :disabled="!!form.id && !String(form.id).startsWith('duplicate')" class="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-mono text-slate-800 uppercase" placeholder="Kosongkan u/ otomatis">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Status</label>
                  <select v-model="form.active" class="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                    <option :value="true">Aktif</option>
                    <option :value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between uppercase tracking-wide">
                  Isi Pesan WhatsApp *
                  <span class="text-slate-400 font-mono text-[10px] lowercase tracking-normal">{{ form.message.length }} karakter</span>
                </label>
                <textarea 
                  id="messageTextarea"
                  v-model="form.message" 
                  @input="checkUnknownVariables"
                  rows="6" 
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-sans leading-relaxed text-slate-800 min-h-[150px]"
                  placeholder="Ketik isi pesan WhatsApp di sini..."
                ></textarea>
                
                <div v-if="unknownVars.length > 0" class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <div>
                    <p class="text-xs font-bold text-amber-800 m-0">Peringatan: Variabel tidak dikenal ditemukan</p>
                    <p class="text-xs text-amber-700 m-0 mt-1">Variabel berikut mungkin tidak akan ter-render: <span class="font-mono font-bold">{{ unknownVars.join(', ') }}</span></p>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <!-- Right: Variable Picker -->
          <div class="w-full md:w-64 bg-slate-50 shrink-0 flex flex-col border-t md:border-t-0 border-slate-100 h-64 md:h-auto min-h-0">
            <div class="px-5 py-4 border-b border-slate-200 bg-slate-100 shrink-0">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Variabel Tersedia
              </h3>
              <p class="text-xs text-slate-500 mt-1 mb-0">Klik variabel untuk menyisipkan ke dalam pesan.</p>
            </div>
            <div class="flex-grow overflow-y-auto p-4 space-y-2">
              <button 
                v-for="v in templateVariables" 
                :key="v.name"
                @click="insertVariable(v.name)"
                class="w-full text-left px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-slate-800 hover:shadow-sm transition-all group"
              >
                <div class="text-xs font-bold text-slate-700 mb-0.5 group-hover:text-slate-900">{{ v.label }}</div>
                <div class="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block">{{ v.name }}</div>
              </button>
            </div>
          </div>
          
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showFormModal = false" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Batal</button>
          <button @click="saveTemplate" :disabled="loading" class="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">Simpan Template</button>
        </div>
      </template>
    </BaseModal>

    <!-- Confirm Modal -->
    <BaseConfirmModal 
      :open="showConfirmModal"
      title="Hapus Override Template"
      confirmText="Ya, Hapus Override"
      @close="showConfirmModal = false"
      @confirm="deleteOverride"
    >
      Anda yakin ingin menghapus template khusus ini? Pesan akan kembali menggunakan <strong>Template Global</strong> (jika ada).
    </BaseConfirmModal>

    <!-- WHATSAPP PREVIEW MODAL -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div class="w-full max-w-sm flex flex-col">
        <!-- Close Button -->
        <div class="flex justify-between items-center mb-4 text-white">
          <h3 class="font-bold">Simulasi Render Template</h3>
          <button @click="showPreviewModal = false" class="hover:text-slate-300 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        
        <!-- Fake Phone Screen -->
        <div class="bg-[#efeae2] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative">
          <!-- Fake Header -->
          <div class="bg-[#005c4b] text-white px-4 py-3 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div class="font-semibold text-sm">SPSMB Asy-Syadzili</div>
              <div class="text-[10px] text-white/70">Akun Resmi</div>
            </div>
          </div>
          
          <!-- Chat Area -->
          <div class="p-4 min-h-[300px] max-h-[60vh] overflow-y-auto" style="background-image: radial-gradient(#d3c9ba 1px, transparent 1px); background-size: 20px 20px;">
            <div class="bg-white rounded-xl rounded-tl-none p-3 shadow-sm inline-block max-w-[90%] text-sm text-[#111b21] leading-relaxed whitespace-pre-wrap break-words font-sans">
              {{ previewRendered }}
              
              <div class="text-[10px] text-slate-400 text-right mt-1.5 flex justify-end items-center gap-1">
                {{ new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-500"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
    
  </div>
</template>

<style scoped>
/* Phone scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
}
</style>
