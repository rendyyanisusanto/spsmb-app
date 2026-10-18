<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as settingService from '@/services/settingService'

const router = useRouter()
const settings = ref(null)

onMounted(async () => {
  try {
    const res = await settingService.getPublicSettings()
    if (res) {
      settings.value = res.data || res
    }
  } catch (err) {
    console.error(err)
  }
})

const nextStep = () => {
  router.push('/pendaftaran')
}
</script>

<template>
  <div class="greenPanel">
    <div class="header">
      <h1 class="mainTitle" v-if="settings">
        {{ settings.general.registrationName }} {{ settings.appearance.headerSubtitle }}
      </h1>
      <h1 class="mainTitle" v-else>Seleksi Penerimaan Santri dan Murid Baru (SPSMB) Asy-Syadzili</h1>
      <div class="logoContainer">
        <img src="/1.png" alt="Logo Asy-Syadzili" width="180" height="180" class="logo" />
      </div>
    </div>
    <!-- Step Indicator -->
    <div class="stepIndicator">
      <div class="step activeStep">
        <span class="stepNumber">1</span>
        <span class="stepLabel">Petunjuk</span>
      </div>
      <div class="stepLine"></div>
      <div class="step">
        <span class="stepNumber">2</span>
        <span class="stepLabel">Pendaftaran Awal</span>
      </div>
    </div>

    <!-- Step 1: Information -->
    <div class="stepContent">
      <div class="infoSection">
        <h3 class="infoTitle">Tata Cara Pendaftaran :</h3>
        <ol class="infoList">
          <li>Isi form pendaftaran awal dengan benar</li>
          <li>Pastikan nomor WA aktif yang bisa dihubungi</li>
          <li>Setelah pendaftaran awal, Anda akan mendapatkan nomor registrasi dan akses link Form Pendaftaran Lengkap</li>
          <li>Lengkapi data dan berkas pada Form Pendaftaran Lengkap</li>
          <li>Apabila terkendala silahkan hubungi admin melalui live chat</li>
        </ol>

        <div class="stepActions">
          <button @click="nextStep" class="nextButton">
            Mulai Pendaftaran Awal &rarr;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
