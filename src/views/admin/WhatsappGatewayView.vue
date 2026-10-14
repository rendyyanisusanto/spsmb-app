<script setup>
import { ref, computed, onMounted } from 'vue'
import gowaService from '@/services/gowaService'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseConfirmModal from '@/components/ui/BaseConfirmModal.vue'

// State
const loadingStatus = ref(false)
const sendingMessage = ref(false)
const lastCheckedAt = ref(null)

const statusData = ref(null)
const statusError = ref(null)

// Test Message Form
const destinationPhone = ref('')
const testMessageContent = ref(
  `[UJI COBA SPSMB SMK IT ASY-SYADZILI]\n` +
  `Halo! Ini adalah pesan pengujian dari sistem SPSMB Terpadu SMK IT Asy-Syadzili melalui WhatsApp Gateway GOWA v9.\n\n` +
  `Waktu: ${new Date().toLocaleString('id-ID')}\n` +
  `Status: WhatsApp Gateway Siap Digunakan.`
)

// Modal Confirmation
const showConfirmModal = ref(false)

// Alert Notification
const notification = ref(null) // { type: 'success' | 'danger' | 'warning', title: '', message: '', details: null }

// Fetch Connection Status
const fetchConnectionStatus = async () => {
  loadingStatus.value = true
  statusError.value = null
  try {
    const res = await gowaService.getStatus()
    if (res && res.data) {
      statusData.value = res.data
      lastCheckedAt.value = new Date()
    } else {
      statusError.value = res?.message || 'Gagal mengambil status koneksi GOWA.'
    }
  } catch (err) {
    statusError.value = err.message || 'Tidak dapat terhubung ke backend SPSMB.'
  } finally {
    loadingStatus.value = false
  }
}

// Prefill default message
const resetDefaultMessage = () => {
  testMessageContent.value = 
    `[UJI COBA SPSMB SMK IT ASY-SYADZILI]\n` +
    `Halo! Ini adalah pesan pengujian dari sistem SPSMB Terpadu SMK IT Asy-Syadzili melalui WhatsApp Gateway GOWA v9.\n\n` +
    `Waktu: ${new Date().toLocaleString('id-ID')}\n` +
    `Status: WhatsApp Gateway Siap Digunakan.`
}

// Prefill bot's own number if available
const fillOwnNumber = () => {
  if (statusData.value?.whatsapp?.phoneNumber) {
    destinationPhone.value = statusData.value.whatsapp.phoneNumber
  }
}

// Format Phone Display Helper
const formatPhoneNumber = (phone) => {
  if (!phone) return '-'
  const clean = phone.replace(/[^\d]/g, '')
  if (clean.startsWith('62') && clean.length > 8) {
    return `+62 ${clean.substring(2, 5)}-${clean.substring(5, 9)}-${clean.substring(9)}`
  }
  return phone
}

// Validation before opening confirmation modal
const handlePrepareSend = () => {
  notification.value = null

  if (!destinationPhone.value || destinationPhone.value.trim() === '') {
    notification.value = {
      type: 'warning',
      title: 'Nomor Tujuan Diperlukan',
      message: 'Silakan masukkan nomor WhatsApp tujuan pengujian.'
    }
    return
  }

  if (!testMessageContent.value || testMessageContent.value.trim() === '') {
    notification.value = {
      type: 'warning',
      title: 'Isi Pesan Diperlukan',
      message: 'Silakan ketik isi pesan WhatsApp yang akan dikirim.'
    }
    return
  }

  showConfirmModal.value = true
}

