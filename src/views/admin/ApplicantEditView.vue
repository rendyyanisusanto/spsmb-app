<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'
import { getApplicationDetail, getApplicationForm, updateApplication } from '@/services/applicationService'
import * as institutionService from '@/services/institutionService'
import publicRegistrationService from '@/services/publicRegistrationService'

const route = useRoute()
const router = useRouter()
const applicantId = route.params.id

// Active tab: 'form_awal' or section id
const activeTab = ref('form_awal')
const loading = ref(true)
const submitting = ref(false)
const errorMsg = ref('')
const formErrors = ref({})

// Data sources
const applicationDetail = ref(null)
const sections = ref([])
const dynamicAnswers = reactive({})
const lembagaOptions = ref([])
const pondokOptions = ref([])
const sumberInfoOptions = ref([])

// Form Awal state (matches RegistrationStartView.vue exactly)
const initialForm = reactive({
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: 'L',
  whatsapp: '',
  namaOrtu: '',
  alamat: '',
  sekolahAsal: '',
  lembaga: '',
  sumberInfo: '',
  sumberInfoLainnya: '',
  pondokInstitutionId: '',
  status: 'SUBMITTED'
})

const registrationNumber = computed(() => {
  return applicationDetail.value?.application?.registrationNumber || '-'
})

