<script setup>
import BaseCard from '@/components/ui/BaseCard.vue'
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p class="text-sm text-slate-500 mt-1">SPSMB Management Area Placeholder</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <BaseCard class="bg-gradient-to-br from-emerald-500 to-emerald-600 border-none">
        <div class="text-white">
          <h3 class="text-emerald-100 font-medium text-sm">Total Pendaftar</h3>
          <p class="text-3xl font-bold mt-2">1,204</p>
        </div>
      </BaseCard>
      <BaseCard class="bg-gradient-to-br from-blue-500 to-blue-600 border-none">
        <div class="text-white">
          <h3 class="text-blue-100 font-medium text-sm">Sudah Verifikasi</h3>
          <p class="text-3xl font-bold mt-2">856</p>
        </div>
      </BaseCard>
      <BaseCard class="bg-gradient-to-br from-purple-500 to-purple-600 border-none">
        <div class="text-white">
          <h3 class="text-purple-100 font-medium text-sm">Lembaga Aktif</h3>
          <p class="text-3xl font-bold mt-2">12</p>
        </div>
      </BaseCard>
    </div>

    <BaseCard>
      <template #header>
        <h3 class="text-lg font-medium text-slate-900">Welcome to Admin Panel</h3>
      </template>
      <p class="text-slate-600 text-sm leading-relaxed">
        Ini adalah tampilan awal untuk area manajemen SPSMB. Di sini akan terdapat grafik pendaftaran, 
        tabel pendaftar terbaru, dan aksi cepat untuk admin lembaga maupun super admin. 
        Tampilan ini sudah responsif, Anda bisa mengecilkan layar atau membukanya di smartphone untuk melihat sidebar berubah menjadi drawer.
      </p>
    </BaseCard>
  </div>
</template>
