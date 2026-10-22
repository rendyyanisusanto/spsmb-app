<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicGlobalFaqs } from '@/services/publicLandingService'
import * as settingService from '@/services/settingService'
import { Search, ChevronDown, HelpCircle, ArrowLeft, ArrowRight, Tag } from 'lucide-vue-next'

const router = useRouter()
const settings = ref(null)
const faqs = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('ALL')
const expandedId = ref(null)

const categories = [
  { id: 'ALL', label: 'Semua Kategori' },
  { id: 'PENDAFTARAN', label: 'Pendaftaran' },
  { id: 'PERSYARATAN', label: 'Persyaratan' },
  { id: 'BIAYA', label: 'Biaya & Tagihan' },
  { id: 'UMUM', label: 'Umum' }
]

onMounted(async () => {
  try {
    const [setRes, faqRes] = await Promise.all([
      settingService.getPublicSettings().catch(() => null),
      getPublicGlobalFaqs().catch(() => ({ data: [] }))
    ])
    if (setRes) settings.value = setRes.data || setRes
    if (faqRes && faqRes.data) {
      faqs.value = faqRes.data
      if (faqs.value.length > 0) {
        expandedId.value = faqs.value[0].id
      }
    }
  } catch (err) {
    console.error('Error fetching global FAQs:', err)
  } finally {
    loading.value = false
  }
})

const filteredFaqs = computed(() => {
  return faqs.value.filter(item => {
    const matchCategory = selectedCategory.value === 'ALL' || item.category === selectedCategory.value
    const matchSearch = !searchQuery.value.trim() ||
      item.question.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchCategory && matchSearch
  })
})

const toggleFaq = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

const goToRegistration = () => {
  router.push('/pendaftaran')
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="greenPanel">
    <!-- Header -->
    <div class="header">
      <h1 class="mainTitle" v-if="settings">
        {{ settings.general?.registrationName || 'SPSMB Asy-Syadzili' }}
      </h1>
      <h1 class="mainTitle" v-else>
        SPSMB Yayasan Pondok Pesantren Asy-Syadzili
      </h1>
      <p class="subtitle text-sm md:text-base opacity-90 mt-1 mb-6">
        Frequently Asked Questions (FAQ) & Pusat Bantuan Informasi
      </p>
      
      <div class="logoContainer">
        <router-link to="/">
          <img src="/1.png" alt="Logo Asy-Syadzili" width="140" height="140" class="logo" />
        </router-link>
      </div>
    </div>

    <!-- Main Card Container -->
    <div class="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/40 text-slate-800 transition-all">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            <HelpCircle class="w-3.5 h-3.5" />
            Tanya Jawab Resmi
          </span>
          <h2 class="text-xl md:text-2xl font-bold text-slate-800 m-0">Pertanyaan Umum SPSMB</h2>
          <p class="text-xs md:text-sm text-slate-500 mt-1 mb-0">Temukan jawaban seputar pendaftaran, berkas, dan ketentuan santri baru.</p>
        </div>

        <!-- Search Bar -->
        <div class="relative min-w-[240px]">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari pertanyaan..."
            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-700"
          />
        </div>
      </div>

      <!-- Categories Filter -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          class="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border"
          :class="selectedCategory === cat.id
            ? 'bg-[#1A4D2E] text-white border-[#1A4D2E] shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-slate-400">
        <div class="animate-spin rounded-full h-9 w-9 border-b-2 border-[#1A4D2E] mb-3"></div>
        <p class="text-xs font-medium">Memuat daftar pertanyaan...</p>
      </div>

      <!-- FAQ Accordion -->
      <div v-else-if="filteredFaqs.length > 0" class="space-y-3">
        <div
          v-for="(faq, index) in filteredFaqs"
          :key="faq.id"
          class="border border-slate-200/90 rounded-2xl overflow-hidden transition-all duration-200 hover:border-emerald-300"
          :class="expandedId === faq.id ? 'bg-emerald-50/20 border-emerald-300 shadow-sm' : 'bg-white'"
        >
          <button
            type="button"
            @click="toggleFaq(faq.id)"
            class="w-full text-left p-4 md:p-5 flex items-start justify-between gap-3 select-none"
          >
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {{ index + 1 }}
              </span>
              <div>
                <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 mb-1">
                  <Tag class="w-2.5 h-2.5" />
                  {{ faq.category }}
                </span>
                <h3 class="text-sm md:text-base font-semibold text-slate-800 leading-snug m-0">
                  {{ faq.question }}
                </h3>
              </div>
            </div>
            <div class="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform duration-200"
              :class="expandedId === faq.id ? 'rotate-180 bg-emerald-100 text-emerald-800' : ''"
            >
              <ChevronDown class="w-4 h-4" />
            </div>
          </button>

          <!-- Accordion Answer -->
          <div
            v-if="expandedId === faq.id"
            class="px-5 pb-5 pt-2 border-t border-slate-100 text-slate-600 text-xs md:text-sm leading-relaxed pl-13 whitespace-pre-line"
          >
            {{ faq.answer }}
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <HelpCircle class="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 class="font-bold text-slate-700 text-base mb-1">Tidak ada FAQ ditemukan</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          Tidak ada pertanyaan yang cocok dengan pencarian Anda. Silakan coba kata kunci lain atau hubungi panitia.
        </p>
      </div>

      <!-- Navigation & Action Buttons -->
      <div class="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          @click="goBack"
          class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-xs md:text-sm font-medium transition-colors order-2 sm:order-1"
        >
          <ArrowLeft class="w-4 h-4" />
          Kembali ke Panduan
        </button>

        <button
          type="button"
          @click="goToRegistration"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-sm font-semibold shadow-md transition-all order-1 sm:order-2"
        >
          Mulai Pendaftaran Sekarang
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
