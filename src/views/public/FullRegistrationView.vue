<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import publicApplicationFormService from '@/services/publicApplicationFormService'
import DocumentUploadStep from '@/components/public/DocumentUploadStep.vue'
import ReviewSubmitStep from '@/components/public/ReviewSubmitStep.vue'

const router = useRouter()

const loading = ref(true)
const submitting = ref(false)

const currentStepIndex = ref(0)
const formData = ref(null)
const applicationData = ref(null)
const documentStepComplete = ref(false)

const answers = reactive({})
const errors = ref({})

const credentials = ref({
  registrationNumber: '',
  continueToken: ''
})

const lastSavedText = ref('')

const loadForm = async () => {
  const sessionData = localStorage.getItem('spsmb_continue_session')
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData)
      credentials.value.registrationNumber = parsed.registrationNumber
      credentials.value.continueToken = parsed.continueToken
      
      const response = await publicApplicationFormService.getForm(parsed.registrationNumber, parsed.continueToken)
      if (response && response.data) {
        formData.value = response.data
        applicationData.value = response.data.application
        
        // Populate answers
        response.data.sections.forEach(section => {
          section.fields.forEach(field => {
            if (field.inputType === 'CHECKBOX') {
               answers[field.id] = Array.isArray(field.value) ? field.value : (field.value ? JSON.parse(field.value) : [])
            } else {
               answers[field.id] = field.value !== null && field.value !== undefined ? field.value : ''
            }
          })
        })

        // set initial step based on progress or 1
        const targetStep = response.data.progress.currentStep || 1
        currentStepIndex.value = Math.min(Math.max(0, targetStep - 1), response.data.sections.length - 1)
        
        if (applicationData.value.lastSavedAt) {
          lastSavedText.value = 'Terakhir disimpan: ' + new Date(applicationData.value.lastSavedAt).toLocaleString()
        }
        
        // If already submitted, redirect to success
        if (applicationData.value.status === 'SUBMITTED') {
          router.push('/pendaftaran/selesai')
        }
      } else {
        router.push('/pendaftaran')
      }
    } catch (e) {
      if (e.status === 401) {
        alert(e.message || 'Sesi berakhir')
      }
      router.push('/pendaftaran')
    }
  } else {
    router.push('/pendaftaran')
  }
  loading.value = false
}

onMounted(() => {
  loadForm()
})

const clearError = (fieldId) => {
  if (errors.value[fieldId]) {
    delete errors.value[fieldId]
  }
}

