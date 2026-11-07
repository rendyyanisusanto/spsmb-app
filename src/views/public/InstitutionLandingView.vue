<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPublicLanding, getPublicGlobalFaqs } from '@/services/publicLandingService'
import resolveStorageUrl from '@/utils/imageUrl'
import {
  Building2,
  HelpCircle,
  ChevronDown,
  ArrowRight
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const notFound = ref(false)
const landingData = ref(null)
const globalFaqs = ref([])
const expandedFaqId = ref(null)
const logoLoadFailed = ref(false)

const institutionLogo = computed(() => {
  if (logoLoadFailed.value) return '/1.png'
  const raw = landingData.value?.institution?.logoUrl
  if (!raw) return '/1.png'
  return resolveStorageUrl(raw)
})

const handleLogoError = () => {
  logoLoadFailed.value = true
}

const displayFaqs = computed(() => {
  if (landingData.value?.faqs && landingData.value.faqs.length > 0) {
    return landingData.value.faqs
  }
  return globalFaqs.value || []
})

const loadData = async () => {
  loading.value = true
  notFound.value = false
  logoLoadFailed.value = false
  const slug = route.params.slug

  try {
    const [landingRes, faqRes] = await Promise.all([
      getPublicLanding(slug),
      getPublicGlobalFaqs().catch(() => null)
    ])

    const payload = landingRes?.data || landingRes
    if (payload && payload.institution) {
      landingData.value = payload

      if (faqRes) {
        const faqs = faqRes?.data || faqRes
        if (Array.isArray(faqs)) {
          globalFaqs.value = faqs
        }
      }

      const activeFaqs = (payload.faqs && payload.faqs.length > 0) ? payload.faqs : globalFaqs.value
      if (activeFaqs && activeFaqs.length > 0) {
        expandedFaqId.value = activeFaqs[0].id
      }
    } else {
      notFound.value = true
    }
  } catch (err) {
    console.error('Failed to load landing data:', err)
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(() => route.params.slug, () => {
  loadData()
})

const toggleFaq = (id) => {
  expandedFaqId.value = expandedFaqId.value === id ? null : id
}

const goToRegister = () => {
  if (!landingData.value?.institution) {
    router.push('/pendaftaran')
    return
  }
  const inst = landingData.value.institution
  // For formal school (SD, SMP, SMA, SMK): preselect institution id
  // For pondok (PPSQ1, PPSQ2): preselect gender / non-formal context
  if (inst.type === 'PONDOK') {
    const gender = inst.genderScope === 'MALE' ? 'L' : 'P'
    router.push({ path: '/pendaftaran', query: { type: 'NON_FORMAL', gender } })
  } else {
    router.push({ path: '/pendaftaran', query: { lembaga: inst.id } })
  }
}
</script>

<template>
  <div class="greenPanel">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-white">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
      <p class="text-sm font-medium tracking-wide">Memuat informasi lembaga...</p>
    </div>

    <!-- 404 Lembaga Tidak Ditemukan -->
    <div v-else-if="notFound || !landingData" class="bg-white/95 backdrop-blur-md rounded-3xl p-8 md:p-12 text-center text-slate-800 shadow-2xl border border-white/40 max-w-xl mx-auto my-12">
      <div class="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
        <Building2 class="w-8 h-8" />
      </div>
      <h2 class="text-2xl font-bold text-slate-800 mb-2">Lembaga Tidak Ditemukan</h2>
      <p class="text-sm text-slate-500 mb-6">Halaman lembaga yang Anda cari tidak tersedia atau belum dipublikasikan.</p>
      <router-link
        to="/"
        class="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
      >
        &larr; Kembali ke Halaman Utama
      </router-link>
    </div>

    <!-- Main Content: Hanya Header, Logo, dan FAQ -->
    <div v-else class="space-y-6">
      
      <!-- Top Brand Header -->
      <div class="header">
        <h1 class="mainTitle">
          {{ landingData.institution.name }}
        </h1>
        <p class="subtitle text-sm md:text-base opacity-90 mt-1 mb-6">
          Pertanyaan yang Sering Diajukan (FAQ) & Panduan Pendaftaran
        </p>

        <!-- Logo Lembaga (Dengan Resolver Storage URL & Fallback) -->
        <div class="logoContainer">
          <router-link to="/">
            <img
              :src="institutionLogo"
              @error="handleLogoError"
              :alt="'Logo ' + (landingData.institution.name || 'Lembaga')"
              width="130"
              height="130"
              class="logo object-contain"
            />
          </router-link>
        </div>
      </div>

      <!-- FAQ Card Section (Hanya FAQ) -->
      <div class="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/40 text-slate-800 space-y-6">
        
        <!-- Header FAQ -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-[#1A4D2E] flex items-center justify-center">
              <HelpCircle class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg md:text-xl font-bold text-slate-800 m-0">
                FAQ {{ landingData.institution.name }}
              </h2>
              <p class="text-xs text-slate-500 m-0">
                Informasi dan tanya-jawab seputar pendaftaran di {{ landingData.institution.name }}
              </p>
            </div>
          </div>

          <router-link
            to="/faq"
            class="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
          >
            Lihat Semua FAQ Global &rarr;
          </router-link>
        </div>

        <!-- FAQ Accordion List -->
        <div v-if="displayFaqs.length > 0" class="space-y-2.5">
          <div
            v-for="faq in displayFaqs"
            :key="faq.id"
            class="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200"
            :class="expandedFaqId === faq.id ? 'bg-emerald-50/30 border-emerald-300 shadow-xs' : 'bg-white hover:border-slate-300'"
          >
            <button
              type="button"
              @click="toggleFaq(faq.id)"
              class="w-full text-left p-4 flex items-center justify-between gap-3 text-xs md:text-sm font-bold text-slate-800"
            >
              <span>{{ faq.question }}</span>
              <ChevronDown
                class="w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0"
                :class="expandedFaqId === faq.id ? 'rotate-180 text-emerald-700' : ''"
              />
            </button>
            <div
              v-if="expandedFaqId === faq.id"
              class="px-4 pb-4 pt-1 text-xs md:text-sm text-slate-600 leading-relaxed border-t border-slate-100"
            >
              {{ faq.answer }}
            </div>
          </div>
        </div>

        <!-- Empty State jika tidak ada FAQ -->
        <div v-else class="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
          Belum ada pertanyaan khusus untuk lembaga ini. Silakan kunjungi menu FAQ utama atau hubungi panitia.
        </div>

        <!-- Tombol Aksi / Pendaftaran -->
        <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <router-link
            to="/"
            class="text-xs text-slate-500 hover:text-slate-800 font-medium order-2 sm:order-1"
          >
            &larr; Kembali ke Beranda Utama
          </router-link>

          <button
            type="button"
            @click="goToRegister"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-sm font-bold shadow-md transition-all order-1 sm:order-2"
          >
            Mulai Pendaftaran di {{ landingData.institution.code || landingData.institution.name }}
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  </div>
</template>
