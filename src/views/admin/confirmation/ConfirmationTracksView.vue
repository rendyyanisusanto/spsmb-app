<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import confirmationService from '@/services/confirmationService'
import * as institutionService from '@/services/institutionService'
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Calendar,
  X,
  Users
} from 'lucide-vue-next'

const { hasRole, user } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))

const loading = ref(false)
const tracks = ref([])
const institutions = ref([])
const selectedInstitution = ref('')

// Modal
const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const form = ref({
  id: null,
  institution_id: '',
  name: '',
  code: '',
  academic_year: '2027/2028',
  description: '',
  start_date: '',
  end_date: '',
  is_active: 1
})

const fetchInstitutions = async () => {
  try {
    const res = await institutionService.getPublicInstitutions()
    if (res && res.data) {
      institutions.value = res.data
      if (!isSuperAdmin.value && user.value?.institutions?.length > 0) {
        selectedInstitution.value = user.value.institutions[0].id
      }
    }
  } catch (err) {
    console.error('Failed to fetch institutions:', err)
  }
}

const fetchTracks = async () => {
  loading.value = true
  try {
    const params = {
      institution_id: selectedInstitution.value || undefined
    }
    const res = await confirmationService.getTracks(params)
    if (res && res.data) {
      tracks.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch tracks:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchInstitutions()
  await fetchTracks()
})

const openAddModal = () => {
  isEditing.value = false
  form.value = {
    id: null,
    institution_id: selectedInstitution.value || (institutions.value[0]?.id || ''),
    name: '',
    code: '',
    academic_year: '2027/2028',
    description: '',
    start_date: '',
    end_date: '',
    is_active: 1
  }
  showModal.value = true
}

const openEditModal = (track) => {
  isEditing.value = true
  form.value = {
    id: track.id,
    institution_id: track.institution_id,
    name: track.name,
    code: track.code || '',
    academic_year: track.academic_year || '2027/2028',
    description: track.description || '',
    start_date: track.start_date ? track.start_date.split('T')[0] : '',
    end_date: track.end_date ? track.end_date.split('T')[0] : '',
    is_active: track.is_active ? 1 : 0
  }
  showModal.value = true
}

const saveTrack = async () => {
  if (!form.value.name.trim()) {
    alert('Nama jalur konfirmasi wajib diisi!')
    return
  }
  if (!form.value.institution_id) {
    alert('Lembaga wajib dipilih!')
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      await confirmationService.updateTrack(form.value.id, form.value)
    } else {
      await confirmationService.createTrack(form.value)
    }
    showModal.value = false
    await fetchTracks()
  } catch (err) {
    alert(err.message || 'Gagal menyimpan jalur konfirmasi.')
  } finally {
    saving.value = false
  }
}

