<script setup>
import { ref, onMounted } from 'vue'
import * as settingService from '@/services/settingService'
import { logAudit } from '@/utils/auditLogger'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseErrorState from '@/components/ui/BaseErrorState.vue'

const loading = ref(true)
const saving = ref(false)
const error = ref(false)
const settings = ref(null)

const activeTab = ref('general')

const tabs = [
  { id: 'general', label: 'Umum' },
  { id: 'registration', label: 'Pendaftaran' },
  { id: 'contact', label: 'Kontak' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'appearance', label: 'Tampilan' }
]

const fetchSettings = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await settingService.getSettings()
    if (res) {
      settings.value = res.data || res
    } else {
      error.value = true
    }
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchSettings)

const saveSettings = async () => {
  saving.value = true
  try {
    await settingService.updateSettings(settings.value)
    
    // Log audit
    logAudit({
      action: 'UPDATE',
      module: 'SETTING',
      targetType: 'SYSTEM_SETTINGS',
      targetId: 'GLOBAL',
      targetName: 'Pengaturan Sistem',
      description: 'Memperbarui pengaturan sistem global'
    })
    
    // Show success feedback
    alert('Pengaturan berhasil disimpan.')
  } catch (e) {
    alert('Terjadi kesalahan saat menyimpan pengaturan.')
  } finally {
    saving.value = false
  }
}

const logoPreview = ref(null)
const handleLogoUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    logoPreview.value = URL.createObjectURL(file)
  }
}
</script>

