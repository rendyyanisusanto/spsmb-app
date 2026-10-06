<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as settingService from '@/services/settingService'
import * as institutionService from '@/services/institutionService'
import publicRegistrationService from '@/services/publicRegistrationService'

const router = useRouter()
const settings = ref(null)
const loading = ref(true)
const submitting = ref(false)
const errors = ref({})

const lembagaOptions = ref([])
const sumberInfoOptions = ref([])

onMounted(async () => {
  try {
    const [settingRes, instRes, infoRes] = await Promise.all([
      settingService.getPublicSettings(),
      institutionService.getPublicInstitutions(),
      publicRegistrationService.getInformationSources()
    ])
    if (settingRes) settings.value = settingRes.data || settingRes
    if (instRes && instRes.success) {
      lembagaOptions.value = [
        { value: 'NON_FORMAL', label: 'Non Formal', type: 'NON_FORMAL' },
        ...instRes.data
          .filter(i => i.institution_type !== 'PONDOK')
          .map(i => ({ value: i.id, label: i.name, type: i.institution_type }))
      ]
    }
    if (infoRes && infoRes.success) {
      sumberInfoOptions.value = infoRes.data.map(i => ({ value: i.id, label: i.name }))
    }
  } catch (err) {
    console.error(err)
  }
  loading.value = false
})

const form = reactive({
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '',
  whatsapp: '',
  namaOrtu: '',
  alamat: '',
  sekolahAsal: '',
  lembaga: '',
  sumberInfo: '',
  sumberInfoLainnya: ''
})

