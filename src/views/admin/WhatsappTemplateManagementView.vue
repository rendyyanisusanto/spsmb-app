<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { 
  getTemplates, 
  updateTemplate, 
  getEvents, 
  getVariables, 
  previewTemplate,
  previewComposedTemplate,
  updateTemplateStatus 
} from '@/services/whatsappTemplateService'
import { getInstitutions } from '@/services/institutionService'
import { logAudit } from '@/utils/auditLogger'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const { user, hasRole } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))
const userInstitution = computed(() => user.value?.institutions?.[0] || null)

// State
const institutionsList = ref([])
const eventTypes = ref([])
const templateVariables = ref([])
const allTemplates = ref([])
const loading = ref(true)

// Navigasi Utama: 'LIST' (Daftar Template) | 'PREVIEW' (Pratinjau Pesan)
const currentView = ref('LIST')

// Filter
const selectedEvent = ref('REGISTRATION_CREATED')
const selectedSectionFilter = ref('ALL') // 'ALL' | 'GLOBAL' | 'PONDOK' | 'FORMAL'

onMounted(async () => {
  await loadMetadata()
  await fetchAllTemplates()
  await generateComposedPreview()
})

const loadMetadata = async () => {
  try {
    const [instRes, eventsRes, varsRes] = await Promise.all([
      getInstitutions(),
      getEvents(),
      getVariables()
    ])

    if (instRes && instRes.data) institutionsList.value = instRes.data
    if (eventsRes && eventsRes.data) eventTypes.value = eventsRes.data
    if (varsRes && varsRes.data) {
      templateVariables.value = varsRes.data.map(v => ({ name: v.token, label: v.label }))
    }
  } catch (err) {
    console.error('Gagal memuat metadata:', err)
  }
}

const fetchAllTemplates = async () => {
  loading.value = true
  try {
    const res = await getTemplates({})
    allTemplates.value = res.data || []
  } catch (err) {
    console.error('Gagal memuat template:', err)
  } finally {
    loading.value = false
  }
}

// Filtered templates
const filteredTemplates = computed(() => {
  return allTemplates.value.filter(tpl => {
    // Filter Event
    if (selectedEvent.value && tpl.eventCode !== selectedEvent.value) {
      return false
    }

    // Hak Akses Admin Lembaga: hanya miliknya
    if (!isSuperAdmin.value) {
      return tpl.institution?.id === userInstitution.value?.id
    }

    // Filter Kategori Bagian (Super Admin)
    if (selectedSectionFilter.value === 'GLOBAL') {
      return tpl.sectionType === 'GLOBAL' || tpl.scope === 'GLOBAL'
    } else if (selectedSectionFilter.value === 'PONDOK') {
      return tpl.sectionType === 'PONDOK' || (tpl.scope === 'INSTITUTION' && tpl.institution?.institution_type === 'PONDOK')
    } else if (selectedSectionFilter.value === 'FORMAL') {
      return tpl.sectionType === 'FORMAL' || (tpl.scope === 'INSTITUTION' && tpl.institution?.institution_type !== 'PONDOK')
    }

    return true
  })
})

// Toggle status aktif/nonaktif
const toggleStatus = async (tpl) => {
  try {
    loading.value = true
    await updateTemplateStatus(tpl.id, !tpl.isActive)
    await fetchAllTemplates()
    await generateComposedPreview()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal mengubah status template')
  } finally {
    loading.value = false
  }
}

// Modal Edit
const showFormModal = ref(false)
const form = ref({
  id: null,
  name: '',
  eventCode: '',
  scope: 'GLOBAL',
  sectionType: 'GLOBAL',
  institutionId: null,
  message: '',
  active: true,
  code: ''
})
const unknownVars = ref([])

const openEditModal = (tpl) => {
  form.value = {
    id: tpl.id,
    name: tpl.name,
    eventCode: tpl.eventCode,
    scope: tpl.scope,
    sectionType: tpl.sectionType,
    institutionId: tpl.institution?.id || null,
    message: tpl.message || '',
    active: tpl.isActive,
    code: tpl.code
  }
  checkUnknownVariables()
  showFormModal.value = true
}

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

