<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import confirmationService from '@/services/confirmationService'
import * as institutionService from '@/services/institutionService'
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Building2,
  X,
  Tag,
  DollarSign
} from 'lucide-vue-next'

const { hasRole, user } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))

const loading = ref(false)
const feeComponents = ref([])
const institutions = ref([])
const tracks = ref([])
const selectedInstitution = ref('')

// Modal
const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const form = ref({
  id: null,
  institution_id: '',
  confirmation_track_id: '',
  name: '',
  description: '',
  amount: 0,
  is_required: 1,
  is_active: 1,
  order_index: 1
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
  try {
    const res = await confirmationService.getTracks({
      institution_id: selectedInstitution.value || undefined
    })
    if (res && res.data) {
      tracks.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch tracks:', err)
  }
}

const fetchFees = async () => {
  loading.value = true
  try {
    const params = {
      institution_id: selectedInstitution.value || undefined
    }
    const res = await confirmationService.getFeeComponents(params)
    if (res && res.data) {
      feeComponents.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch fee components:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchInstitutions()
  await fetchTracks()
  await fetchFees()
})

const handleInstitutionChange = async () => {
  await fetchTracks()
  await fetchFees()
}

const formatCurrency = (val) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
}

const openAddModal = () => {
  isEditing.value = false
  form.value = {
    id: null,
    institution_id: selectedInstitution.value || (institutions.value[0]?.id || ''),
    confirmation_track_id: '',
    name: '',
    description: '',
    amount: 0,
    is_required: 1,
    is_active: 1,
    order_index: feeComponents.value.length + 1
  }
  showModal.value = true
}

const openEditModal = (comp) => {
  isEditing.value = true
  form.value = {
    id: comp.id,
    institution_id: comp.institution_id,
    confirmation_track_id: comp.confirmation_track_id || '',
    name: comp.name,
    description: comp.description || '',
    amount: comp.amount,
    is_required: comp.is_required ? 1 : 0,
    is_active: comp.is_active ? 1 : 0,
    order_index: comp.order_index
  }
  showModal.value = true
}

const saveFeeComponent = async () => {
  if (!form.value.name.trim()) {
    alert('Nama komponen tagihan wajib diisi!')
    return
  }
  if (!form.value.institution_id) {
    alert('Lembaga wajib dipilih!')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      confirmation_track_id: form.value.confirmation_track_id || null
    }

    if (isEditing.value) {
      await confirmationService.updateFeeComponent(form.value.id, payload)
    } else {
      await confirmationService.createFeeComponent(payload)
    }
    showModal.value = false
    await fetchFees()
  } catch (err) {
    alert(err.message || 'Gagal menyimpan komponen tagihan.')
  } finally {
    saving.value = false
  }
}

const deleteFee = async (comp) => {
  if (confirm(`Apakah Anda yakin ingin menghapus komponen "${comp.name}"?`)) {
    try {
      await confirmationService.deleteFeeComponent(comp.id)
      await fetchFees()
    } catch (err) {
      alert(err.message || 'Gagal menghapus komponen tagihan.')
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
          <CreditCard class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Master Komponen Tagihan per Lembaga</h1>
          <p class="text-sm text-slate-500">Kelola komponen tagihan daftar ulang dan biaya konfirmasi yang dinamis per lembaga dan jalur.</p>
        </div>
      </div>

      <button
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-all"
      >
        <Plus class="w-4 h-4" />
        Tambah Komponen Tagihan
      </button>
    </div>

    <!-- Filter Lembaga if Super Admin -->
    <div v-if="isSuperAdmin" class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
      <Building2 class="w-4 h-4 text-slate-400" />
      <span class="text-xs font-semibold text-slate-600">Filter Lembaga:</span>
      <select
        v-model="selectedInstitution"
        @change="handleInstitutionChange"
        class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <option value="">Semua Lembaga</option>
        <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
          {{ inst.name }} ({{ inst.code }})
        </option>
      </select>
    </div>

    <!-- Fees Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-slate-400">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
        <p class="text-xs">Memuat data komponen biaya...</p>
      </div>

      <div v-else-if="feeComponents.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4 w-12 text-center">Urutan</th>
              <th class="py-3.5 px-4">Nama Komponen Biaya</th>
              <th class="py-3.5 px-4">Lembaga Pemilik</th>
              <th class="py-3.5 px-4">Jalur Khusus</th>
              <th class="py-3.5 px-4 text-center">Sifat Tagihan</th>
              <th class="py-3.5 px-4 text-right">Nominal</th>
              <th class="py-3.5 px-4 text-center">Status</th>
              <th class="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="f in feeComponents" :key="f.id" class="hover:bg-slate-50/70 transition-colors">
              <td class="py-3 px-4 text-center font-bold text-slate-500">{{ f.order_index }}</td>
              <td class="py-3 px-4">
                <div class="font-bold text-slate-800 text-sm mb-0.5">{{ f.name }}</div>
                <div class="text-[11px] text-slate-500">{{ f.description || 'Tidak ada deskripsi' }}</div>
              </td>
              <td class="py-3 px-4 font-medium text-slate-800">{{ f.institution_name }}</td>
              <td class="py-3 px-4">
                <span v-if="f.track_name" class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  {{ f.track_name }}
                </span>
                <span v-else class="text-slate-400 text-[11px] italic">Semua Jalur</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                  :class="f.is_required ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'"
                >
                  {{ f.is_required ? 'Wajib Lunas' : 'Opsional' }}
                </span>
              </td>
              <td class="py-3 px-4 text-right font-mono font-bold text-slate-800 text-sm">
                {{ formatCurrency(f.amount) }}
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                  :class="f.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'"
                >
                  {{ f.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    @click="openEditModal(f)"
                    class="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100"
                    title="Edit Komponen"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="deleteFee(f)"
                    class="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                    title="Hapus Komponen"
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
        <CreditCard class="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h4 class="font-bold text-slate-700 text-sm mb-1">Belum ada komponen tagihan</h4>
        <p class="text-xs text-slate-400">Tambahkan komponen biaya daftar ulang untuk lembaga Anda.</p>
      </div>
    </div>

    <!-- MODAL ADD/EDIT COMPONENT -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-base">
            {{ isEditing ? 'Edit Komponen Tagihan' : 'Tambah Komponen Tagihan Baru' }}
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
            <label class="block font-semibold text-slate-700 mb-1">Jalur Konfirmasi Terkait</label>
            <select
              v-model="form.confirmation_track_id"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Semua Jalur (Berlaku Global di Lembaga ini)</option>
              <option v-for="t in tracks" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nama Komponen Biaya <span class="text-rose-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Daftar Ulang, Seragam Sekolah"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nominal Biaya (Rp) <span class="text-rose-500">*</span></label>
            <input
              v-model.number="form.amount"
              type="number"
              placeholder="Contoh: 500000"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Deskripsi / Rincian</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Rincian peruntukan biaya..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Urutan Tampil</label>
              <input
                v-model.number="form.order_index"
                type="number"
                min="1"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Sifat Tagihan</label>
              <select
                v-model="form.is_required"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option :value="1">Wajib (Harus Lunas)</option>
                <option :value="0">Opsional / Sukarela</option>
              </select>
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
              <span>Komponen Aktif Diberlakukan</span>
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
            @click="saveFeeComponent"
            :disabled="saving"
            class="px-5 py-2 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
          >
            {{ saving ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Komponen') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
