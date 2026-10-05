<script setup>
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseRadio from '@/components/ui/BaseRadio.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const textValue = ref('')
const selectValue = ref('')
const textareaValue = ref('')
const radioValue = ref('formal')
const checkboxValue = ref(false)
const modalOpen = ref(false)

const selectOptions = [
  { label: 'Pondok Pesantren', value: 'pondok' },
  { label: 'Madrasah Diniyah', value: 'madin' },
  { label: 'Sekolah Formal', value: 'formal' }
]
</script>

<template>
  <div class="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-slate-900 tracking-tight">SPSMB Public Area</h1>
      <p class="mt-2 text-lg text-slate-500">UI Components Demo</p>
    </div>

    <!-- Buttons -->
    <section>
      <h2 class="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-6">Buttons</h2>
      <div class="flex flex-wrap gap-4 items-end">
        <BaseButton variant="primary" size="md">Primary</BaseButton>
        <BaseButton variant="secondary" size="md">Secondary</BaseButton>
        <BaseButton variant="outline" size="md">Outline</BaseButton>
        <BaseButton variant="danger" size="md">Danger</BaseButton>
        <BaseButton variant="primary" size="sm">Small</BaseButton>
        <BaseButton variant="primary" size="lg">Large</BaseButton>
        <BaseButton variant="primary" disabled>Disabled</BaseButton>
        <BaseButton variant="primary" loading>Loading</BaseButton>
      </div>
    </section>

    <!-- Inputs -->
    <section>
      <h2 class="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-6">Form Inputs</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BaseInput v-model="textValue" label="Nama Lengkap" placeholder="Masukkan nama lengkap" required helperText="Gunakan nama sesuai ijazah." />
        <BaseInput label="Error Input" placeholder="Contoh error" error="Field ini wajib diisi." />
        
        <BaseSelect v-model="selectValue" label="Pilih Jenjang" :options="selectOptions" required />
        <BaseSelect label="Disabled Select" :options="selectOptions" disabled />

        <div class="md:col-span-2">
          <BaseTextarea v-model="textareaValue" label="Alamat Lengkap" placeholder="Masukkan alamat lengkap" required />
        </div>

        <div class="space-y-3">
          <label class="text-sm font-medium text-slate-700">Tipe Pendaftaran</label>
          <div class="space-y-2">
            <BaseRadio v-model="radioValue" value="formal" label="Formal + Pondok" />
            <BaseRadio v-model="radioValue" value="nonformal" label="Non Formal / Pondok Saja" />
            <BaseRadio v-model="radioValue" value="disabled" label="Disabled Option" disabled />
          </div>
        </div>

        <div class="space-y-3">
          <label class="text-sm font-medium text-slate-700">Persyaratan</label>
          <div class="space-y-2">
            <BaseCheckbox v-model="checkboxValue" label="Saya menyetujui syarat dan ketentuan" />
            <BaseCheckbox :modelValue="true" label="Disabled Checked" disabled />
          </div>
        </div>
      </div>
    </section>

    <!-- Status & Feedback -->
    <section>
      <h2 class="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-6">Status & Feedback</h2>
      
      <div class="space-y-6">
        <div class="flex flex-wrap gap-3">
          <BaseBadge variant="default">Default</BaseBadge>
          <BaseBadge variant="success">Success</BaseBadge>
          <BaseBadge variant="warning">Warning</BaseBadge>
          <BaseBadge variant="danger">Danger</BaseBadge>
          <BaseBadge variant="info">Info</BaseBadge>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BaseAlert variant="info" title="Informasi Pendaftaran">
            Pendaftaran gelombang 1 akan ditutup pada tanggal 30 Oktober 2026.
          </BaseAlert>
          <BaseAlert variant="success" title="Pembayaran Berhasil">
            Terima kasih, pembayaran pendaftaran Anda telah kami terima.
          </BaseAlert>
          <BaseAlert variant="warning" title="Perhatian">
            Mohon lengkapi berkas pendaftaran sebelum waktu verifikasi berakhir.
          </BaseAlert>
          <BaseAlert variant="danger" title="Gagal Upload">
            Ukuran file maksimal adalah 2MB. Silakan kompresi file Anda.
          </BaseAlert>
        </div>
      </div>
    </section>

    <!-- Card & Modal -->
    <section>
      <h2 class="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-6">Containers</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BaseCard>
          <template #header>
            <h3 class="text-lg font-medium text-slate-900">Card Sederhana</h3>
          </template>
          <p class="text-slate-600 text-sm leading-relaxed">
            Ini adalah contoh komponen BaseCard. Digunakan untuk mengelompokkan informasi agar lebih rapi dan memiliki batas yang jelas.
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <BaseButton variant="outline" size="sm">Batal</BaseButton>
              <BaseButton variant="primary" size="sm">Simpan</BaseButton>
            </div>
          </template>
        </BaseCard>

        <div class="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50">
          <BaseButton variant="primary" @click="modalOpen = true">Buka Modal Dialog</BaseButton>
        </div>
      </div>
    </section>

    <!-- Modal Implementation -->
    <BaseModal :open="modalOpen" title="Konfirmasi Pendaftaran" @close="modalOpen = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-600 leading-relaxed">
          Apakah Anda yakin data yang dimasukkan sudah benar? Data yang sudah disubmit tidak dapat diubah kembali.
        </p>
        <BaseAlert variant="warning">
          Pastikan NIK dan Nama sesuai dengan Kartu Keluarga.
        </BaseAlert>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="outline" @click="modalOpen = false">Cek Kembali</BaseButton>
          <BaseButton variant="primary" @click="modalOpen = false">Ya, Submit Data</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
