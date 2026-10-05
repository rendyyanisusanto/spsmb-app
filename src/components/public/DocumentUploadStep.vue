<script setup>
import { ref, onMounted } from 'vue'
import { getDocuments, uploadDocument, replaceDocument, getDocumentFileUrl } from '@/services/publicDocumentService'

const props = defineProps({
  registrationNumber: String,
  continueToken: String
})

const emit = defineEmits(['completeness-change'])

const loading = ref(true)
const uploading = ref({})
const documents = ref([])
const summary = ref({})
const error = ref('')

const fetchDocuments = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getDocuments(props.registrationNumber, props.continueToken)
    if (res && res.documents) {
      documents.value = res.documents
      summary.value = res.summary
      emit('completeness-change', summary.value.complete)
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal memuat daftar dokumen.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDocuments()
})

const handleFileSelect = async (event, doc) => {
  const file = event.target.files[0]
  if (!file) return

  // Validation
  const extension = file.name.split('.').pop().toLowerCase()
  if (!doc.allowedExtensions.includes(extension)) {
    alert(`Format file tidak valid. Diizinkan: ${doc.allowedExtensions.join(', ')}`)
    event.target.value = ''
    return
  }

  const maxSize = doc.maxSizeMb * 1024 * 1024
  if (file.size > maxSize) {
    alert(`Ukuran file maksimal ${doc.maxSizeMb} MB`)
    event.target.value = ''
    return
  }

  uploading.value[doc.documentTypeId] = true
  try {
    if (doc.uploadStatus === 'UPLOADED') {
      await replaceDocument(props.registrationNumber, props.continueToken, doc.documentTypeId, file)
    } else {
      await uploadDocument(props.registrationNumber, props.continueToken, doc.documentTypeId, file)
    }
    await fetchDocuments()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal mengupload dokumen.')
  } finally {
    uploading.value[doc.documentTypeId] = false
    event.target.value = '' // Reset input
  }
}

const getAcceptAttr = (extensions) => {
  return extensions.map(ext => `.${ext}`).join(',')
}

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

const viewFile = (doc) => {
  const url = getDocumentFileUrl(props.registrationNumber, props.continueToken, doc.documentTypeId)
  window.open(url, '_blank')
}
</script>

<template>
  <div class="document-upload-step">
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
    </div>
    
    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
      {{ error }}
      <button @click="fetchDocuments" class="ml-2 font-bold hover:underline">Coba lagi</button>
    </div>

    <div v-else>
      <div v-if="documents.length === 0" class="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        Tidak ada dokumen yang disyaratkan untuk pendaftaran ini.
      </div>

      <div v-else class="space-y-6">
        <!-- Summary Alert -->
        <div v-if="!summary.complete" class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <div>
            <span class="font-bold block mb-1">Upload Dokumen Wajib</span>
            Terdapat {{ summary.missingRequired }} dokumen wajib yang belum diupload. Anda tidak dapat menyelesaikan form sebelum semua dokumen wajib dilengkapi.
          </div>
        </div>
        <div v-else class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800 text-sm flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div class="font-bold">
            Semua dokumen wajib telah diupload. Anda dapat melanjutkan ke tahap finalisasi.
          </div>
        </div>

        <!-- Document List -->
        <div v-for="doc in documents" :key="doc.documentTypeId" class="bg-white border rounded-xl overflow-hidden transition-all shadow-sm" :class="{'border-amber-200': doc.required && doc.uploadStatus !== 'UPLOADED', 'border-slate-200': !(doc.required && doc.uploadStatus !== 'UPLOADED')}">
          <div class="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
            
            <div class="flex-grow">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-bold text-slate-800 m-0 text-base">{{ doc.name }}</h4>
                <span v-if="doc.required" class="text-xs font-bold text-red-500 uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded">Wajib</span>
                <span v-else class="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">Opsional</span>
              </div>
              <p class="text-sm text-slate-500 mb-2">{{ doc.description }}</p>
              
              <div class="flex flex-wrap gap-3 text-xs font-medium">
                <div class="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md text-slate-600 border border-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  {{ doc.allowedExtensions.join(', ') }}
                </div>
                <div class="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md text-slate-600 border border-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Maks. {{ doc.maxSizeMb }} MB
                </div>
              </div>
            </div>

            <div class="shrink-0 w-full md:w-auto flex flex-col md:items-end gap-3 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
              
              <div v-if="doc.uploadStatus === 'UPLOADED'" class="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg border border-emerald-100 w-full md:w-64">
                <div class="flex items-start gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-500 shrink-0 mt-0.5"><path d="M20 6 9 17l-5-5"/></svg>
                  <div>
                    <div class="text-xs font-bold uppercase tracking-wider mb-1">Sudah Diupload</div>
                    <div class="text-sm font-medium truncate" :title="doc.file.fileName">{{ doc.file.fileName }}</div>
                    <div class="text-xs opacity-80 mt-0.5">{{ formatSize(doc.file.fileSize) }}</div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2 mt-3 pt-2 border-t border-emerald-200/50">
                  <button type="button" @click="viewFile(doc)" class="text-xs font-bold hover:text-emerald-900 bg-white/50 px-2 py-1 rounded hover:bg-white transition-colors">
                    Lihat File
                  </button>
                  <label class="text-xs font-bold hover:text-emerald-900 bg-white/50 px-2 py-1 rounded hover:bg-white transition-colors cursor-pointer ml-auto">
                    {{ uploading[doc.documentTypeId] ? 'Mengupload...' : 'Ganti File' }}
                    <input type="file" class="hidden" :accept="getAcceptAttr(doc.allowedExtensions)" @change="handleFileSelect($event, doc)" :disabled="uploading[doc.documentTypeId]">
                  </label>
                </div>
              </div>

              <div v-else class="bg-slate-50 text-slate-500 px-4 py-3 rounded-lg border border-slate-200 border-dashed w-full md:w-64 flex flex-col items-center justify-center min-h-[90px]">
                <div class="text-sm font-medium mb-3">Belum Diupload</div>
                <label class="bg-white border border-slate-300 hover:border-slate-800 text-slate-700 hover:text-slate-900 px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-2 w-full justify-center">
                  <span v-if="uploading[doc.documentTypeId]" class="animate-spin inline-block w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full"></span>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {{ uploading[doc.documentTypeId] ? 'Mengupload...' : 'Pilih File' }}
                  <input type="file" class="hidden" :accept="getAcceptAttr(doc.allowedExtensions)" @change="handleFileSelect($event, doc)" :disabled="uploading[doc.documentTypeId]">
                </label>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>