const loadData = async () => {
  loading.value = true
  errorMsg.value = ''
  formErrors.value = {}
  activeTab.value = 'form_awal'

  try {
    const [detailRes, formRes, instRes, infoRes] = await Promise.all([
      getApplicationDetail(applicantId),
      getApplicationForm(applicantId),
      institutionService.getPublicInstitutions(),
      publicRegistrationService.getInformationSources()
    ])

    const detail = detailRes.data || detailRes
    applicationDetail.value = detail

    if (instRes && instRes.data) {
      lembagaOptions.value = [
        { value: 'NON_FORMAL', label: 'Non Formal', type: 'NON_FORMAL' },
        ...instRes.data
          .filter(i => i.institution_type !== 'PONDOK')
          .map(i => ({ value: String(i.id), label: i.name, type: i.institution_type }))
      ]

      pondokOptions.value = instRes.data
        .filter(i => i.institution_type === 'PONDOK')
        .map(i => ({ value: String(i.id), label: i.name }))
    }

    if (infoRes && infoRes.data) {
      sumberInfoOptions.value = infoRes.data.map(i => ({ value: String(i.id), label: i.name }))
    }

    const app = detail.applicant || {}
    const appl = detail.application || {}
    const reg = detail.registration || {}
    const guardians = detail.guardians || {}

    initialForm.namaLengkap = app.fullName || ''
    initialForm.tempatLahir = app.birthPlace || ''
    initialForm.tanggalLahir = app.birthDate ? app.birthDate.split('T')[0] : ''
    initialForm.jenisKelamin = app.gender === 'FEMALE' ? 'P' : 'L'
    initialForm.whatsapp = app.whatsapp || ''
    initialForm.namaOrtu = guardians.guardian?.name || guardians.father?.name || ''
    initialForm.alamat = app.address || ''
    initialForm.sekolahAsal = app.previousSchool || ''
    
    if (appl.registrationType === 'NON_FORMAL') {
      initialForm.lembaga = 'NON_FORMAL'
    } else if (reg.formalInstitution?.id) {
      initialForm.lembaga = String(reg.formalInstitution.id)
    } else {
      initialForm.lembaga = ''
    }

    initialForm.sumberInfo = app.informationSource?.id ? String(app.informationSource.id) : ''
    initialForm.sumberInfoLainnya = app.informationSourceOther || ''
    initialForm.pondokInstitutionId = reg.pondokInstitution?.id ? String(reg.pondokInstitution.id) : ''
    initialForm.status = appl.status || 'SUBMITTED'

    const formObj = formRes.data || formRes || {}
    const activeSections = formObj.sections || []
    sections.value = activeSections

    activeSections.forEach(sec => {
      sec.fields.forEach(f => {
        if (f.inputType === 'CHECKBOX') {
          dynamicAnswers[f.id] = Array.isArray(f.value)
            ? f.value
            : (f.value ? (typeof f.value === 'string' && f.value.startsWith('[') ? JSON.parse(f.value) : [f.value]) : [])
        } else {
          dynamicAnswers[f.id] = f.value !== null && f.value !== undefined ? f.value : ''
        }
      })
    })

  } catch (err) {
    errorMsg.value = err?.message || 'Gagal memuat formulir pendaftar'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const handleSave = async () => {
  formErrors.value = {}
  errorMsg.value = ''

  if (!initialForm.namaLengkap || initialForm.namaLengkap.trim() === '') {
    formErrors.value.namaLengkap = 'Nama lengkap santri wajib diisi'
    activeTab.value = 'form_awal'
    return
  }

  if (!initialForm.whatsapp || initialForm.whatsapp.trim() === '') {
    formErrors.value.whatsapp = 'Nomor WhatsApp wajib diisi'
    activeTab.value = 'form_awal'
    return
  }

  submitting.value = true
  try {
    let registrationType = 'NON_FORMAL'
    let formalInstitutionId = null

    if (initialForm.lembaga && initialForm.lembaga !== 'NON_FORMAL') {
      const selected = lembagaOptions.value.find(l => l.value === initialForm.lembaga)
      if (selected) {
        registrationType = selected.type
        formalInstitutionId = selected.value
      }
    }

    const answersPayload = []
    sections.value.forEach(sec => {
      sec.fields.forEach(f => {
        answersPayload.push({
          fieldId: f.id,
          fieldCode: f.fieldCode,
          value: dynamicAnswers[f.id]
        })
      })
    })

    const payload = {
      initialForm: {
        fullName: initialForm.namaLengkap.trim(),
        birthPlace: initialForm.tempatLahir.trim(),
        birthDate: initialForm.tanggalLahir || null,
        gender: initialForm.jenisKelamin === 'L' ? 'MALE' : 'FEMALE',
        whatsapp: initialForm.whatsapp.trim(),
        parentName: initialForm.namaOrtu.trim(),
        address: initialForm.alamat.trim(),
        previousSchool: initialForm.sekolahAsal.trim(),
        registrationType: registrationType,
        formalInstitutionId: formalInstitutionId,
        pondokInstitutionId: initialForm.pondokInstitutionId || null,
        informationSourceId: initialForm.sumberInfo || null,
        informationSourceOther: initialForm.sumberInfoLainnya || null,
        status: initialForm.status
      },
      dynamicAnswers: answersPayload
    }

    await updateApplication(applicantId, payload)
    router.push(`/admin/pendaftar/${applicantId}`)
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || err?.message || 'Gagal menyimpan data pendaftar'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="edit-applicant-container pb-12">
    <BaseLoading v-if="loading" text="Memuat formulir pendaftar..." class="min-h-[50vh]" />
    
    <div v-else-if="errorMsg && !applicationDetail" class="min-h-[50vh] flex items-center justify-center">
      <BaseErrorState :message="errorMsg" @retry="loadData" />
    </div>

    <div v-else class="flex flex-col gap-6 max-w-5xl mx-auto">
      <!-- Top Action Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-3">
            <h4 class="text-lg font-bold text-slate-800 mb-0">Edit Data Pendaftar</h4>
            <span class="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {{ registrationNumber }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1 mb-0">Sesuaikan data pendaftaran awal dan formulir dinamis</p>
        </div>
        <div class="flex items-center gap-2 mt-4 sm:mt-0">
          <router-link
            :to="`/admin/pendaftar/${applicantId}`"
            class="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            Kembali
          </router-link>
          <button
            type="button"
            @click="handleSave"
            :disabled="submitting"
            class="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
        <span>{{ errorMsg }}</span>
        <button @click="errorMsg = ''" class="text-rose-500 hover:text-rose-700 text-xs font-semibold ml-2">Tutup</button>
      </div>

      <!-- Form Container -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <!-- Tabs Header (Clean text, no extra icons) -->
        <div class="flex border-b border-slate-200 px-6 pt-4 gap-1 overflow-x-auto bg-slate-50/50">
          <button
            type="button"
            @click="activeTab = 'form_awal'"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
            :class="activeTab === 'form_awal' ? 'border-blue-600 text-blue-600 font-semibold bg-white rounded-t-lg border-t border-x border-b-white -mb-[1px]' : 'border-transparent text-slate-500 hover:text-slate-700'"
          >
            Form Awal
          </button>

          <button
            v-for="sec in sections"
            :key="sec.id"
            type="button"
            @click="activeTab = String(sec.id)"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
            :class="activeTab === String(sec.id) ? 'border-blue-600 text-blue-600 font-semibold bg-white rounded-t-lg border-t border-x border-b-white -mb-[1px]' : 'border-transparent text-slate-500 hover:text-slate-700'"
          >
            {{ sec.name }}
          </button>
        </div>

        <div class="p-6">
          <!-- TAB 1: FORM AWAL (PERSIS REGISTRATION START VIEW) -->
          <div v-show="activeTab === 'form_awal'" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Nama Lengkap -->
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap Santri <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="initialForm.namaLengkap"
                  type="text"
                  placeholder="Masukkan nama lengkap santri"
                  class="w-full px-3.5 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  :class="formErrors.namaLengkap ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'"
                />
                <span v-if="formErrors.namaLengkap" class="text-xs text-rose-500 mt-1 block">{{ formErrors.namaLengkap }}</span>
              </div>

              <!-- Tempat Lahir -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tempat Lahir
                </label>
                <input
                  v-model="initialForm.tempatLahir"
                  type="text"
                  placeholder="Kota tempat lahir"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <!-- Tanggal Lahir -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tanggal Lahir
                </label>
                <input
                  v-model="initialForm.tanggalLahir"
                  type="date"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <!-- Jenis Kelamin -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Jenis Kelamin <span class="text-rose-500">*</span>
                </label>
                <div class="flex gap-4 mt-2">
                  <label class="inline-flex items-center text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      value="L"
                      v-model="initialForm.jenisKelamin"
                      class="w-4 h-4 text-blue-600 border-slate-300"
                    />
                    <span class="ml-2">Laki-laki</span>
                  </label>
                  <label class="inline-flex items-center text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      value="P"
                      v-model="initialForm.jenisKelamin"
                      class="w-4 h-4 text-blue-600 border-slate-300"
                    />
                    <span class="ml-2">Perempuan</span>
                  </label>
                </div>
              </div>

              <!-- WhatsApp -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp (Aktif) <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="initialForm.whatsapp"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  class="w-full px-3.5 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  :class="formErrors.whatsapp ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'"
                />
                <span v-if="formErrors.whatsapp" class="text-xs text-rose-500 mt-1 block">{{ formErrors.whatsapp }}</span>
              </div>

              <!-- Nama Orang Tua / Wali -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Orang Tua / Wali
                </label>
                <input
                  v-model="initialForm.namaOrtu"
                  type="text"
                  placeholder="Nama ayah / ibu / wali"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <!-- Asal Sekolah -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Asal Sekolah / Madrasah
                </label>
                <input
                  v-model="initialForm.sekolahAsal"
                  type="text"
                  placeholder="Nama sekolah asal"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <!-- Alamat Lengkap -->
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Lengkap
                </label>
                <textarea
                  v-model="initialForm.alamat"
                  rows="3"
                  placeholder="Dusun, RT/RW, Desa, Kecamatan, Kabupaten/Kota"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                ></textarea>
              </div>

              <!-- Lembaga Formal Pilihan -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lembaga Pendidikan Pilihan
                </label>
                <select
                  v-model="initialForm.lembaga"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Pilih Lembaga Pendidikan</option>
                  <option v-for="l in lembagaOptions" :key="l.value" :value="l.value">
                    {{ l.label }}
                  </option>
                </select>
              </div>

              <!-- Lembaga Pondok -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lembaga Pondok Pesantren
                </label>
                <select
                  v-model="initialForm.pondokInstitutionId"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Tidak Memilih Pondok --</option>
                  <option v-for="p in pondokOptions" :key="p.value" :value="p.value">
                    {{ p.label }}
                  </option>
                </select>
              </div>

              <!-- Sumber Informasi -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dari mana mengetahui informasi pendaftaran ini?
                </label>
                <select
                  v-model="initialForm.sumberInfo"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Pilih Sumber Informasi</option>
                  <option v-for="s in sumberInfoOptions" :key="s.value" :value="s.value">
                    {{ s.label }}
                  </option>
                </select>
              </div>

              <!-- Status Pendaftaran -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status Pendaftaran <span class="text-rose-500">*</span>
                </label>
                <select
                  v-model="initialForm.status"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="DRAFT">DRAFT (Pendaftaran Belum Lengkap)</option>
                  <option value="SUBMITTED">SUBMITTED (Terkonfirmasi Santri)</option>
                  <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
                </select>
              </div>

              <!-- Sumber Info Lainnya -->
              <div v-if="initialForm.sumberInfo" class="md:col-span-2">
                <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Keterangan Sumber Informasi Lainnya
                </label>
                <input
                  v-model="initialForm.sumberInfoLainnya"
                  type="text"
                  placeholder="Sebutkan jika ada keterangan tambahan"
                  class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- TABS FORM LENGKAP & DINAMIS -->
          <template v-for="sec in sections" :key="sec.id">
            <div v-show="activeTab === String(sec.id)" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="field in sec.fields"
                  :key="field.id"
                  :class="field.inputType === 'TEXTAREA' ? 'md:col-span-2' : ''"
                >
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {{ field.label }}
                    <span v-if="field.isRequired" class="text-rose-500">*</span>
                    <span v-else class="text-slate-400 font-normal lowercase">(opsional)</span>
                  </label>

                  <input
                    v-if="['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'DATE'].includes(field.inputType)"
                    :type="field.inputType === 'PHONE' ? 'tel' : (field.inputType === 'DATE' ? 'date' : (field.inputType === 'NUMBER' ? 'number' : 'text'))"
                    v-model="dynamicAnswers[field.id]"
                    class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    :placeholder="field.placeholder || ''"
                  />

                  <textarea
                    v-else-if="field.inputType === 'TEXTAREA'"
                    v-model="dynamicAnswers[field.id]"
                    rows="3"
                    class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    :placeholder="field.placeholder || ''"
                  ></textarea>

                  <select
                    v-else-if="field.inputType === 'SELECT'"
                    v-model="dynamicAnswers[field.id]"
                    class="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">{{ field.placeholder || 'Pilih salah satu...' }}</option>
                    <option v-for="opt in field.options" :key="opt.id" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>

                  <div v-else-if="field.inputType === 'RADIO'" class="flex flex-col gap-2 mt-1">
                    <label v-for="opt in field.options" :key="opt.id" class="inline-flex items-center text-sm text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        :name="'dynamic-field-' + field.id"
                        :value="opt.value"
                        v-model="dynamicAnswers[field.id]"
                        class="text-blue-600 border-slate-300"
                      />
                      <span class="ml-2">{{ opt.label }}</span>
                    </label>
                  </div>

                  <div v-else-if="field.inputType === 'CHECKBOX'" class="flex flex-col gap-2 mt-1">
                    <label v-for="opt in field.options" :key="opt.id" class="inline-flex items-center text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        :value="opt.value"
                        v-model="dynamicAnswers[field.id]"
                        class="text-blue-600 border-slate-300 rounded"
                      />
                      <span class="ml-2">{{ opt.label }}</span>
                    </label>
                  </div>

                  <div v-if="field.helpText" class="text-xs text-slate-400 mt-1">
                    {{ field.helpText }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <router-link
            :to="`/admin/pendaftar/${applicantId}`"
            class="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Batal
          </router-link>
          <button
            type="button"
            @click="handleSave"
            :disabled="submitting"
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