const submitForm = async () => {
  submitting.value = true
  errors.value = {}
  try {
    let registrationType = 'NON_FORMAL'
    let formalInstitutionId = null

    if (form.lembaga !== 'NON_FORMAL') {
      const selectedLembaga = lembagaOptions.value.find(l => l.value === form.lembaga)
      if (selectedLembaga) {
        registrationType = selectedLembaga.type
        formalInstitutionId = selectedLembaga.value
      }
    }

    const payload = {
      fullName: form.namaLengkap,
      birthPlace: form.tempatLahir,
      birthDate: form.tanggalLahir,
      gender: form.jenisKelamin === 'L' ? 'MALE' : 'FEMALE',
      whatsapp: form.whatsapp,
      parentName: form.namaOrtu,
      address: form.alamat,
      previousSchool: form.sekolahAsal,
      registrationType: registrationType,
      formalInstitutionId: formalInstitutionId,
      informationSourceId: form.sumberInfo,
      informationSourceOther: form.sumberInfoLainnya
    }

    const response = await publicRegistrationService.createInitialApplication(payload)
    if (response.success || response.registrationNumber) { // Depending on axios config, it might be in response.data
      const data = response.data || response;
      localStorage.setItem('spsmb_continue_session', JSON.stringify({
        registrationNumber: data.registrationNumber || data.data?.registrationNumber,
        continueToken: data.continueToken || data.data?.continueToken
      }))
      router.push('/pendaftaran/sukses')
    }
  } catch (error) {
    if (error.response && error.response.status === 422) {
      alert(error.response.data.message || 'Data tidak valid')
    } else {
      alert(error.response?.data?.message || 'Terjadi kesalahan, silakan coba lagi.')
    }
    console.error(error)
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="greenPanel">
    <!-- Step Indicator -->
    <div class="stepIndicator">
      <div class="step completedStep">
        <span class="stepNumber">1</span>
        <span class="stepLabel">Petunjuk</span>
      </div>
      <div class="stepLine"></div>
      <div class="step activeStep">
        <span class="stepNumber">2</span>
        <span class="stepLabel">Pendaftaran</span>
      </div>
    </div>

    <!-- Step 2: Form -->
    <div class="stepContent">
      <div v-if="loading" class="formSection flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A4D2E]"></div>
      </div>
      
      <div v-else-if="settings && !settings.registrationEnabled" class="formSection text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto mb-4 text-amber-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        <h3 class="text-xl font-bold text-slate-800 mb-2">Pendaftaran Ditutup</h3>
        <p class="text-slate-600 mb-6">Pendaftaran SPSMB untuk sementara tidak menerima pendaftaran baru.<br>Silakan hubungi panitia untuk informasi lebih lanjut.</p>
        <button type="button" @click="goBack" class="backButton inline-block mx-auto">
          &larr; Kembali
        </button>
      </div>

      <div v-else class="formSection">
        <h3 class="formTitle">Form Pendaftaran</h3>

        <form @submit.prevent="submitForm" class="form">
          <div class="inputGroup">
            <label for="namaLengkap" class="label">Nama Lengkap <span class="text-red-500">*</span></label>
            <input
              type="text"
              id="namaLengkap"
              v-model="form.namaLengkap"
              required
              class="input"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div class="formRow">
            <div class="inputGroup">
              <label for="tempatLahir" class="label">Tempat Lahir <span class="text-red-500">*</span></label>
              <input
                type="text"
                id="tempatLahir"
                v-model="form.tempatLahir"
                required
                class="input"
                placeholder="Masukkan kota tempat lahir"
              />
            </div>

            <div class="inputGroup">
              <label for="tanggalLahir" class="label">Tanggal Lahir <span class="text-red-500">*</span></label>
              <input
                type="date"
                id="tanggalLahir"
                v-model="form.tanggalLahir"
                required
                class="input"
              />
            </div>
          </div>

          <div class="formRow">
            <div class="inputGroup">
              <label for="jenisKelamin" class="label">Jenis Kelamin <span class="text-red-500">*</span></label>
              <select
                id="jenisKelamin"
                v-model="form.jenisKelamin"
                required
                class="select"
              >
                <option value="">Pilih jenis kelamin</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            
            <div class="inputGroup">
              <label for="whatsapp" class="label">
                No. WhatsApp <span class="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="whatsapp"
                v-model="form.whatsapp"
                required
                class="input"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <div class="inputGroup">
            <label for="namaOrtu" class="label">Nama Orang Tua/Wali <span class="text-red-500">*</span></label>
            <input
              type="text"
              id="namaOrtu"
              v-model="form.namaOrtu"
              required
              class="input"
              placeholder="Nama Ayah/Ibu"
            />
          </div>

          <div class="inputGroup">
            <label for="alamat" class="label">Alamat Lengkap <span class="text-red-500">*</span></label>
            <textarea
              id="alamat"
              v-model="form.alamat"
              required
              class="textarea"
              placeholder="Alamat lengkap dengan RT/RW, Kelurahan, Kecamatan, Kota"
              rows="3"
            />
          </div>

          <div class="inputGroup">
            <label for="sekolahAsal" class="label">Sekolah Asal <span class="text-red-500">*</span></label>
            <input
              type="text"
              id="sekolahAsal"
              v-model="form.sekolahAsal"
              required
              class="input"
              placeholder="Nama sekolah asal"
            />
          </div>

          <div class="inputGroup">
            <label for="lembaga" class="label">Lembaga Pendidikan yang dipilih <span class="text-red-500">*</span></label>
            <select
              id="lembaga"
              v-model="form.lembaga"
              required
              class="select"
            >
              <option value="">Pilih lembaga pendidikan</option>
              <option v-for="opt in lembagaOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="inputGroup">
            <label for="sumberInfo" class="label">Dari mana Anda mengetahui SPSMB Asy-Syadzili? <span class="text-red-500">*</span></label>
            <select
              id="sumberInfo"
              v-model="form.sumberInfo"
              required
              class="select"
            >
              <option value="">Pilih sumber informasi</option>
              <option v-for="opt in sumberInfoOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="inputGroup" v-if="sumberInfoOptions.find(o => o.value === form.sumberInfo)?.label.toLowerCase() === 'lainnya'">
            <label for="sumberInfoLainnya" class="label">Sumber Informasi Lainnya <span class="text-red-500">*</span></label>
            <input
              type="text"
              id="sumberInfoLainnya"
              v-model="form.sumberInfoLainnya"
              required
              class="input"
              placeholder="Tuliskan sumber informasi"
            />
          </div>

          <div class="stepActions">
            <button type="button" @click="goBack" class="backButton" :disabled="submitting">
              &larr; Kembali
            </button>
            <button type="submit" class="submitButton" :disabled="submitting">
              {{ submitting ? 'Memproses...' : 'Daftar Sekarang' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
