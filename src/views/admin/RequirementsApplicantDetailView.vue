<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApplicantDetailMock, updateApplicantDocumentStatusMock } from '@/data/mock/applicantDocuments'

const route = useRoute()
const router = useRouter()
const applicantId = route.params.id

const loading = ref(true)
const applicant = ref(null)
const requirements = ref([]) // the required docs for this applicant's institution + global

// UI State
const showPreviewModal = ref(false)
const previewDoc = ref(null)

const showVerifyModal = ref(false)
const verifyDoc = ref(null)
const verifyAction = ref('') // 'VERIFIED' or 'REVISION'
const verifyNote = ref('')

const fetchDetail = async () => {
  loading.value = true
  const res = await getApplicantDetailMock(applicantId)
  if (res.success) {
    applicant.value = res.data
    
    // Fetch requirements to display the full list (even those not uploaded)
    const savedReqs = localStorage.getItem('spsmb_document_requirements')
    let allReqs = savedReqs ? JSON.parse(savedReqs) : []
    
    // filter to GLOBAL + Applicant's Institution
    requirements.value = allReqs.filter(r => 
      r.active && (r.scope === 'GLOBAL' || (r.scope === 'LEMBAGA' && r.institutionName === applicant.value.institution))
    ).sort((a, b) => a.order - b.order)
    
  }
  loading.value = false
}

onMounted(() => {
  fetchDetail()
})

// Mapped List combining requirement with uploaded document data
const mappedDocuments = computed(() => {
  if (!applicant.value) return []
  return requirements.value.map(req => {
    const uploaded = applicant.value.documents.find(d => d.requirementCode === req.code)
    if (uploaded && uploaded.status !== 'NOT_UPLOADED') {
      return {
        ...req,
        isUploaded: true,
        docData: uploaded
      }
    }
    return {
      ...req,
      isUploaded: false,
      docData: null
    }
  })
})

const summary = computed(() => {
  const docs = mappedDocuments.value
  const total = docs.length
  let uploaded = 0
  let verified = 0
  let revision = 0
  
  docs.forEach(d => {
    if (d.isUploaded) uploaded++
    if (d.docData?.status === 'VERIFIED') verified++
    if (d.docData?.status === 'REVISION') revision++
  })
  
  return {
    total,
    uploaded,
    verified,
    revision,
    notUploaded: total - uploaded
  }
})

const getStatusBadge = (status) => {
  switch (status) {
    case 'VERIFIED': return { text: 'Terverifikasi', class: 'bg-emerald-100 text-emerald-700' }
    case 'REVISION': return { text: 'Perlu Perbaikan', class: 'bg-amber-100 text-amber-700' }
    case 'UPLOADED': return { text: 'Menunggu Verifikasi', class: 'bg-blue-100 text-blue-700' }
    default: return { text: 'Belum Upload', class: 'bg-slate-100 text-slate-500' }
  }
}

const handlePreview = (doc) => {
  previewDoc.value = doc
  showPreviewModal.value = true
}

const handleDownload = (doc) => {
  // Mock download
  alert(`Mengunduh file: ${doc.docData.fileName}`)
}

const openVerify = (doc) => {
  verifyDoc.value = doc
  verifyAction.value = 'VERIFIED'
  verifyNote.value = doc.docData.verificationNote || ''
  showVerifyModal.value = true
}

const submitVerify = async () => {
  if (verifyAction.value === 'REVISION' && !verifyNote.value.trim()) {
    alert('Catatan perbaikan wajib diisi!')
    return
  }
  
  const statusData = {
    status: verifyAction.value,
    verificationNote: verifyAction.value === 'REVISION' ? verifyNote.value : null,
    verifiedAt: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    verifiedBy: 'Admin Saat Ini' // Hardcoded mock
  }
  
  const res = await updateApplicantDocumentStatusMock(applicant.value.id, verifyDoc.value.code, statusData)
  if (res.success) {
    applicant.value = res.data
    showVerifyModal.value = false
  } else {
    alert('Gagal menyimpan verifikasi.')
  }
}

