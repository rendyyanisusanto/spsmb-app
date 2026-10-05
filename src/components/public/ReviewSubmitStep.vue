<script setup>
import { ref, onMounted } from 'vue'
import { getReview, submitApplication } from '@/services/publicApplicationSubmitService'

const props = defineProps({
  registrationNumber: String,
  continueToken: String
})

const emit = defineEmits(['go-back', 'submitted'])

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const submitError = ref(null)

const reviewData = ref(null)

const loadReview = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getReview(props.registrationNumber, props.continueToken)
    reviewData.value = res
  } catch (err) {
    error.value = err.response?.data?.message || 'Gagal memuat data review'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReview()
})

const submit = async () => {
  if (!confirm('Apakah Anda yakin ingin mengirim pendaftaran?\n\nPastikan seluruh data yang diisi sudah benar.')) {
    return
  }

  submitting.value = true
  submitError.value = null

  try {
    await submitApplication(props.registrationNumber, props.continueToken)
    emit('submitted')
  } catch (err) {
    if (err.response?.data?.errors) {
      submitError.value = err.response.data
    } else {
      alert(err.response?.data?.message || 'Gagal mengirim pendaftaran')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="review-submit-step">
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
    </div>
    
    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
      {{ error }}
      <button @click="loadReview" class="ml-2 font-bold hover:underline">Coba lagi</button>
    </div>

    <div v-else-if="reviewData" class="space-y-6">
      
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
        <h3 class="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3">Ringkasan Pendaftaran</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-slate-500 text-xs mb-1">Nomor Pendaftaran</div>
            <div class="font-bold text-slate-800">{{ reviewData.application.registrationNumber }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs mb-1">Nama Calon Siswa</div>
            <div class="font-bold text-slate-800">{{ reviewData.applicant.fullName }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs mb-1">Tingkat Pendidikan</div>
            <div class="font-bold text-slate-800">{{ reviewData.registration.type }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs mb-1">Lembaga Formal</div>
            <div class="font-bold text-slate-800">{{ reviewData.registration.formalInstitution?.name || '-' }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs mb-1">Lembaga Pondok</div>
            <div class="font-bold text-slate-800">{{ reviewData.registration.pondokInstitution?.name || '-' }}</div>
          </div>
          <div v-if="reviewData.registration.major">
            <div class="text-slate-500 text-xs mb-1">Jurusan (Pilihan Utama)</div>
            <div class="font-bold text-slate-800">{{ reviewData.registration.major.name }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white border rounded-xl overflow-hidden shadow-sm" :class="reviewData.completeness.complete ? 'border-emerald-200' : 'border-amber-200'">
        <div class="p-4 md:p-5 flex items-start gap-3" :class="reviewData.completeness.complete ? 'bg-emerald-50' : 'bg-amber-50'">
          <div v-if="reviewData.completeness.complete" class="shrink-0 mt-0.5 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div v-else class="shrink-0 mt-0.5 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          </div>
          
          <div class="flex-grow">
            <h4 class="font-bold mb-1 text-base" :class="reviewData.completeness.complete ? 'text-emerald-800' : 'text-amber-800'">
              {{ reviewData.completeness.complete ? 'Pendaftaran Lengkap' : 'Data Belum Lengkap' }}
            </h4>
            <p class="text-sm m-0" :class="reviewData.completeness.complete ? 'text-emerald-700' : 'text-amber-700'">
              {{ reviewData.completeness.complete ? 'Seluruh form wajib dan dokumen telah diisi. Anda dapat mengirimkan pendaftaran ini.' : 'Terdapat bagian yang belum lengkap. Silakan lengkapi sebelum mengirim pendaftaran.' }}
            </p>
          </div>
        </div>
        
        <div v-if="!reviewData.completeness.complete" class="p-4 md:p-5 border-t border-amber-100 bg-white">
          <div v-if="reviewData.completeness.missing.fields?.length" class="mb-4">
            <h5 class="text-sm font-bold text-slate-700 mb-2">Form Belum Lengkap:</h5>
            <ul class="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li v-for="(f, i) in reviewData.completeness.missing.fields" :key="'f'+i">
                {{ f.label }} <span class="text-slate-400 text-xs">({{ f.sectionName }})</span>
              </li>
            </ul>
          </div>
          
          <div v-if="reviewData.completeness.missing.documents?.length">
            <h5 class="text-sm font-bold text-slate-700 mb-2">Dokumen Wajib Belum Diupload:</h5>
            <ul class="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li v-for="(d, i) in reviewData.completeness.missing.documents" :key="'d'+i">
                {{ d.name }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Incomplete Submit Error Notice -->
      <div v-if="submitError" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
        <div class="font-bold mb-1">Gagal mengirim pendaftaran</div>
        <p class="mb-2">{{ submitError.message }}</p>
        <ul class="list-disc pl-5">
          <li v-for="(f, i) in submitError.errors?.missingFields" :key="'se-f'+i">Form: {{ f.label }}</li>
          <li v-for="(d, i) in submitError.errors?.missingDocuments" :key="'se-d'+i">Dokumen: {{ d.name }}</li>
        </ul>
        <button @click="loadReview" class="mt-3 text-xs font-bold underline text-red-700">Muat Ulang Status</button>
      </div>

      <div class="stepActions mt-8 border-t border-slate-200 pt-6">
        <button type="button" @click="$emit('go-back')" class="backButton" :disabled="submitting">
          ← Kembali Edit
        </button>
        <button 
          type="button" 
          @click="submit" 
          class="submitButton flex items-center justify-center gap-2" 
          :class="{'opacity-50 cursor-not-allowed': submitting || !reviewData.completeness.complete}"
          :disabled="submitting || !reviewData.completeness.complete"
        >
          <span v-if="submitting" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          {{ submitting ? 'Mengirim...' : 'Kirim Pendaftaran' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backButton {
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}
.backButton:hover {
  background: #f1f5f9;
  color: #334155;
}
.submitButton {
  background: #1A4D2E;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
.submitButton:hover:not(:disabled) {
  background: #153e25;
}
.submitButton:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.stepActions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
