<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import faqService from '@/services/faqService'
import * as institutionService from '@/services/institutionService'
import {
  HelpCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  Tag,
  Building2,
  Globe,
  X
} from 'lucide-vue-next'

const { hasRole, user } = useAuth()
const isSuperAdmin = computed(() => hasRole('SUPER_ADMIN'))

const loading = ref(false)
const faqs = ref([])
const institutions = ref([])
const searchQuery = ref('')
const selectedCategory = ref('ALL')
const selectedScope = ref('ALL')
const selectedInstitutionId = ref('')
const expandedFaqId = ref(null)

const categories = [
  { id: 'ALL', label: 'Semua Kategori' },
  { id: 'PENDAFTARAN', label: 'Pendaftaran' },
  { id: 'PERSYARATAN', label: 'Persyaratan' },
  { id: 'BIAYA', label: 'Biaya' },
  { id: 'UMUM', label: 'Umum' }
]

// Modal State
const isModalOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const modalForm = ref({
  id: null,
  scope: 'GLOBAL',
  institution_id: '',
  question: '',
  answer: '',
  category: 'UMUM',
  order_index: 1,
  is_active: 1
})

const fetchFaqs = async () => {
  loading.value = true
  try {
    const params = {}
    if (selectedScope.value !== 'ALL') {
      params.scope = selectedScope.value
    }
    if (selectedInstitutionId.value) {
      params.institution_id = selectedInstitutionId.value
    }
    const res = await faqService.getFaqs(params)
    if (res && res.data) {
      faqs.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch FAQs:', err)
  } finally {
    loading.value = false
  }
}

const fetchInstitutions = async () => {
  try {
    const res = await institutionService.getPublicInstitutions()
    if (res && res.data) {
      institutions.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch institutions:', err)
  }
}

onMounted(() => {
  fetchInstitutions()
  fetchFaqs()
})

// Filtered FAQs
const filteredFaqs = computed(() => {
  return faqs.value.filter(faq => {
    const matchCategory = selectedCategory.value === 'ALL' || faq.category === selectedCategory.value
    const matchQuery = !searchQuery.value.trim() || 
      faq.question.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchCategory && matchQuery
  }).sort((a, b) => a.order_index - b.order_index)
})

const toggleFaq = (id) => {
  expandedFaqId.value = expandedFaqId.value === id ? null : id
}

const openAddModal = () => {
  isEditing.value = false
  const defaultScope = isSuperAdmin.value ? 'GLOBAL' : 'INSTITUTION'
  const defaultInstId = user.value?.institutions?.[0]?.id || (institutions.value[0]?.id || '')
  
  modalForm.value = {
    id: null,
    scope: defaultScope,
    institution_id: defaultScope === 'INSTITUTION' ? defaultInstId : '',
    question: '',
    answer: '',
    category: 'UMUM',
    order_index: faqs.value.length + 1,
    is_active: 1
  }
  isModalOpen.value = true
}

const openEditModal = (faq) => {
  isEditing.value = true
  modalForm.value = {
    id: faq.id,
    scope: faq.scope,
    institution_id: faq.institution_id || '',
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    order_index: faq.order_index,
    is_active: faq.is_active ? 1 : 0
  }
  isModalOpen.value = true
}

const saveFaq = async () => {
  if (!modalForm.value.question?.trim() || !modalForm.value.answer?.trim()) {
    alert('Pertanyaan dan jawaban wajib diisi!')
    return
  }

  if (modalForm.value.scope === 'INSTITUTION' && !modalForm.value.institution_id) {
    alert('Silakan pilih lembaga pemilik FAQ!')
    return
  }

  saving.value = true
  try {
    const payload = {
      scope: modalForm.value.scope,
      institution_id: modalForm.value.scope === 'INSTITUTION' ? modalForm.value.institution_id : null,
      category: modalForm.value.category,
      question: modalForm.value.question.trim(),
      answer: modalForm.value.answer.trim(),
      order_index: modalForm.value.order_index,
      is_active: modalForm.value.is_active ? 1 : 0
    }

    if (isEditing.value) {
      await faqService.updateFaq(modalForm.value.id, payload)
    } else {
      await faqService.createFaq(payload)
    }

    isModalOpen.value = false
    await fetchFaqs()
  } catch (err) {
    alert(err.message || 'Gagal menyimpan FAQ.')
  } finally {
    saving.value = false
  }
}

const deleteFaq = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus FAQ ini?')) {
    try {
      await faqService.deleteFaq(id)
      await fetchFaqs()
    } catch (err) {
      alert(err.message || 'Gagal menghapus FAQ.')
    }
  }
}