const saveTemplate = async () => {
  if (!form.value.name.trim() || !form.value.message.trim()) {
    alert('Nama template dan isi pesan wajib diisi.')
    return
  }

  try {
    loading.value = true
    await updateTemplate(form.value.id, {
      name: form.value.name,
      eventCode: form.value.eventCode,
      message: form.value.message,
      isActive: form.value.active
    })

    logAudit({
      action: 'WHATSAPP_TEMPLATE_UPDATE',
      module: 'WHATSAPP',
      targetType: 'TEMPLATE',
      targetId: form.value.id,
      targetName: form.value.name,
      description: `Memperbarui template WhatsApp: ${form.value.name}`
    })

    showFormModal.value = false
    await fetchAllTemplates()
    await generateComposedPreview()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menyimpan template')
  } finally {
    loading.value = false
  }
}

// Simulasi Pesan Gabungan
const previewSimulator = ref({
  eventCode: 'REGISTRATION_CREATED',
  pondokId: 1,
  formalId: 3
})
const composedResult = ref({
  composedMessage: '',
  renderedSections: { global: '', pondok: '', formal: '' }
})
const loadingPreview = ref(false)

const pondokList = computed(() => {
  const items = institutionsList.value.filter(i => i.institution_type === 'PONDOK')
  if (items.length > 0) return items
  return [
    { id: 1, name: 'PPSQ 1 (Putra)' },
    { id: 2, name: 'PPSQ 2 (Putri)' }
  ]
})

const formalList = computed(() => {
  const items = institutionsList.value.filter(i => i.institution_type !== 'PONDOK')
  if (items.length > 0) return items
  return [
    { id: 3, name: 'SMP IT Asy-Syadzili' },
    { id: 4, name: 'SMA IT Asy-Syadzili' },
    { id: 5, name: 'SMK IT Asy-Syadzili' }
  ]
})

const generateComposedPreview = async () => {
  loadingPreview.value = true
  try {
    const res = await previewComposedTemplate({
      eventCode: previewSimulator.value.eventCode,
      pondokInstitutionId: previewSimulator.value.pondokId ? parseInt(previewSimulator.value.pondokId) : null,
      formalInstitutionId: previewSimulator.value.formalId ? parseInt(previewSimulator.value.formalId) : null
    })
    if (res && res.data) {
      composedResult.value = res.data
    }
  } catch (err) {
    console.error('Gagal membuat preview pesan:', err)
  } finally {
    loadingPreview.value = false
  }
}

// Modal Single Preview
const showSinglePreviewModal = ref(false)
const singlePreviewText = ref('')
const singlePreviewTitle = ref('')

const openSinglePreview = async (tpl) => {
  try {
    singlePreviewTitle.value = tpl.name
    const res = await previewTemplate(tpl.eventCode, tpl.message)
    singlePreviewText.value = res.data.renderedMessage
    showSinglePreviewModal.value = true
  } catch (err) {
    alert('Gagal memuat pratinjau.')
  }
}
</script>