</script>

<template>
  <div class="applicant-document-detail pb-20">
    <!-- Back & Header -->
    <div class="mb-6">
      <button @click="router.push('/admin/persyaratan')" class="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-4 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
        Kembali ke Daftar
      </button>
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Pemeriksaan Dokumen Pendaftar</h1>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
    </div>
    
    <div v-else-if="!applicant" class="bg-white p-12 rounded-xl text-center text-slate-500 shadow-sm border border-slate-200">
      Pendaftar tidak ditemukan.
    </div>

    <div v-else class="space-y-6">
      
      <!-- Top Overview Card -->
      <div class="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden relative">
        <div class="h-1.5 w-full bg-slate-800"></div>
        <div class="p-6">
          <div class="flex flex-col lg:flex-row justify-between gap-6">
            
            <!-- Applicant Info -->
            <div>
              <p class="text-sm font-mono text-slate-500 mb-1">{{ applicant.registrationNumber }}</p>
              <h2 class="text-2xl font-bold text-slate-800 mb-2">{{ applicant.name }}</h2>
              <div class="flex flex-wrap gap-2 mb-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                  {{ applicant.institution }}
                </span>
                <span class="inline-flex items-center px-2.5 py-1 rounded bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {{ applicant.whatsapp }}
                </span>
              </div>
            </div>

            <!-- Summary Blocks -->
            <div class="flex gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-6">
              <div class="text-center">
                <div class="text-2xl font-black text-slate-800">{{ summary.total }}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Dokumen</div>
              </div>
              <div class="w-px bg-slate-100"></div>
              <div class="text-center">
                <div class="text-2xl font-black text-blue-600">{{ summary.uploaded }}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Terupload</div>
              </div>
              <div class="w-px bg-slate-100"></div>
              <div class="text-center">
                <div class="text-2xl font-black text-emerald-600">{{ summary.verified }}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Terverifikasi</div>
              </div>
              <div class="w-px bg-slate-100"></div>
              <div class="text-center">
                <div class="text-2xl font-black text-amber-500">{{ summary.revision }}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Revisi</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Document List -->
      <div class="space-y-4">
        <div v-for="doc in mappedDocuments" :key="doc.code" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
          
          <!-- Requirement Info (Left) -->
          <div class="p-5 md:w-1/3 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center">
            <h3 class="font-bold text-slate-800 mb-1 flex items-center gap-2">
              {{ doc.name }}
              <span v-if="doc.required" class="text-red-500">*</span>
            </h3>
            <p class="text-xs text-slate-500 mb-3 line-clamp-2" :title="doc.description">{{ doc.description || 'Tidak ada deskripsi' }}</p>
            <div class="flex flex-wrap gap-2">
              <span v-if="doc.scope === 'GLOBAL'" class="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-100 uppercase tracking-widest">GLOBAL</span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-white text-slate-500 text-[9px] font-bold border border-slate-200 uppercase tracking-widest">{{ doc.allowedFileTypes.join('/') }}</span>
            </div>
          </div>

          <!-- Upload Status & Actions (Right) -->
          <div class="p-5 md:w-2/3 flex flex-col justify-center">
            <div v-if="!doc.isUploaded" class="flex items-center justify-between">
              <div>
                <span class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <span class="w-2 h-2 rounded-full bg-slate-300"></span> Belum Upload
                </span>
                <p class="text-xs text-slate-400 mt-1">Pendaftar belum mengunggah dokumen ini.</p>
              </div>
            </div>
            
            <div v-else class="flex flex-col sm:flex-row justify-between gap-4">
              <!-- File Info -->
              <div class="flex-grow">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest" :class="getStatusBadge(doc.docData.status).class">
                    {{ getStatusBadge(doc.docData.status).text }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ doc.docData.uploadedAt }}</span>
                </div>
                
                <div class="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  {{ doc.docData.fileName }}
                  <span class="text-xs text-slate-400 font-normal">({{ doc.docData.fileSize }})</span>
                </div>

                <!-- Verification Log -->
                <div v-if="doc.docData.verifiedAt" class="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-slate-600">Oleh: {{ doc.docData.verifiedBy }}</span>
                    <span class="text-slate-400 font-mono">{{ doc.docData.verifiedAt }}</span>
                  </div>
                  <p v-if="doc.docData.verificationNote" class="text-slate-700 italic mt-2 border-l-2 border-amber-300 pl-2">"{{ doc.docData.verificationNote }}"</p>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-col sm:items-end gap-2 shrink-0">
                <div class="flex items-center gap-2">
                  <button @click="handlePreview(doc)" class="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-800 hover:text-slate-900 rounded-lg text-xs font-bold text-slate-600 shadow-sm transition-colors">
                    Preview
                  </button>
                  <button @click="handleDownload(doc)" class="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-800 hover:text-slate-900 rounded-lg text-xs font-bold text-slate-600 shadow-sm transition-colors flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Download
                  </button>
                </div>
                
                <button @click="openVerify(doc)" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors w-full mt-2">
                  Verifikasi Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- PREVIEW MODAL (Mock) -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh]">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <h2 class="text-lg font-bold text-slate-800">Preview: {{ previewDoc?.docData?.fileName }}</h2>
          <button @click="showPreviewModal = false" class="text-slate-400 hover:text-slate-800"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        <div class="p-6 flex-grow flex items-center justify-center bg-slate-100 overflow-hidden">
          <div class="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto mb-4 text-slate-300"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <p class="text-slate-500 font-medium">Area Preview Dokumen (Mock)</p>
            <p class="text-xs text-slate-400 mt-2">Pada versi asli, dokumen PDF atau Gambar akan dirender di sini.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- VERIFY MODAL -->
    <div v-if="showVerifyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <h2 class="text-lg font-bold text-slate-800">Verifikasi: {{ verifyDoc?.name }}</h2>
          <button @click="showVerifyModal = false" class="text-slate-400 hover:text-slate-800"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        
        <div class="p-6 space-y-5">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Hasil Verifikasi</label>
            <div class="flex gap-4">
              <label class="flex-1 cursor-pointer">
                <input type="radio" v-model="verifyAction" value="VERIFIED" class="peer sr-only">
                <div class="p-3 border border-slate-200 rounded-xl text-center font-bold text-sm text-slate-500 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 hover:bg-slate-50 transition-colors">
                  Diterima (Sesuai)
                </div>
              </label>
              <label class="flex-1 cursor-pointer">
                <input type="radio" v-model="verifyAction" value="REVISION" class="peer sr-only">
                <div class="p-3 border border-slate-200 rounded-xl text-center font-bold text-sm text-slate-500 peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700 hover:bg-slate-50 transition-colors">
                  Perlu Perbaikan
                </div>
              </label>
            </div>
          </div>
          
          <div v-if="verifyAction === 'REVISION'">
            <label class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Catatan Perbaikan <span class="text-red-500">*</span></label>
            <textarea v-model="verifyNote" rows="3" class="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 placeholder-slate-400" placeholder="Tuliskan alasan mengapa dokumen ditolak dan apa yang harus diperbaiki pendaftar..."></textarea>
          </div>
          <div v-else-if="verifyAction === 'VERIFIED'">
            <label class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Catatan Internal (Opsional)</label>
            <textarea v-model="verifyNote" rows="2" class="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 placeholder-slate-400" placeholder="Catatan opsional..."></textarea>
          </div>
        </div>
        
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button @click="showVerifyModal = false" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Batal</button>
          <button @click="submitVerify" class="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">Simpan Verifikasi</button>
        </div>
      </div>
    </div>
  </div>
</template>
