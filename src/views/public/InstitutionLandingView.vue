<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPublicLanding } from '@/services/publicLandingService'
import * as settingService from '@/services/settingService'
import {
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Award,
  Globe,
  Star
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const notFound = ref(false)
const landingData = ref(null)
const expandedFaqId = ref(null)

const iconsMap = {
  BookOpen,
  Globe,
  Award,
  Star,
  GraduationCap,
  Sparkles
}

const loadData = async () => {
  loading.value = true
  notFound.value = false
  const slug = route.params.slug

  try {
    const res = await getPublicLanding(slug)
    if (res && res.data) {
      landingData.value = res.data
      if (res.data.faqs && res.data.faqs.length > 0) {
        expandedFaqId.value = res.data.faqs[0].id
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

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const goToRegister = () => {
  if (!landingData.value?.institution) {
    router.push('/pendaftaran')
    return
  }
  const inst = landingData.value.institution
  // For formal school (SMP, SMA, SMK): preselect institution id
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
      <p class="text-sm font-medium tracking-wide">Memuat profil lembaga...</p>
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

    <!-- Main Landing Content -->
    <div v-else class="space-y-6">
      
      <!-- Top Brand Header -->
      <div class="header">
        <h1 class="mainTitle">
          {{ landingData.institution.name }}
        </h1>
        <p class="subtitle text-sm md:text-base opacity-90 mt-1 mb-6">
          {{ landingData.profile?.headline || 'Penerimaan Santri & Siswa Baru' }}
        </p>

        <div class="logoContainer">
          <router-link to="/">
            <img :src="landingData.institution.logoUrl || '/1.png'" alt="Logo Lembaga" width="130" height="130" class="logo" />
          </router-link>
        </div>
      </div>

      <!-- Hero Card & Profil Singkat -->
      <div class="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/40 text-slate-800 space-y-6">
        
        <!-- Tagline & Description -->
        <div class="text-center max-w-2xl mx-auto">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
            <Sparkles class="w-3.5 h-3.5" />
            SPSMB TA 2027/2028
          </span>
          <h2 class="text-xl md:text-2xl font-bold text-slate-900 leading-snug mb-3">
            {{ landingData.profile?.tagline || 'Pendidikan Berkualitas, Berakhlak Mulia' }}
          </h2>
          <p class="text-xs md:text-sm text-slate-600 leading-relaxed m-0">
            {{ landingData.profile?.short_description }}
          </p>
        </div>

        <!-- Real Aggregate Statistics -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pt-2">
          <div class="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200/60 text-center">
            <Users class="w-5 h-5 text-emerald-700 mx-auto mb-1" />
            <div class="text-xl md:text-2xl font-bold text-[#1A4D2E]">
              {{ landingData.stats?.totalApplicants || 0 }}
            </div>
            <div class="text-[11px] font-semibold text-slate-600 mt-0.5">Calon Pendaftar</div>
          </div>

          <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-200/60 text-center">
            <CheckCircle2 class="w-5 h-5 text-blue-700 mx-auto mb-1" />
            <div class="text-xl md:text-2xl font-bold text-blue-900">
              {{ landingData.stats?.confirmedApplicants || 0 }}
            </div>
            <div class="text-[11px] font-semibold text-slate-600 mt-0.5">Pendaftar Terverifikasi</div>
          </div>

          <div class="col-span-2 md:col-span-1 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200/60 text-center">
            <GraduationCap class="w-5 h-5 text-amber-700 mx-auto mb-1" />
            <div class="text-xl md:text-2xl font-bold text-amber-900">
              {{ landingData.stats?.totalPrograms || 1 }}
            </div>
            <div class="text-[11px] font-semibold text-slate-600 mt-0.5">Program / Peminatan</div>
          </div>
        </div>

        <!-- Featured Programs -->
        <div v-if="landingData.featuredPrograms && landingData.featuredPrograms.length > 0" class="pt-4 border-t border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <Award class="w-5 h-5 text-[#1A4D2E]" />
            <h3 class="text-base md:text-lg font-bold text-slate-800 m-0">Program Unggulan</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div
              v-for="prog in landingData.featuredPrograms"
              :key="prog.id"
              class="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div class="w-8 h-8 rounded-xl bg-emerald-100 text-[#1A4D2E] flex items-center justify-center font-bold mb-2.5">
                  <component :is="iconsMap[prog.icon] || BookOpen" class="w-4 h-4" />
                </div>
                <h4 class="text-sm font-bold text-slate-800 mb-1 leading-snug">{{ prog.title }}</h4>
                <p class="text-xs text-slate-600 leading-relaxed m-0">{{ prog.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Admission Wave / Schedule Information -->
        <div class="pt-4 border-t border-slate-100">
          <div class="flex items-center gap-2 mb-3">
            <Calendar class="w-5 h-5 text-[#1A4D2E]" />
            <h3 class="text-base md:text-lg font-bold text-slate-800 m-0">Informasi Gelombang Pendaftaran</h3>
          </div>

          <div v-if="landingData.waves && landingData.waves.length > 0" class="space-y-2">
            <div
              v-for="wave in landingData.waves"
              :key="wave.id"
              class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-emerald-50/40 border border-emerald-200/70 rounded-2xl gap-2"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h5 class="text-sm font-bold text-slate-800 m-0">{{ wave.name }}</h5>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Sedang Dibuka
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 mb-0">
                  Jadwal: {{ formatDate(wave.start_date) }} - {{ formatDate(wave.end_date) }}
                </p>
              </div>

              <button
                type="button"
                @click="goToRegister"
                class="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex-shrink-0"
              >
                Daftar Gelombang Ini
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-else class="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            Jadwal pendaftaran untuk lembaga ini akan segera dibuka. Silakan hubungi panitia untuk informasi lengkap.
          </div>
        </div>

        <!-- Institution Specific FAQs -->
        <div v-if="landingData.faqs && landingData.faqs.length > 0" class="pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <HelpCircle class="w-5 h-5 text-[#1A4D2E]" />
              <h3 class="text-base md:text-lg font-bold text-slate-800 m-0">FAQ {{ landingData.institution.name }}</h3>
            </div>
            <router-link to="/faq" class="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline">
              Lihat FAQ Global &rarr;
            </router-link>
          </div>

          <div class="space-y-2">
            <div
              v-for="faq in landingData.faqs"
              :key="faq.id"
              class="border border-slate-200 rounded-xl overflow-hidden"
              :class="expandedFaqId === faq.id ? 'bg-slate-50 border-emerald-300' : 'bg-white'"
            >
              <button
                type="button"
                @click="toggleFaq(faq.id)"
                class="w-full text-left p-3.5 flex items-center justify-between gap-3 text-xs md:text-sm font-semibold text-slate-800"
              >
                <span>{{ faq.question }}</span>
                <ChevronDown class="w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0" :class="expandedFaqId === faq.id ? 'rotate-180 text-emerald-700' : ''" />
              </button>
              <div v-if="expandedFaqId === faq.id" class="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                {{ faq.answer }}
              </div>
            </div>
          </div>
        </div>

        <!-- Contact & Location Info -->
        <div class="pt-4 border-t border-slate-100 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span class="truncate">{{ landingData.profile?.address || 'Sumberpasir, Pakis, Malang' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Phone class="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>WA: {{ landingData.profile?.whatsapp_contact || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Mail class="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span class="truncate">{{ landingData.profile?.email || '-' }}</span>
          </div>
        </div>

        <!-- Primary CTA Buttons -->
        <div class="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <router-link
            to="/faq"
            class="text-xs md:text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium order-2 sm:order-1"
          >
            <HelpCircle class="w-4 h-4" />
            Butuh Bantuan? Baca FAQ
          </router-link>

          <button
            type="button"
            @click="goToRegister"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-sm md:text-base font-bold shadow-lg transition-all order-1 sm:order-2"
          >
            Daftar Sekarang di {{ landingData.institution.code }}
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  </div>
</template>