const saveCurrentSection = async (isCompleteAction = false) => {
  if (!formData.value || !formData.value.sections[currentStepIndex.value]) return false;
  
  submitting.value = true
  errors.value = {}
  
  const currentSection = formData.value.sections[currentStepIndex.value]
  const sectionAnswers = []
  
  currentSection.fields.forEach(f => {
    sectionAnswers.push({
      fieldId: f.id,
      value: answers[f.id]
    })
  })

  try {
    const res = await publicApplicationFormService.saveSection(
      credentials.value.registrationNumber,
      credentials.value.continueToken,
      currentSection.id,
      sectionAnswers,
      isCompleteAction
    )
    
    if (res.data && res.data.lastSavedAt) {
      lastSavedText.value = 'Tersimpan: ' + new Date(res.data.lastSavedAt).toLocaleString()
    }
    
    return true
  } catch (err) {
    if (err.status === 422 && err.errors) {
      errors.value = err.errors.fields || {}
      
      // scroll to first error
      setTimeout(() => {
        const errorEl = document.querySelector('.error')
        if (errorEl) errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    } else {
      alert(err.message || 'Gagal menyimpan data')
    }
    return false
  } finally {
    submitting.value = false
  }
}

const nextStep = async () => {
  if (currentStepIndex.value < formData.value.sections.length) {
    const success = await saveCurrentSection(true)
    if (success) {
      currentStepIndex.value++
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } else if (currentStepIndex.value === formData.value.sections.length) {
    // This is the document step
    if (!documentStepComplete.value) {
      alert('Terdapat dokumen wajib yang belum diupload.')
      return
    }
    currentStepIndex.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevStep = async () => {
  if (currentStepIndex.value < formData.value.sections.length) {
    await saveCurrentSection(false)
  }
  
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    router.push('/pendaftaran/sukses')
  }
}
</script>

<template>
  <div class="greenPanel">
    <div class="header">
      <h1 class="mainTitle">Pendaftaran Lanjutan</h1>
      <h2 class="subtitle">SPSMB Asy-Syadzili</h2>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A4D2E]"></div>
    </div>

    <template v-else-if="formData">
      <!-- Pendaftaran Header Info -->
      <div class="infoSection mb-8 max-w-[600px] mx-auto">
        <h3 class="infoTitle mb-2">Nomor Pendaftaran: {{ applicationData.registrationNumber }}</h3>
        <p class="text-slate-700 text-[0.95rem] m-0 font-medium">
          {{ applicationData.registrationType }} 
          <span v-if="applicationData.formalInstitution">&bull; {{ applicationData.formalInstitution.name }}</span>
          <span v-if="applicationData.pondokInstitution">&bull; {{ applicationData.pondokInstitution.name }}</span>
        </p>
        <p v-if="lastSavedText" class="text-xs text-slate-500 mt-2">{{ lastSavedText }}</p>
      </div>

      <!-- Step Indicator -->
      <div class="stepIndicator">
        <template v-for="(section, index) in formData.sections" :key="section.id">
          <div class="step" :class="{ 'activeStep': currentStepIndex === index, 'completedStep': currentStepIndex > index }">
            <span class="stepNumber">{{ index + 1 }}</span>
            <span class="stepLabel">{{ section.name }}</span>
          </div>
          <div class="stepLine"></div>
        </template>
        <div class="step" :class="{ 'activeStep': currentStepIndex === formData.sections.length, 'completedStep': currentStepIndex > formData.sections.length }">
          <span class="stepNumber">{{ formData.sections.length + 1 }}</span>
          <span class="stepLabel">Dokumen</span>
        </div>
        <div class="stepLine"></div>
        <div class="step" :class="{ 'activeStep': currentStepIndex === formData.sections.length + 1, 'completedStep': currentStepIndex > formData.sections.length + 1 }">
          <span class="stepNumber">{{ formData.sections.length + 2 }}</span>
          <span class="stepLabel">Review</span>
        </div>
      </div>

      <div class="stepContent">
        <div v-if="currentStepIndex < formData.sections.length" class="formSection">
          <h3 class="formTitle">{{ formData.sections[currentStepIndex].name }}</h3>

          <form @submit.prevent="nextStep" class="form">
            <div v-for="field in formData.sections[currentStepIndex].fields" :key="field.id" class="inputGroup mb-5">
              <label :for="'field-'+field.id" class="label">
                {{ field.label }} 
                <span v-if="field.isRequired" class="highlight">*</span>
                <span v-if="!field.isRequired" class="text-slate-400 font-normal ml-1">(opsional)</span>
              </label>

              <!-- TEXT / EMAIL / PHONE / NUMBER / DATE -->
              <template v-if="['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'DATE'].includes(field.inputType)">
                <input 
                  :type="field.inputType === 'PHONE' ? 'tel' : field.inputType.toLowerCase()" 
                  :id="'field-'+field.id"
                  v-model="answers[field.id]" 
                  class="input w-full" 
                  :placeholder="field.placeholder" 
                  @input="clearError(field.id)"
                />
              </template>

              <!-- TEXTAREA -->
              <template v-else-if="field.inputType === 'TEXTAREA'">
                <textarea 
                  :id="'field-'+field.id"
                  v-model="answers[field.id]" 
                  class="textarea w-full" 
                  :placeholder="field.placeholder" 
                  rows="3"
                  @input="clearError(field.id)"
                ></textarea>
              </template>

              <!-- SELECT -->
              <template v-else-if="field.inputType === 'SELECT'">
                <select 
                  :id="'field-'+field.id"
                  v-model="answers[field.id]" 
                  class="select w-full" 
                  @change="clearError(field.id)"
                >
                  <option value="">{{ field.placeholder || 'Pilih salah satu...' }}</option>
                  <option v-for="opt in field.options" :key="opt.id" :value="opt.value">{{ opt.label }}</option>
                </select>
              </template>

              <!-- RADIO -->
              <template v-else-if="field.inputType === 'RADIO'">
                <div class="flex flex-col gap-2 mt-2">
                  <label v-for="opt in field.options" :key="opt.id" class="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      :name="'field-'+field.id" 
                      :value="opt.value"
                      v-model="answers[field.id]"
                      @change="clearError(field.id)"
                      class="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </template>

              <!-- CHECKBOX -->
              <template v-else-if="field.inputType === 'CHECKBOX'">
                <div class="flex flex-col gap-2 mt-2">
                  <label v-for="opt in field.options" :key="opt.id" class="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      :value="opt.value"
                      v-model="answers[field.id]"
                      @change="clearError(field.id)"
                      class="text-emerald-600 focus:ring-emerald-500 rounded"
                    />
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </template>
              
              <div v-if="field.helpText" class="text-xs text-slate-500 mt-1">{{ field.helpText }}</div>
              
              <div v-if="errors[field.id]" class="error mt-1 py-1 px-2 text-xs text-red-600 bg-red-50 rounded">
                {{ errors[field.id].join(', ') }}
              </div>
            </div>

            <div class="stepActions mt-8">
              <button type="button" @click="prevStep" class="backButton" :disabled="submitting">
                {{ currentStepIndex === 0 ? '← Kembali ke Bukti' : '← Sebelumnya' }}
              </button>
              <button type="submit" class="submitButton" :disabled="submitting">
                Menyimpan & Lanjutkan →
              </button>
            </div>
          </form>
        </div>

        <div v-else-if="currentStepIndex === formData.sections.length" class="formSection">
          <h3 class="formTitle">Upload Dokumen</h3>
          
          <DocumentUploadStep 
            :registrationNumber="credentials.registrationNumber"
            :continueToken="credentials.continueToken"
            @completeness-change="documentStepComplete = $event"
          />

          <div class="stepActions mt-8 border-t border-slate-200 pt-6">
            <button type="button" @click="prevStep" class="backButton" :disabled="submitting">
              ← Sebelumnya
            </button>
            <button type="button" @click="nextStep" class="submitButton" :disabled="submitting || !documentStepComplete">
              Lanjut ke Finalisasi →
            </button>
          </div>
        </div>

        <div v-else class="formSection">
          <ReviewSubmitStep 
            :registrationNumber="credentials.registrationNumber"
            :continueToken="credentials.continueToken"
            @go-back="prevStep"
            @submitted="router.push('/pendaftaran/selesai')"
          />
        </div>
      </div>
    </template>
  </div>
</template>