const deleteTrack = async (track) => {
  if (track.total_students > 0) {
    alert('Jalur ini sudah digunakan oleh data penerimaan peserta dan tidak dapat dihapus. Silakan nonaktifkan jalurnya.')
    return
  }

  if (confirm(`Apakah Anda yakin ingin menghapus "${track.name}"?`)) {
    try {
      await confirmationService.deleteTrack(track.id)
      await fetchTracks()
    } catch (err) {
      alert(err.message || 'Gagal menghapus jalur konfirmasi.')
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
          <GraduationCap class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Master Jalur Konfirmasi per Lembaga</h1>
          <p class="text-sm text-slate-500">Kelola jalur penerimaan khusus konfirmasi (misal: Reguler, JOTA JOTI, Prestasi) terpisah dari gelombang pendaftaran.</p>
        </div>
      </div>

      <button
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-all"
      >
        <Plus class="w-4 h-4" />
        Tambah Jalur Konfirmasi
      </button>
    </div>

    <!-- Filter Lembaga if Super Admin -->
    <div v-if="isSuperAdmin" class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
      <Building2 class="w-4 h-4 text-slate-400" />
      <span class="text-xs font-semibold text-slate-600">Filter Lembaga:</span>
      <select
        v-model="selectedInstitution"
        @change="fetchTracks"
        class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <option value="">Semua Lembaga</option>
        <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
          {{ inst.name }} ({{ inst.code }})
        </option>
      </select>
    </div>

    <!-- Track List Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-slate-400">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
        <p class="text-xs">Memuat data jalur konfirmasi...</p>
      </div>

      <div v-else-if="tracks.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4 w-12 text-center">No</th>
              <th class="py-3.5 px-4">Nama Jalur</th>
              <th class="py-3.5 px-4">Kode</th>
              <th class="py-3.5 px-4">Lembaga Pemilik</th>
              <th class="py-3.5 px-4 text-center">Tahun Penerimaan</th>
              <th class="py-3.5 px-4 text-center">Peserta Resmi</th>
              <th class="py-3.5 px-4 text-center">Status</th>
              <th class="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(t, idx) in tracks" :key="t.id" class="hover:bg-slate-50/70 transition-colors">
              <td class="py-3 px-4 text-center text-slate-500 font-medium">{{ idx + 1 }}</td>
              <td class="py-3 px-4">
                <div class="font-bold text-slate-800 text-sm mb-0.5">{{ t.name }}</div>
                <div class="text-[11px] text-slate-500">{{ t.description || 'Tidak ada deskripsi' }}</div>
              </td>
              <td class="py-3 px-4 font-mono font-semibold text-slate-600">{{ t.code || '-' }}</td>
              <td class="py-3 px-4 font-medium text-slate-800">{{ t.institution_name }}</td>
              <td class="py-3 px-4 text-center font-medium text-slate-700">{{ t.academic_year }}</td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                  <Users class="w-3 h-3 text-emerald-600" />
                  {{ t.total_students || 0 }} Siswa
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                  :class="t.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'"
                >
                  {{ t.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    @click="openEditModal(t)"
                    class="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100"
                    title="Edit Jalur"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="deleteTrack(t)"
                    class="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                    title="Hapus Jalur"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center py-16 text-slate-400">
        <GraduationCap class="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h4 class="font-bold text-slate-700 text-sm mb-1">Belum ada jalur konfirmasi</h4>
        <p class="text-xs text-slate-400">Tambahkan jalur konfirmasi khusus untuk lembaga Anda.</p>
      </div>
    </div>

    <!-- MODAL ADD/EDIT TRACK -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-base">
            {{ isEditing ? 'Edit Jalur Konfirmasi' : 'Tambah Jalur Konfirmasi Baru' }}
          </h3>
          <button @click="showModal = false" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <!-- Lembaga Pemilik -->
          <div v-if="isSuperAdmin">
            <label class="block font-semibold text-slate-700 mb-1">Lembaga Pemilik <span class="text-rose-500">*</span></label>
            <select
              v-model="form.institution_id"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">-- Pilih Lembaga --</option>
              <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
                {{ inst.name }} ({{ inst.code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nama Jalur Konfirmasi <span class="text-rose-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Jalur JOTA JOTI, Jalur Reguler"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Kode Jalur</label>
              <input
                v-model="form.code"
                type="text"
                placeholder="Contoh: JOTA-SMK"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tahun Penerimaan</label>
              <input
                v-model="form.academic_year"
                type="text"
                placeholder="2027/2028"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Deskripsi / Keterangan</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Keterangan singkat tentang jalur penerimaan ini..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tanggal Mulai (Opsional)</label>
              <input
                v-model="form.start_date"
                type="date"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tanggal Selesai (Opsional)</label>
              <input
                v-model="form.end_date"
                type="date"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label class="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 pt-1">
              <input
                type="checkbox"
                v-model="form.is_active"
                :true-value="1"
                :false-value="0"
                class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Jalur Aktif (Tersedia untuk Konfirmasi)</span>
            </label>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            @click="showModal = false"
            class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-xs font-medium"
          >
            Batal
          </button>
          <button
            @click="saveTrack"
            :disabled="saving"
            class="px-5 py-2 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
          >
            {{ saving ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Jalur') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