<template>
  <div class="settings-view pb-20">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 mb-1">Pengaturan Sistem</h1>
        <p class="text-slate-500 m-0">Konfigurasi global untuk aplikasi SPSMB.</p>
      </div>
      <button @click="saveSettings" :disabled="loading || saving || error" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
        <svg v-if="saving" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
      </button>
    </div>

    <!-- Error State -->
    <BaseErrorState 
      v-if="error" 
      message="Terjadi kesalahan saat memuat pengaturan." 
      @retry="fetchSettings" 
      class="mb-6"
    />

    <template v-else-if="!loading && settings">
      <div class="flex flex-col lg:flex-row gap-6">
        
        <!-- Sidebar Tabs -->
        <div class="w-full lg:w-64 shrink-0">
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col sticky top-24">
            <button 
              v-for="tab in tabs" 
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-5 py-3.5 text-left text-sm font-bold transition-colors border-b border-slate-100 last:border-0"
              :class="activeTab === tab.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Form Content -->
        <div class="flex-grow">
          <div class="bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden min-h-[500px]">
            
            <!-- GENERAL SETTINGS -->
            <div v-show="activeTab === 'general'" class="p-6 md:p-8 space-y-6">
              <h2 class="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">Pengaturan Umum</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nama Sistem</label>
                  <input type="text" v-model="settings.general.systemName" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nama SPSMB (Event)</label>
                  <input type="text" v-model="settings.general.registrationName" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Tahun Pelajaran Aktif</label>
                  <input type="text" v-model="settings.general.academicYear" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800" placeholder="Contoh: 2027/2028">
                </div>
              </div>

              <div class="pt-6 border-t border-slate-100">
                <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Logo Sistem</label>
                <div class="flex items-center gap-6">
                  <div class="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                    <img v-if="logoPreview" :src="logoPreview" class="w-full h-full object-contain">
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  </div>
                  <div>
                    <input type="file" id="logoUpload" class="hidden" accept="image/*" @change="handleLogoUpload">
                    <label for="logoUpload" class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold shadow-sm cursor-pointer hover:bg-slate-50 transition-colors inline-block mb-2">Pilih File Logo</label>
                    <p class="text-xs text-slate-500 m-0">Format: PNG, JPG (Maks. 2MB). Disarankan berlatar belakang transparan.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- REGISTRATION SETTINGS -->
            <div v-show="activeTab === 'registration'" class="p-6 md:p-8 space-y-6">
              <h2 class="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">Pengaturan Pendaftaran</h2>
              
              <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-slate-800 text-sm mb-1">Status Pendaftaran Sistem</h3>
                  <p class="text-xs text-slate-500 m-0">Jika dinonaktifkan, calon pendaftar tidak dapat mengisi form pendaftaran baru.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="settings.registration.enabled" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span class="ml-3 text-sm font-bold" :class="settings.registration.enabled ? 'text-emerald-600' : 'text-slate-500'">{{ settings.registration.enabled ? 'DIBUKA' : 'DITUTUP' }}</span>
                </label>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Izinkan Edit Setelah Submit</label>
                  <select v-model="settings.registration.allowEditAfterSubmit" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                    <option :value="true">Ya, Pendaftar Boleh Edit</option>
                    <option :value="false">Tidak (Hanya admin/verifikator)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nomor Pendaftaran Prefix</label>
                  <input type="text" v-model="settings.registration.registrationPrefix" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800" placeholder="Contoh: SPSMB">
                </div>
              </div>
            </div>

            <!-- CONTACT SETTINGS -->
            <div v-show="activeTab === 'contact'" class="p-6 md:p-8 space-y-6">
              <h2 class="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">Pengaturan Kontak & Pelayanan</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nomor WhatsApp Panitia</label>
                  <input type="text" v-model="settings.contact.whatsapp" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Email</label>
                  <input type="email" v-model="settings.contact.email" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Jam Pelayanan</label>
                  <input type="text" v-model="settings.contact.serviceHours" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800" placeholder="Contoh: Senin - Sabtu, 08.00 - 16.00 WIB">
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Alamat Lengkap</label>
                  <textarea v-model="settings.contact.address" rows="3" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800"></textarea>
                </div>
              </div>
            </div>

            <!-- WHATSAPP SETTINGS -->
            <div v-show="activeTab === 'whatsapp'" class="p-6 md:p-8 space-y-6">
              <h2 class="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">Integrasi WhatsApp</h2>
              
              <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <div class="text-sm text-blue-800">
                  <p class="font-bold mb-1">Informasi Konfigurasi</p>
                  <p class="opacity-90 m-0">Pengaturan credential WhatsApp API sesungguhnya akan dikonfigurasi melalui Backend (Server) untuk keamanan. Di sini Anda hanya mengatur preferensi frontend/UI.</p>
                </div>
              </div>

              <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-center justify-between mb-6">
                <div>
                  <h3 class="font-bold text-slate-800 text-sm mb-1">Aktifkan Notifikasi WhatsApp</h3>
                  <p class="text-xs text-slate-500 m-0">Kirim notifikasi otomatis ke pendaftar saat terjadi perubahan status.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="settings.whatsapp.enabled" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6" :class="{ 'opacity-50 pointer-events-none': !settings.whatsapp.enabled }">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nama Pengirim / Label API</label>
                  <input type="text" v-model="settings.whatsapp.senderName" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nomor WhatsApp Default Sender</label>
                  <input type="text" v-model="settings.whatsapp.adminNumber" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
              </div>
            </div>

            <!-- APPEARANCE SETTINGS -->
            <div v-show="activeTab === 'appearance'" class="p-6 md:p-8 space-y-6">
              <h2 class="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">Tampilan Portal (Public)</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Judul Header Portal</label>
                  <input type="text" v-model="settings.appearance.headerTitle" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Subjudul Header</label>
                  <input type="text" v-model="settings.appearance.headerSubtitle" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <h3 class="font-bold text-slate-800 text-sm mb-1">Tampilkan Logo di Header</h3>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="settings.appearance.showLogo" class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                  </label>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <h3 class="font-bold text-slate-800 text-sm mb-1">Tampilkan Tahun Pelajaran</h3>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="settings.appearance.showAcademicYear" class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Pesan Footer Khusus</label>
                <textarea v-model="settings.appearance.footerMessage" rows="2" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-slate-800 font-semibold text-slate-800"></textarea>
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </template>
    
    <!-- Initial Loading State -->
    <div v-if="loading && !error" class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex justify-center">
      <BaseLoading text="Memuat konfigurasi sistem..." class="py-12" />
    </div>

  </div>
</template>