// Execute Sending
const handleConfirmSend = async () => {
  showConfirmModal.value = false
  sendingMessage.value = true
  notification.value = null

  try {
    const res = await gowaService.sendTestMessage({
      phone: destinationPhone.value.trim(),
      message: testMessageContent.value.trim()
    })

    if (res && res.success) {
      notification.value = {
        type: 'success',
        title: 'Pesan Uji Coba Berhasil Dikirim!',
        message: `Pesan telah berhasil dikirim ke ${res.data?.recipient || destinationPhone.value}.`,
        details: res.data
      }
    } else {
      notification.value = {
        type: 'danger',
        title: 'Pengiriman Gagal',
        message: res?.message || 'Server GOWA menolak pengiriman pesan.',
        details: res?.errors || null
      }
    }
  } catch (err) {
    notification.value = {
      type: 'danger',
      title: 'Gagal Mengirim Pesan Uji Coba',
      message: err.message || 'Terjadi kesalahan jaringan atau server saat mengirim pesan.',
      details: err.errors || null
    }
  } finally {
    sendingMessage.value = false
  }
}

// Status Computeds
const isServerOnline = computed(() => Boolean(statusData.value?.server?.isHealthy))
const isWaConnected = computed(() => Boolean(statusData.value?.whatsapp?.isConnected))
const isWaLoggedIn = computed(() => Boolean(statusData.value?.whatsapp?.isLoggedIn))

onMounted(() => {
  fetchConnectionStatus()
})
</script>