<template>
  <div class="whatsapp-management max-w-5xl mx-auto pb-16">
    
    <!-- Header Halaman -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Template WhatsApp</h1>
        <p class="text-slate-500 text-xs sm:text-sm mt-0.5">
          Kelola pesan otomatis untuk pendaftar sesuai pondok dan lembaga formal.
        </p>
      </div>

      <!-- Tombol Pilihan Menu Utama -->
      <div class="flex gap-2">
        <button 
          @click="currentView = 'LIST'"
          :class="[
            'px-3.5 py-1.5 rounded text-xs font-medium border transition-colors',
            currentView === 'LIST' 
              ? 'bg-slate-900 text-white border-slate-900' 
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          ]"
        >
          Daftar Template
        </button>
        <button 
          @click="currentView = 'PREVIEW'; generateComposedPreview()"
          :class="[
            'px-3.5 py-1.5 rounded text-xs font-medium border transition-colors',
            currentView === 'PREVIEW' 
              ? 'bg-slate-900 text-white border-slate-900' 
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          ]"
        >
          Pratinjau Pesan Pendaftar
        </button>
      </div>
    </div>

    <!-- TAMPILAN 1: DAFTAR TEMPLATE -->
    <div v-if="currentView === 'LIST'" class="space-y-4">
      
      <!-- Filter Bar Sederhana -->
      <div class="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-3">
          
          <!-- Filter Event -->
          <div class="flex items-center gap-2">
            <span class="text-slate-500 font-medium">Event:</span>
            <select 
              v-model="selectedEvent"
              class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="REGISTRATION_CREATED">Pendaftaran Awal Berhasil</option>
              <option value="REGISTRATION_SUBMITTED">Pendaftaran Berhasil Dikirim</option>
            </select>
          </div>

          <!-- Filter Bagian (Hanya Super Admin) -->
          <div v-if="isSuperAdmin" class="flex items-center gap-2">
            <span class="text-slate-500 font-medium">Bagian:</span>
            <select 
              v-model="selectedSectionFilter"
              class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Semua Bagian</option>
              <option value="GLOBAL">Global (Super Admin)</option>
              <option value="PONDOK">Pondok (PPSQ)</option>
              <option value="FORMAL">Lembaga Formal</option>
            </select>
          </div>

        </div>

        <!-- Info Hak Akses -->
        <div class="text-slate-500">
          Akses: <strong class="text-slate-800">{{ isSuperAdmin ? 'Super Admin' : (userInstitution?.name || 'Admin Lembaga') }}</strong>
        </div>
      </div>

      <!-- Tabel Template -->
      <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <BaseLoading v-if="loading" text="Memuat template..." class="py-12" />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th class="p-3 w-[26%]">Bagian / Lembaga</th>
                <th class="p-3 w-[42%]">Isi Pesan</th>
                <th class="p-3 w-[12%]">Status</th>
                <th class="p-3 w-[10%]">Diubah</th>
                <th class="p-3 w-[10%] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="filteredTemplates.length === 0">
                <td colspan="5" class="p-6 text-center text-slate-400 text-xs">
                  Tidak ada template untuk filter yang dipilih.
                </td>
              </tr>
              <tr 
                v-for="tpl in filteredTemplates" 
                :key="tpl.id"
                class="hover:bg-slate-50/70 transition-colors"
              >
                <!-- Nama & Bagian -->
                <td class="p-3 align-top">
                  <div class="font-medium text-slate-900">{{ tpl.name }}</div>
                  <div class="text-xs text-slate-500 mt-0.5">
                    {{ tpl.institution?.name || 'Global (Super Admin)' }}
                  </div>
                </td>

                <!-- Isi Pesan Cuplikan -->
                <td class="p-3 align-top">
                  <div class="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {{ tpl.message }}
                  </div>
                </td>

                <!-- Status Aktif/Nonaktif -->
                <td class="p-3 align-top">
                  <button 
                    @click="toggleStatus(tpl)"
                    :disabled="!isSuperAdmin && tpl.sectionType === 'GLOBAL'"
                    :class="[
                      'px-2 py-0.5 rounded text-xs font-medium border transition-colors',
                      tpl.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    ]"
                    title="Klik untuk mengubah status"
                  >
                    {{ tpl.isActive ? 'Aktif' : 'Nonaktif' }}
                  </button>
                </td>

                <!-- Tanggal Diubah -->
                <td class="p-3 align-top text-xs text-slate-400">
                  {{ tpl.updatedAt ? tpl.updatedAt.split('T')[0] : '-' }}
                </td>

                <!-- Tombol Aksi -->
                <td class="p-3 align-top text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button 
                      @click="openSinglePreview(tpl)"
                      class="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 rounded text-xs font-medium"
                    >
                      Pratinjau
                    </button>
                    <button 
                      v-if="isSuperAdmin || (tpl.institution && tpl.institution.id === userInstitution?.id)"
                      @click="openEditModal(tpl)"
                      class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- TAMPILAN 2: PRATINJAU PESAN PENDAFTAR -->
    <div v-else class="space-y-4">
      
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        <!-- Kontrol Pilihan (5 Kolom) -->
        <div class="md:col-span-5 space-y-4">
          <div class="bg-white p-4 rounded-lg border border-slate-200 space-y-3.5 text-xs">
            <h2 class="font-bold text-slate-800 text-sm">Pilihan Pendaftar</h2>
            <p class="text-slate-500 text-xs">
              Pilih kombinasi pondok dan lembaga formal untuk melihat pesan yang akan diterima orang tua:
            </p>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Event</label>
              <select 
                v-model="previewSimulator.eventCode" 
                @change="generateComposedPreview()"
                class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-800"
              >
                <option value="REGISTRATION_CREATED">Pendaftaran Awal Berhasil</option>
                <option value="REGISTRATION_SUBMITTED">Pendaftaran Berhasil Dikirim</option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Pondok Pesantren</label>
              <select 
                v-model="previewSimulator.pondokId" 
                @change="generateComposedPreview()"
                class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-800"
              >
                <option v-for="p in pondokList" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Lembaga Formal</label>
              <select 
                v-model="previewSimulator.formalId" 
                @change="generateComposedPreview()"
                class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-800"
              >
                <option v-for="f in formalList" :key="f.id" :value="f.id">
                  {{ f.name }}
                </option>
                <option :value="null">Non-Formal (Tanpa Sekolah)</option>
              </select>
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span class="font-medium text-slate-700 block mb-1">Keterangan:</span>
            Pesan di sebelah kanan merupakan gabungan informasi dari Super Admin, Pondok Pesantren, dan Lembaga Formal yang dipilih.
          </div>
        </div>

        <!-- Layar Pratinjau Teks (7 Kolom) -->
        <div class="md:col-span-7">
          <div class="bg-slate-100 p-4 rounded-lg border border-slate-200 flex flex-col min-h-[420px]">
            <div class="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between text-xs text-slate-600">
              <span class="font-medium">Tampilan Pesan WhatsApp</span>
              <span class="text-slate-400">Pratinjau Langsung</span>
            </div>

            <BaseLoading v-if="loadingPreview" text="Memuat pratinjau pesan..." class="my-auto py-12" />

            <div v-else class="flex-grow flex flex-col justify-start">
              <div class="bg-[#E7FFDB] text-slate-800 p-3.5 rounded-lg border border-[#C5E1A5] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {{ composedResult.composedMessage || 'Tidak ada pesan aktif untuk kombinasi ini.' }}
              </div>
            </div>

            <p class="text-[11px] text-slate-400 text-center mt-3">
              Pratinjau ini tidak mengirimkan pesan ke nomor WhatsApp pendaftar.
            </p>
          </div>
        </div>

      </div>

    </div>

    <!-- MODAL EDIT TEMPLATE -->
    <BaseModal 
      :open="showFormModal" 
      :title="`Edit: ${form.name}`"
      @close="showFormModal = false"
      size="2xl"
    >
      <div class="space-y-3.5 text-xs">
        
        <div>
          <label class="block font-medium text-slate-700 mb-1">Nama Template</label>
          <input 
            type="text" 
            v-model="form.name" 
            class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block font-medium text-slate-700">Isi Pesan WhatsApp</label>
            <span class="text-slate-400">{{ form.message.length }} karakter</span>
          </div>
          <textarea 
            id="messageTextarea"
            v-model="form.message" 
            @input="checkUnknownVariables"
            rows="8" 
            class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 font-sans leading-relaxed"
            placeholder="Ketik isi pesan..."
          ></textarea>

          <div v-if="unknownVars.length > 0" class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
            Variabel belum terdaftar: <span class="font-mono font-semibold">{{ unknownVars.join(', ') }}</span>
          </div>
        </div>

        <!-- Sisipkan Variabel -->
        <div>
          <label class="block font-medium text-slate-700 mb-1">Sisipkan Variabel:</label>
          <div class="flex flex-wrap gap-1.5">
            <button 
              v-for="v in templateVariables" 
              :key="v.name"
              type="button"
              @click="insertVariable(v.name)"
              class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs border border-slate-200 transition-colors"
            >
              {{ v.label }} <span class="text-slate-400 font-mono">({{ v.name }})</span>
            </button>
          </div>
        </div>

      </div>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <button 
            type="button" 
            @click="openSinglePreview({ name: form.name, eventCode: form.eventCode, message: form.message })" 
            class="px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium rounded transition-colors"
          >
            Pratinjau
          </button>
          <div class="flex gap-2">
            <button @click="showFormModal = false" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800">
              Batal
            </button>
            <button @click="saveTemplate" :disabled="loading" class="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded transition-colors">
              Simpan
            </button>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- MODAL PRATINJAU SATUAN -->
    <BaseModal 
      :open="showSinglePreviewModal" 
      :title="`Pratinjau: ${singlePreviewTitle}`"
      @close="showSinglePreviewModal = false"
      size="md"
    >
      <div class="bg-slate-100 p-3 rounded border border-slate-200">
        <div class="bg-[#E7FFDB] p-3 rounded text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800 border border-[#C5E1A5]">
          {{ singlePreviewText }}
        </div>
      </div>
      <template #footer>
        <button @click="showSinglePreviewModal = false" class="px-4 py-1.5 bg-slate-800 text-white text-xs font-medium rounded ml-auto">
          Tutup
        </button>
      </template>
    </BaseModal>

  </div>
</template>