const toggleStatus = async (faq) => {
  try {
    await faqService.updateFaq(faq.id, {
      is_active: faq.is_active ? 0 : 1
    })
    faq.is_active = faq.is_active ? 0 : 1
  } catch (err) {
    alert(err.message || 'Gagal mengubah status FAQ.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
          <HelpCircle class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Frequently Asked Questions (FAQ)</h1>
          <p class="text-sm text-slate-500">Kelola FAQ Global dan FAQ khusus lembaga SPSMB Asy-Syadzili.</p>
        </div>
      </div>
      <div>
        <button
          @click="openAddModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus class="w-4 h-4" />
          Tambah FAQ
        </button>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <div class="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        
        <!-- Scope Filter Tabs -->
        <div class="flex items-center gap-2">
          <button
            @click="selectedScope = 'ALL'; fetchFaqs()"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border"
            :class="selectedScope === 'ALL' ? 'bg-[#1A4D2E] text-white border-[#1A4D2E]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
          >
            Semua Scope
          </button>
          <button
            @click="selectedScope = 'GLOBAL'; selectedInstitutionId = ''; fetchFaqs()"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5"
            :class="selectedScope === 'GLOBAL' ? 'bg-[#1A4D2E] text-white border-[#1A4D2E]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
          >
            <Globe class="w-3.5 h-3.5" />
            FAQ Global (/faq)
          </button>
          <button
            @click="selectedScope = 'INSTITUTION'; fetchFaqs()"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5"
            :class="selectedScope === 'INSTITUTION' ? 'bg-[#1A4D2E] text-white border-[#1A4D2E]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
          >
            <Building2 class="w-3.5 h-3.5" />
            FAQ Lembaga
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative min-w-[260px]">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari pertanyaan / jawaban..."
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
          />
        </div>
      </div>

      <!-- Categories Filter -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-2 border-t border-slate-100">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          class="px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
          :class="selectedCategory === cat.id ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- FAQ List -->
    <div class="space-y-3">
      <div v-if="loading" class="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
        <p class="text-xs">Memuat data FAQ...</p>
      </div>

      <div
        v-else-if="filteredFaqs.length > 0"
        v-for="faq in filteredFaqs"
        :key="faq.id"
        class="bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all hover:border-slate-300 overflow-hidden"
      >
        <!-- Item Header -->
        <div 
          @click="toggleFaq(faq.id)"
          class="p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
        >
          <div class="flex items-start gap-3.5">
            <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              {{ faq.order_index }}
            </span>
            <div>
              <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                <!-- Scope Badge -->
                <span 
                  class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :class="faq.scope === 'GLOBAL' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'"
                >
                  <component :is="faq.scope === 'GLOBAL' ? Globe : Building2" class="w-3 h-3" />
                  {{ faq.scope === 'GLOBAL' ? 'GLOBAL (/faq)' : (faq.institution_name || 'Lembaga') }}
                </span>

                <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  <Tag class="w-3 h-3 text-slate-400" />
                  {{ faq.category }}
                </span>

                <span 
                  class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  :class="faq.is_active ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="faq.is_active ? 'bg-green-500' : 'bg-rose-500'"></span>
                  {{ faq.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
              <h3 class="text-sm md:text-base font-semibold text-slate-800 leading-snug">
                {{ faq.question }}
              </h3>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <ChevronDown 
              class="w-5 h-5 text-slate-400 transition-transform duration-200"
              :class="expandedFaqId === faq.id ? 'rotate-180 text-emerald-600' : ''"
            />
          </div>
        </div>

        <!-- Expanded Answer & Actions -->
        <div v-if="expandedFaqId === faq.id" class="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50">
          <p class="text-xs md:text-sm text-slate-600 leading-relaxed pl-10 pr-4 whitespace-pre-line">
            {{ faq.answer }}
          </p>

          <div class="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 pl-10">
            <span>Terakhir diperbarui: {{ new Date(faq.updated_at).toLocaleDateString('id-ID') }}</span>
            <div class="flex items-center gap-2">
              <button
                @click.stop="toggleStatus(faq)"
                class="px-2.5 py-1 rounded-lg border text-xs font-medium transition-all"
                :class="faq.is_active ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'"
              >
                {{ faq.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
              </button>
              <button
                @click.stop="openEditModal(faq)"
                class="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-200 transition-all"
                title="Edit FAQ"
              >
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                @click.stop="deleteFaq(faq.id)"
                class="p-1.5 rounded-lg text-slate-600 hover:text-red-700 hover:bg-red-50 transition-all"
                title="Hapus FAQ"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
        <HelpCircle class="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 class="font-semibold text-slate-700 text-base mb-1">Tidak ada FAQ ditemukan</h4>
        <p class="text-xs text-slate-400">Belum ada daftar FAQ atau sesuaikan kata kunci pencarian Anda.</p>
      </div>
    </div>

    <!-- Modal Tambah / Edit FAQ -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="isModalOpen = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-lg">
            {{ isEditing ? 'Edit FAQ' : 'Tambah FAQ Baru' }}
          </h3>
          <button @click="isModalOpen = false" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Scope (Global vs Lembaga) -->
          <div v-if="isSuperAdmin">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Cakupan (Scope) FAQ</label>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xs font-medium"
                :class="modalForm.scope === 'GLOBAL' ? 'border-emerald-600 bg-emerald-50/50 text-[#1A4D2E]' : 'border-slate-200'"
              >
                <input type="radio" v-model="modalForm.scope" value="GLOBAL" class="text-emerald-600" />
                <span>FAQ Global (/faq)</span>
              </label>
              <label class="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xs font-medium"
                :class="modalForm.scope === 'INSTITUTION' ? 'border-emerald-600 bg-emerald-50/50 text-[#1A4D2E]' : 'border-slate-200'"
              >
                <input type="radio" v-model="modalForm.scope" value="INSTITUTION" class="text-emerald-600" />
                <span>Khusus Lembaga</span>
              </label>
            </div>
          </div>

          <!-- Select Institution if Scope is INSTITUTION -->
          <div v-if="modalForm.scope === 'INSTITUTION'">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Lembaga Pemilik FAQ</label>
            <select
              v-model="modalForm.institution_id"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
            >
              <option value="">-- Pilih Lembaga --</option>
              <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
                {{ inst.name }} ({{ inst.code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
            <select
              v-model="modalForm.category"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
            >
              <option value="PENDAFTARAN">Pendaftaran</option>
              <option value="PERSYARATAN">Persyaratan</option>
              <option value="BIAYA">Biaya</option>
              <option value="UMUM">Umum</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Pertanyaan</label>
            <input
              v-model="modalForm.question"
              type="text"
              placeholder="Contoh: Kapan batas akhir pendaftaran?"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Jawaban</label>
            <textarea
              v-model="modalForm.answer"
              rows="4"
              placeholder="Tuliskan jawaban yang jelas dan lengkap..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Urutan Tampil</label>
              <input
                v-model.number="modalForm.order_index"
                type="number"
                min="1"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status Publikasi</label>
              <div class="flex items-center gap-3 pt-2">
                <label class="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="checkbox"
                    v-model="modalForm.is_active"
                    :true-value="1"
                    :false-value="0"
                    class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Aktif ditampilkan</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            @click="isModalOpen = false"
            class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-sm font-medium transition-all"
          >
            Batal
          </button>
          <button
            @click="saveFaq"
            :disabled="saving"
            class="px-5 py-2 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {{ saving ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah FAQ') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