<template>
  <div class="whatsapp-gateway-view pb-20 max-w-7xl mx-auto space-y-6">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl md:text-2xl font-bold text-slate-800 m-0">WhatsApp Gateway (GOWA v9)</h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              v9 API
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1 mb-0">
            Integrasi gateway WhatsApp terpadu untuk pengiriman notifikasi dan pesan resmi SPSMB.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="fetchConnectionStatus"
          :disabled="loadingStatus"
          class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
        >
          <svg
            :class="{ 'animate-spin': loadingStatus }"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 21h5v-5"/>
          </svg>
          {{ loadingStatus ? 'Memeriksa...' : 'Periksa Koneksi' }}
        </button>
      </div>
    </div>

    <!-- Error Banner if status fetch fails -->
    <div v-if="statusError" class="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div>
        <h4 class="font-bold text-sm mb-1">Gagal Menghubungi Gateway GOWA</h4>
        <p class="text-sm m-0">{{ statusError }}</p>
      </div>
    </div>

    <!-- Status Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- Card 1: GOWA Server Status -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Server GOWA</span>
            <span 
              :class="isServerOnline ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'"
              class="px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5"
            >
              <span class="w-2 h-2 rounded-full" :class="isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'"></span>
              {{ isServerOnline ? 'AKTIF / ONLINE' : 'TIDAK TERJANGKAU' }}
            </span>
          </div>

          <div class="space-y-3">
            <div>
              <div class="text-xs text-slate-500 font-semibold mb-0.5">URL Server Gateway</div>
              <div class="font-mono text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 truncate" :title="statusData?.server?.url || 'https://wa.simsmk.sch.id'">
                {{ statusData?.server?.url || 'https://wa.simsmk.sch.id' }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span class="text-slate-400 block mb-0.5">Versi Engine</span>
                <span class="font-bold text-slate-700 font-mono">{{ statusData?.server?.version || 'v9.x' }}</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span class="text-slate-400 block mb-0.5">Latensi Respons</span>
                <span class="font-bold text-slate-700 font-mono">{{ statusData?.server?.latencyMs ? `${statusData.server.latencyMs} ms` : '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Autentikasi: Basic Auth (.env)</span>
          <span>Probe: /health</span>
        </div>
      </div>

      <!-- Card 2: WhatsApp Engine Connection -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Koneksi WhatsApp</span>
            <span 
              :class="isWaConnected ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'"
              class="px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5"
            >
              <span class="w-2 h-2 rounded-full" :class="isWaConnected ? 'bg-emerald-500' : 'bg-yellow-500'"></span>
              {{ isWaConnected ? 'TERHUBUNG (CONNECTED)' : 'TERPUTUS' }}
            </span>
          </div>

          <div class="space-y-3">
            <div>
              <div class="text-xs text-slate-500 font-semibold mb-0.5">Device ID (Multi-Device)</div>
              <div class="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 truncate" :title="statusData?.whatsapp?.deviceId || 'Default'">
                {{ statusData?.whatsapp?.deviceId || '(Menggunakan Default Device)' }}
              </div>
            </div>

            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
              <span class="text-slate-500 block mb-1">Status Sesi Multi-Device:</span>
              <p class="text-slate-700 font-medium m-0 leading-relaxed">
                {{ isWaConnected ? 'Koneksi soket ke server WhatsApp aktif dan berjalan normal.' : 'Koneksi ke server WhatsApp belum terbentuk.' }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Mode: Multi-Device (MD)</span>
          <span>Header: X-Device-Id</span>
        </div>
      </div>

      <!-- Card 3: WhatsApp Login Status -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Status Login Akun</span>
            <span 
              :class="isWaLoggedIn ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'"
              class="px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5"
            >
              <span class="w-2 h-2 rounded-full" :class="isWaLoggedIn ? 'bg-emerald-500' : 'bg-red-500'"></span>
              {{ isWaLoggedIn ? 'SUDAH LOGIN' : 'BELUM LOGIN' }}
            </span>
          </div>

          <div class="space-y-3">
            <div>
              <div class="text-xs text-slate-500 font-semibold mb-0.5">Nomor Akun WhatsApp Terhubung</div>
              <div class="font-mono text-sm font-bold text-emerald-700 bg-emerald-50/60 px-3 py-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                <span>{{ formatPhoneNumber(statusData?.whatsapp?.phoneNumber) }}</span>
                <span v-if="statusData?.whatsapp?.phoneNumber" class="text-[10px] bg-emerald-200/70 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">Aktif</span>
              </div>
            </div>

            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
              <span class="text-slate-400 block mb-0.5">WhatsApp JID</span>
              <span class="font-mono text-slate-600 truncate block text-[11px]" :title="statusData?.whatsapp?.jid || '-'">
                {{ statusData?.whatsapp?.jid || '-' }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Status: Terlindungi (Protected)</span>
          <span v-if="lastCheckedAt">Diperiksa: {{ lastCheckedAt.toLocaleTimeString('id-ID') }}</span>
        </div>
      </div>

    </div>

    <!-- Notification Alert Section -->
    <div v-if="notification" class="transition-all">
      <BaseAlert :variant="notification.type" :title="notification.title">
        <p class="m-0 mb-2 font-medium">{{ notification.message }}</p>
        <div v-if="notification.details" class="mt-2 pt-2 border-t border-current/20 font-mono text-xs opacity-90 space-y-1">
          <div v-if="notification.details.messageId">
            <span class="font-bold">Message ID:</span> {{ notification.details.messageId }}
          </div>
          <div v-if="notification.details.recipient">
            <span class="font-bold">Nomor Tujuan:</span> {{ notification.details.recipient }}
          </div>
          <div v-if="notification.details.status">
            <span class="font-bold">Status Provider:</span> {{ notification.details.status }}
          </div>
        </div>
      </BaseAlert>
    </div>

    <!-- Testing Form Card -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-600"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Uji Coba Pengiriman Pesan WhatsApp
          </h2>
          <p class="text-xs text-slate-500 m-0">
            Kirimkan pesan uji coba langsung melalui GOWA v9 untuk memvalidasi fungsi pengiriman backend.
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            v-if="statusData?.whatsapp?.phoneNumber"
            type="button"
            @click="fillOwnNumber"
            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Kirim ke Nomor Bot
          </button>
          <button
            type="button"
            @click="resetDefaultMessage"
            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Reset Template
          </button>
        </div>
      </div>

      <div class="p-6 md:p-8 space-y-6">
        
        <!-- Warning Notice -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div class="text-xs text-amber-800 leading-relaxed">
            <span class="font-bold block mb-0.5">Perhatian Penting:</span>
            Pesan uji coba akan dikirim secara langsung melalui server WhatsApp resmi. Pastikan nomor tujuan yang dimasukkan adalah nomor WhatsApp aktif milik panitia pengujian dan konfirmasi pengiriman sebelum melanjutkan.
          </div>
        </div>

        <form @submit.prevent="handlePrepareSend" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Phone Number Input -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Nomor WhatsApp Tujuan <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-sm">
                  🇮🇩 +62
                </div>
                <input
                  type="text"
                  v-model="destinationPhone"
                  placeholder="81234567890 atau 081234567890"
                  class="w-full pl-20 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 transition-colors"
                  :disabled="sendingMessage"
                  required
                />
              </div>
              <p class="text-[11px] text-slate-500 mt-1.5 mb-0">
                Format otomatis dinormalisasi ke standar internasional (contoh: 081234567890 diubah menjadi 6281234567890).
              </p>
            </div>

            <!-- WhatsApp Account Info Box -->
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Pengirim Pesan (Sender)</span>
                <div class="text-sm font-bold text-slate-800">
                  {{ isWaLoggedIn ? `Akun WhatsApp SMK IT Asy-Syadzili (${formatPhoneNumber(statusData?.whatsapp?.phoneNumber)})` : 'WhatsApp Belum Terhubung' }}
                </div>
                <p class="text-xs text-slate-500 mt-1 mb-0">
                  Semua pesan dikirim melalui sesi WhatsApp server GOWA yang aktif.
                </p>
              </div>
            </div>

          </div>

          <!-- Message Textarea -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Isi Pesan Uji Coba <span class="text-red-500">*</span>
              </label>
              <span class="text-xs text-slate-400 font-mono">
                {{ testMessageContent.length }} karakter
              </span>
            </div>
            <textarea
              v-model="testMessageContent"
              rows="5"
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 transition-colors"
              placeholder="Tulis pesan uji coba di sini..."
              :disabled="sendingMessage"
              required
            ></textarea>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end pt-2">
            <button
              type="submit"
              :disabled="sendingMessage || !isWaConnected || !isWaLoggedIn"
              class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <svg
                v-if="sendingMessage"
                class="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              {{ sendingMessage ? 'Mengirim Pesan Uji Coba...' : 'Kirim Pesan Uji Coba' }}
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- Security & Architecture Information Card -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Jaminan Keamanan & Konfigurasi Sesi
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span class="font-bold text-slate-800 block mb-1">1. Keamanan Kredensial</span>
          Kredensial Basic Auth disimpan secara terisolasi pada file <code class="bg-white px-1 py-0.5 rounded border border-slate-200">.env</code> backend dan tidak pernah dikirim ke frontend atau dicatat pada log.
        </div>
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span class="font-bold text-slate-800 block mb-1">2. Preservasi Sesi Aktif</span>
          Sesi WhatsApp yang sudah terhubung dipertahankan secara utuh tanpa melakukan scan QR ulang ataupun pemutusan koneksi (disconnect).
        </div>
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span class="font-bold text-slate-800 block mb-1">3. Siap untuk Sprint Notifikasi</span>
          Service backend <code class="bg-white px-1 py-0.5 rounded border border-slate-200">gowaService</code> siap digunakan kembali oleh antrean pengiriman notifikasi pendaftaran otomatis pada sprint berikutnya.
        </div>
      </div>
    </div>

    <!-- Confirmation Modal Before Sending -->
    <BaseConfirmModal
      :open="showConfirmModal"
      title="Konfirmasi Pengiriman Pesan Uji Coba"
      confirmText="Ya, Kirim Pesan"
      cancelText="Batal"
      confirmVariant="primary"
      @close="showConfirmModal = false"
      @confirm="handleConfirmSend"
    >
      <div class="space-y-3 text-sm">
        <p class="m-0">
          Anda akan mengirimkan pesan WhatsApp uji coba ke nomor berikut:
        </p>
        <div class="bg-slate-100 p-3 rounded-xl border border-slate-200 font-mono font-bold text-slate-800">
          {{ destinationPhone }}
        </div>
        <p class="text-xs text-slate-500 m-0">
          Pastikan nomor di atas adalah nomor pengujian milik Anda atau pihak yang berwenang. Jangan mengirimkan pesan ke nomor calon santri/murid nyata saat melakukan pengujian.
        </p>
      </div>
    </BaseConfirmModal>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
</style>
