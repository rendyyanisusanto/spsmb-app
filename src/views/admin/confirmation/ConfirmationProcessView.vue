<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import confirmationService from '@/services/confirmationService'
import {
  ArrowLeft,
  User,
  GraduationCap,
  FileCheck,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Eye,
  Plus,
  Building2,
  Calendar,
  Check,
  X,
  Upload,
  Download,
  ShieldCheck
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { hasRole, user } = useAuth()
const applicationId = route.params.applicationId

const loading = ref(true)
const detail = ref(null)
const selectedTrackId = ref('')
const startingConfirmation = ref(false)

// Modals
const showDocModal = ref(false)
const docModalData = ref({ documentTypeId: null, docName: '', status: 'TERVERIFIKASI', notes: '' })
const verifyingDoc = ref(false)

const showPayModal = ref(false)
const payModalForm = ref({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'TRANSFER', file: null })
const submittingPayment = ref(false)

const showFinalizeModal = ref(false)
const finalizeForm = ref({ official_student_number: '', notes: '' })
const finalizing = ref(false)

const showCancelModal = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await confirmationService.getConfirmationDetail(applicationId)
    if (res && res.data) {
      detail.value = res.data
      if (detail.value.confirmation) {
        selectedTrackId.value = detail.value.confirmation.confirmation_track_id
        finalizeForm.value.official_student_number = detail.value.confirmation.official_student_number || ''
      } else if (detail.value.tracks?.length > 0) {
        selectedTrackId.value = detail.value.tracks[0].id
      }
    }
  } catch (err) {
    alert(err.message || 'Gagal memuat data konfirmasi.')
    router.push('/admin/konfirmasi')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDetail()
})

const formatCurrency = (val) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const getFileUrl = (path) => {
  if (!path) return '#'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '')
  return `${base}/${path.replace(/^\//, '')}`
}

// 1. Start confirmation
const handleStartConfirmation = async () => {
  if (!selectedTrackId.value) {
    alert('Pilih jalur konfirmasi terlebih dahulu.')
    return
  }

  startingConfirmation.value = true
  try {
    await confirmationService.startConfirmation(applicationId, selectedTrackId.value)
    await fetchDetail()
  } catch (err) {
    alert(err.message || 'Gagal memulai proses konfirmasi.')
  } finally {
    startingConfirmation.value = false
  }
}

// 2. Document Verification
const openDocVerifyModal = (doc) => {
  docModalData.value = {
    documentTypeId: doc.document_type_id,
    docName: doc.doc_name,
    status: doc.status === 'TERVERIFIKASI' ? 'TERVERIFIKASI' : 'TERVERIFIKASI',
    notes: doc.notes || ''
  }
  showDocModal.value = true
}

const submitDocVerification = async () => {
  verifyingDoc.value = true
  try {
    await confirmationService.verifyDocument(
      detail.value.confirmation.id,
      docModalData.value.documentTypeId,
      docModalData.value.status,
      docModalData.value.notes
    )
    showDocModal.value = false
    await fetchDetail()
  } catch (err) {
    alert(err.message || 'Gagal memverifikasi dokumen.')
  } finally {
    verifyingDoc.value = false
  }
}

// 3. Payments
const handlePaymentFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    payModalForm.value.file = file
  }
}

const submitPayment = async () => {
  if (!payModalForm.value.amount || Number(payModalForm.value.amount) <= 0) {
    alert('Nominal pembayaran harus lebih besar dari 0.')
    return
  }
  if (!payModalForm.value.payment_date) {
    alert('Tanggal pembayaran wajib diisi.')
    return
  }

  submittingPayment.value = true
  try {
    const formData = new FormData()
    formData.append('amount', payModalForm.value.amount)
    formData.append('payment_date', payModalForm.value.payment_date)
    formData.append('payment_method', payModalForm.value.payment_method)
    if (payModalForm.value.file) {
      formData.append('proof', payModalForm.value.file)
    }

    await confirmationService.addPayment(detail.value.confirmation.id, formData)
    showPayModal.value = false
    payModalForm.value = { amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'TRANSFER', file: null }
    await fetchDetail()
  } catch (err) {
    alert(err.message || 'Gagal mencatat pembayaran.')
  } finally {
    submittingPayment.value = false
  }
}

const verifyPaymentAction = async (paymentId, status) => {
  const note = prompt(`Masukkan catatan verifikasi pembayaran (${status}):`, '')
  if (note === null) return

  try {
    await confirmationService.verifyPayment(paymentId, status, note)
    await fetchDetail()
  } catch (err) {
    alert(err.message || 'Gagal memverifikasi pembayaran.')
  }
}

// 4. Finalize
const isReadyToFinalize = computed(() => {
  if (!detail.value?.confirmation) return false
  const docOk = detail.value.confirmation.document_verification_status === 'TERVERIFIKASI'
  const payOk = detail.value.confirmation.payment_status === 'LUNAS' || Number(detail.value.confirmation.total_bill_amount) === 0
  return docOk && payOk && detail.value.confirmation.status !== 'DITERIMA'
})

const submitFinalize = async () => {
  finalizing.value = true
  try {
    await confirmationService.finalizeAdmission(
      detail.value.confirmation.id,
      finalizeForm.value.official_student_number,
      finalizeForm.value.notes
    )
    showFinalizeModal.value = false
    await fetchDetail()
    alert('Selamat! Calon pendaftar telah resmi DITERIMA sebagai siswa/santri baru.')
  } catch (err) {
    alert(err.message || 'Gagal menetapkan penerimaan.')
  } finally {
    finalizing.value = false
  }
}

const submitCancelAdmission = async () => {
  if (!cancelReason.value.trim()) {
    alert('Alasan pembatalan wajib diisi.')
    return
  }

  cancelling.value = true
  try {
    await confirmationService.cancelAdmission(detail.value.confirmation.id, cancelReason.value.trim())
    showCancelModal.value = false
    await fetchDetail()
  } catch (err) {
    alert(err.message || 'Gagal membatalkan penerimaan.')
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back & Title -->
    <div class="flex items-center justify-between">
      <router-link
        to="/admin/konfirmasi"
        class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        Kembali ke Daftar Konfirmasi
      </router-link>

      <!-- Final Status Badge if exists -->
      <div v-if="detail?.confirmation">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          :class="{
            'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm': detail.confirmation.status === 'DITERIMA',
            'bg-amber-100 text-amber-900 border border-amber-300': detail.confirmation.status === 'PROSES',
            'bg-rose-100 text-rose-900 border border-rose-300': detail.confirmation.status === 'DITOLAK',
            'bg-slate-100 text-slate-700': detail.confirmation.status === 'BATAL'
          }"
        >
          <span class="w-2 h-2 rounded-full"
            :class="{
              'bg-emerald-600': detail.confirmation.status === 'DITERIMA',
              'bg-amber-600': detail.confirmation.status === 'PROSES',
              'bg-rose-600': detail.confirmation.status === 'DITOLAK',
              'bg-slate-400': detail.confirmation.status === 'BATAL'
            }"
          ></span>
          Status: {{ detail.confirmation.status === 'DITERIMA' ? 'RESMI DITERIMA' : detail.confirmation.status }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400">
      <div class="animate-spin rounded-full h-9 w-9 border-b-2 border-emerald-600 mx-auto mb-2"></div>
      <p class="text-xs">Memuat berkas dan data pendaftar...</p>
    </div>

    <div v-else-if="detail" class="space-y-6">
      
      <!-- Top Overview Card -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-xl flex items-center justify-center flex-shrink-0">
            {{ detail.application.full_name?.charAt(0)?.toUpperCase() || 'P' }}
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <h2 class="text-lg md:text-xl font-bold text-slate-800 m-0">{{ detail.application.full_name }}</h2>
              <span class="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {{ detail.application.registration_number }}
              </span>
            </div>
            <div class="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span class="flex items-center gap-1">
                <Building2 class="w-3.5 h-3.5 text-slate-400" />
                {{ detail.application.formal_institution_name || detail.application.pondok_institution_name }}
              </span>
              <span>•</span>
              <span>Asal: {{ detail.application.previous_school }}</span>
              <span>•</span>
              <span>Tahun: {{ detail.application.period_academic_year }}</span>
            </div>
          </div>
        </div>

        <!-- Official student ID banner if already accepted -->
        <div v-if="detail.confirmation?.status === 'DITERIMA'" class="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center md:text-right">
          <div class="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">No. Induk Siswa / Santri Resmi</div>
          <div class="text-lg font-mono font-bold text-emerald-950 mt-0.5">
            {{ detail.confirmation.official_student_number }}
          </div>
          <div class="text-[10px] text-emerald-700 mt-1">
            Ditetapkan pada: {{ formatDate(detail.confirmation.decision_date) }}
          </div>
        </div>
      </div>

      <!-- STEP 1: Data Diri Pendaftar (Mode Baca dari Form Utama) -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="p-4 md:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <User class="w-4 h-4 text-emerald-700" />
            <h3 class="text-sm font-bold text-slate-800 m-0">1. Data Diri Calon Siswa / Santri (Form Utama)</h3>
          </div>
          <span class="text-[11px] text-slate-400 italic">Data resmi hasil pengisian pendaftaran awal</span>
        </div>

        <div class="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span class="text-slate-400 block mb-0.5">Nama Lengkap</span>
            <span class="font-semibold text-slate-800">{{ detail.application.full_name }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5">Jenis Kelamin</span>
            <span class="font-semibold text-slate-800">{{ detail.application.gender === 'MALE' ? 'Laki-laki' : 'Perempuan' }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5">Tempat, Tanggal Lahir</span>
            <span class="font-semibold text-slate-800">{{ detail.application.birth_place }}, {{ formatDate(detail.application.birth_date) }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5">No. WhatsApp Calon Siswa</span>
            <span class="font-semibold text-slate-800">{{ detail.application.whatsapp }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5">Nama Orang Tua / Wali</span>
            <span class="font-semibold text-slate-800">{{ detail.application.parent_name || '-' }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5">Asal Sekolah</span>
            <span class="font-semibold text-slate-800">{{ detail.application.previous_school }}</span>
          </div>
          <div class="sm:col-span-2 md:col-span-3">
            <span class="text-slate-400 block mb-0.5">Alamat Lengkap</span>
            <span class="font-semibold text-slate-800 leading-relaxed">{{ detail.application.address }}</span>
          </div>
        </div>
      </div>

      <!-- STEP 2: Pemilihan Jalur Konfirmasi -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="p-4 md:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <GraduationCap class="w-4 h-4 text-emerald-700" />
            <h3 class="text-sm font-bold text-slate-800 m-0">2. Jalur Penerimaan Konfirmasi</h3>
          </div>
          <span v-if="detail.confirmation" class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Jalur Terpilih: {{ detail.confirmation.track_name }}
          </span>
        </div>

        <div class="p-5">
          <!-- If not started yet -->
          <div v-if="!detail.confirmation" class="space-y-4">
            <p class="text-xs text-slate-600 m-0">
              Pilih jalur konfirmasi yang tersedia untuk lembaga <strong>{{ detail.application.formal_institution_name || detail.application.pondok_institution_name }}</strong> untuk memulai proses:
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <label
                v-for="track in detail.tracks"
                :key="track.id"
                class="border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3"
                :class="selectedTrackId === track.id ? 'border-emerald-600 bg-emerald-50/40 text-[#1A4D2E] shadow-sm' : 'border-slate-200 hover:bg-slate-50'"
              >
                <input
                  type="radio"
                  v-model="selectedTrackId"
                  :value="track.id"
                  class="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <h4 class="text-xs font-bold text-slate-800 m-0">{{ track.name }}</h4>
                  <span class="text-[10px] text-slate-400 block mt-0.5">{{ track.code || '-' }} • TA {{ track.academic_year }}</span>
                  <p class="text-[11px] text-slate-500 mt-1 m-0">{{ track.description || 'Jalur penerimaan reguler' }}</p>
                </div>
              </label>
            </div>

            <div class="pt-2">
              <button
                type="button"
                @click="handleStartConfirmation"
                :disabled="startingConfirmation || !selectedTrackId"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <Check class="w-4 h-4" />
                {{ startingConfirmation ? 'Memproses...' : 'Inisialisasi Proses Konfirmasi & Tagihan' }}
              </button>
            </div>
          </div>

          <!-- If already started -->
          <div v-else class="flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-400 block mb-0.5">Jalur & Gelombang Ditetapkan</span>
              <div class="text-sm font-bold text-slate-800">{{ detail.confirmation.track_name }} ({{ detail.confirmation.track_code || 'REG' }})</div>
              <div class="text-slate-500 text-[11px] mt-0.5">Tahun Akademik Penerimaan: {{ detail.confirmation.academic_year }}</div>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-slate-400 block mb-0.5">Diproses sejak</span>
              <span class="font-medium text-slate-700">{{ formatDate(detail.confirmation.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- If confirmation is initialized, show Step 3, 4, 5 -->
      <template v-if="detail.confirmation">
        
        <!-- STEP 3: Verifikasi Dokumen Persyaratan -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="p-4 md:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <FileCheck class="w-4 h-4 text-emerald-700" />
              <h3 class="text-sm font-bold text-slate-800 m-0">3. Verifikasi Dokumen Persyaratan Pendaftaran</h3>
            </div>
            <span
              class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              :class="{
                'bg-emerald-50 text-emerald-700 border border-emerald-200': detail.confirmation.document_verification_status === 'TERVERIFIKASI',
                'bg-amber-50 text-amber-700 border border-amber-200': detail.confirmation.document_verification_status === 'MENUNGGU_VERIFIKASI',
                'bg-rose-50 text-rose-700 border border-rose-200': detail.confirmation.document_verification_status === 'DITOLAK',
                'bg-slate-100 text-slate-600': detail.confirmation.document_verification_status === 'BELUM_LENGKAP'
              }"
            >
              {{ detail.confirmation.document_verification_status }}
            </span>
          </div>

          <div class="p-5">
            <div v-if="detail.docVerifications && detail.docVerifications.length > 0" class="divide-y divide-slate-100 text-xs">
              <div
                v-for="doc in detail.docVerifications"
                :key="doc.id"
                class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 text-sm">{{ doc.doc_name }}</span>
                    <span class="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{{ doc.doc_code }}</span>
                  </div>
                  
                  <div class="mt-1 flex items-center gap-3 text-slate-500">
                    <span v-if="doc.file_name" class="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                      {{ doc.file_name }} ({{ Math.round((doc.file_size || 0) / 1024) }} KB)
                    </span>
                    <span v-else class="text-amber-600 italic flex items-center gap-1">
                      <Clock class="w-3.5 h-3.5" />
                      Belum Diunggah
                    </span>

                    <span v-if="doc.verified_by_name" class="text-[11px] text-slate-400">
                      • Diverifikasi oleh {{ doc.verified_by_name }}
                    </span>
                  </div>

                  <p v-if="doc.notes" class="text-[11px] text-slate-500 mt-1 italic m-0">
                    Catatan: {{ doc.notes }}
                  </p>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <!-- File preview link if uploaded -->
                  <a
                    v-if="doc.file_path"
                    :href="getFileUrl(doc.file_path)"
                    target="_blank"
                    class="p-2 border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-all"
                    title="Lihat Berkas"
                  >
                    <Eye class="w-3.5 h-3.5" />
                  </a>

                  <!-- Status badge -->
                  <span
                    class="px-2.5 py-1 rounded-lg font-semibold text-[11px]"
                    :class="{
                      'bg-emerald-50 text-emerald-700 border border-emerald-200': doc.status === 'TERVERIFIKASI',
                      'bg-rose-50 text-rose-700 border border-rose-200': doc.status === 'DITOLAK',
                      'bg-amber-50 text-amber-700 border border-amber-200': doc.status === 'MENUNGGU_VERIFIKASI',
                      'bg-slate-100 text-slate-500': doc.status === 'BELUM_UNGGAH'
                    }"
                  >
                    {{ doc.status }}
                  </span>

                  <!-- Verify Button -->
                  <button
                    v-if="doc.applicant_document_id"
                    type="button"
                    @click="openDocVerifyModal(doc)"
                    class="px-3 py-1.5 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    Verifikasi
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-6 text-slate-400 text-xs">
              Tidak ada dokumen persyaratan khusus yang terdaftar.
            </div>
          </div>
        </div>

        <!-- STEP 4: Tagihan & Pembayaran Dinamis -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="p-4 md:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <CreditCard class="w-4 h-4 text-emerald-700" />
              <h3 class="text-sm font-bold text-slate-800 m-0">4. Komponen Tagihan & Riwayat Pembayaran</h3>
            </div>
            
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                :class="{
                  'bg-emerald-50 text-emerald-700 border border-emerald-200': detail.confirmation.payment_status === 'LUNAS',
                  'bg-amber-50 text-amber-700 border border-amber-200': detail.confirmation.payment_status === 'SEBAGIAN',
                  'bg-slate-100 text-slate-600': detail.confirmation.payment_status === 'BELUM_BAYAR'
                }"
              >
                {{ detail.confirmation.payment_status }}
              </span>
              <button
                type="button"
                @click="showPayModal = true"
                class="inline-flex items-center gap-1 px-3 py-1 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Plus class="w-3.5 h-3.5" />
                Catat Pembayaran
              </button>
            </div>
          </div>

          <div class="p-5 space-y-6">
            <!-- Bill Items Snapshot Table -->
            <div>
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Rincian Komponen Biaya (Snapshot)</h4>
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th class="py-2.5 px-3">Komponen</th>
                      <th class="py-2.5 px-3 text-center">Sifat</th>
                      <th class="py-2.5 px-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="item in detail.billItems" :key="item.id">
                      <td class="py-2.5 px-3 font-medium text-slate-800">{{ item.name }}</td>
                      <td class="py-2.5 px-3 text-center">
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="item.is_required ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'">
                          {{ item.is_required ? 'Wajib' : 'Opsional' }}
                        </span>
                      </td>
                      <td class="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {{ formatCurrency(item.amount) }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-slate-50 border-t border-slate-200 font-bold text-xs text-slate-800">
                    <tr>
                      <td colspan="2" class="py-2.5 px-3">Total Tagihan Wajib</td>
                      <td class="py-2.5 px-3 text-right font-mono text-[#1A4D2E] text-sm">
                        {{ formatCurrency(detail.confirmation.total_bill_amount) }}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" class="py-2 px-3 text-emerald-700">Total Pembayaran Terverifikasi</td>
                      <td class="py-2 px-3 text-right font-mono text-emerald-700 text-sm">
                        {{ formatCurrency(detail.confirmation.total_paid_amount) }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Payment Records List -->
            <div>
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Riwayat Pembayaran & Bukti Transfer</h4>
              <div v-if="detail.payments && detail.payments.length > 0" class="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div
                  v-for="pay in detail.payments"
                  :key="pay.id"
                  class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-800 text-sm">{{ formatCurrency(pay.amount) }}</span>
                      <span class="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{{ pay.payment_number }}</span>
                    </div>
                    <div class="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                      <span>Tanggal: {{ formatDate(pay.payment_date) }}</span>
                      <span>•</span>
                      <span>Metode: {{ pay.payment_method }}</span>
                      <span v-if="pay.verified_by_name">• Disetujui: {{ pay.verified_by_name }}</span>
                    </div>
                    <p v-if="pay.verification_notes" class="text-[11px] text-slate-500 mt-1 italic m-0">
                      Catatan: {{ pay.verification_notes }}
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <a
                      v-if="pay.proof_file_path"
                      :href="getFileUrl(pay.proof_file_path)"
                      target="_blank"
                      class="px-2.5 py-1.5 border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-slate-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Eye class="w-3 h-3" />
                      Bukti Bayar
                    </a>

                    <span
                      class="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      :class="{
                        'bg-emerald-50 text-emerald-800 border border-emerald-200': pay.status === 'VERIFIED',
                        'bg-rose-50 text-rose-800 border border-rose-200': pay.status === 'REJECTED',
                        'bg-amber-50 text-amber-800 border border-amber-200': pay.status === 'PENDING'
                      }"
                    >
                      {{ pay.status === 'VERIFIED' ? 'TERVERIFIKASI' : (pay.status === 'REJECTED' ? 'DITOLAK' : 'MENUNGGU VERIFIKASI') }}
                    </span>

                    <!-- Action verify payment -->
                    <div v-if="pay.status === 'PENDING'" class="flex items-center gap-1">
                      <button
                        type="button"
                        @click="verifyPaymentAction(pay.id, 'VERIFIED')"
                        class="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                        title="Setujui Pembayaran"
                      >
                        <Check class="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        @click="verifyPaymentAction(pay.id, 'REJECTED')"
                        class="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all"
                        title="Tolak Pembayaran"
                      >
                        <X class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada transaksi pembayaran yang dicatat.
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 5: Verifikasi Akhir & Penetapan Resmi Diterima -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="p-4 md:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <ShieldCheck class="w-4 h-4 text-emerald-700" />
              <h3 class="text-sm font-bold text-slate-800 m-0">5. Verifikasi Akhir & Penetapan Resmi Diterima</h3>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <!-- Checklist Summary -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                class="p-3.5 rounded-xl border flex items-center gap-3"
                :class="detail.confirmation.document_verification_status === 'TERVERIFIKASI' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'"
              >
                <component
                  :is="detail.confirmation.document_verification_status === 'TERVERIFIKASI' ? CheckCircle2 : Clock"
                  class="w-5 h-5 flex-shrink-0"
                  :class="detail.confirmation.document_verification_status === 'TERVERIFIKASI' ? 'text-emerald-600' : 'text-slate-400'"
                />
                <div>
                  <div class="font-bold">Kelengkapan Dokumen Persyaratan</div>
                  <div class="text-[11px] opacity-80">{{ detail.confirmation.document_verification_status === 'TERVERIFIKASI' ? 'Seluruh dokumen wajib telah terverifikasi' : 'Masih ada dokumen yang belum lengkap / belum diverifikasi' }}</div>
                </div>
              </div>

              <div
                class="p-3.5 rounded-xl border flex items-center gap-3"
                :class="(detail.confirmation.payment_status === 'LUNAS' || Number(detail.confirmation.total_bill_amount) === 0) ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'"
              >
                <component
                  :is="(detail.confirmation.payment_status === 'LUNAS' || Number(detail.confirmation.total_bill_amount) === 0) ? CheckCircle2 : Clock"
                  class="w-5 h-5 flex-shrink-0"
                  :class="(detail.confirmation.payment_status === 'LUNAS' || Number(detail.confirmation.total_bill_amount) === 0) ? 'text-emerald-600' : 'text-slate-400'"
                />
                <div>
                  <div class="font-bold">Pelunasan Tagihan Wajib</div>
                  <div class="text-[11px] opacity-80">{{ detail.confirmation.payment_status === 'LUNAS' ? 'Pembayaran lunas terverifikasi' : 'Tagihan wajib belum lunas' }}</div>
                </div>
              </div>
            </div>

            <!-- Action buttons: Finalize or Cancel -->
            <div v-if="detail.confirmation.status !== 'DITERIMA'" class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p class="text-xs text-slate-500 m-0">
                Setelah dokumen terverifikasi dan tagihan terpenuhi, petugas berwenang dapat menetapkan pendaftar sebagai siswa/santri resmi.
              </p>

              <button
                type="button"
                @click="showFinalizeModal = true"
                :disabled="!isReadyToFinalize"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1A4D2E] hover:bg-[#245837] text-white rounded-xl text-xs md:text-sm font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 class="w-4 h-4" />
                Tetapkan Resmi Diterima
              </button>
            </div>

            <div v-else class="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <CheckCircle2 class="w-6 h-6 text-emerald-700 flex-shrink-0" />
                <div>
                  <h4 class="text-sm font-bold text-emerald-950 m-0">Pendaftar Telah Resmi Diterima</h4>
                  <p class="text-xs text-emerald-800 m-0 mt-0.5">
                    Tercatat resmi pada lembaga {{ detail.application.formal_institution_name || detail.application.pondok_institution_name }} (NIS: {{ detail.confirmation.official_student_number }})
                  </p>
                </div>
              </div>

              <button
                type="button"
                @click="showCancelModal = true"
                class="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
              >
                Batalkan Penetapan
              </button>
            </div>

          </div>
        </div>

      </template>

    </div>

    <!-- MODAL: Verifikasi Dokumen -->
    <div
      v-if="showDocModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="showDocModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-base">Verifikasi: {{ docModalData.docName }}</h3>
          <button @click="showDocModal = false" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Status Verifikasi</label>
            <select
              v-model="docModalData.status"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="TERVERIFIKASI">TERVERIFIKASI (Sesuai & Valid)</option>
              <option value="DITOLAK">DITOLAK (Buram / Perlu Perbaikan)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Petugas (Opsional)</label>
            <textarea
              v-model="docModalData.notes"
              rows="3"
              placeholder="Berikan alasan jika ditolak atau catatan verifikasi..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            ></textarea>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            @click="showDocModal = false"
            class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-xs font-medium"
          >
            Batal
          </button>
          <button
            @click="submitDocVerification"
            :disabled="verifyingDoc"
            class="px-5 py-2 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
          >
            {{ verifyingDoc ? 'Menyimpan...' : 'Simpan Verifikasi' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Catat Pembayaran -->
    <div
      v-if="showPayModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="showPayModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-base">Catat Pembayaran Baru</h3>
          <button @click="showPayModal = false" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nominal Pembayaran (Rp)</label>
            <input
              v-model.number="payModalForm.amount"
              type="number"
              placeholder="Contoh: 500000"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tanggal Pembayaran</label>
              <input
                v-model="payModalForm.payment_date"
                type="date"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Metode</label>
              <select
                v-model="payModalForm.payment_method"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="TRANSFER">Transfer Bank</option>
                <option value="CASH">Tunai di Kasir</option>
                <option value="VA">Virtual Account</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Unggah Bukti Transfer / Resi (Opsional)</label>
            <input
              type="file"
              @change="handlePaymentFileChange"
              accept="image/*,application/pdf"
              class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            @click="showPayModal = false"
            class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-xs font-medium"
          >
            Batal
          </button>
          <button
            @click="submitPayment"
            :disabled="submittingPayment"
            class="px-5 py-2 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
          >
            {{ submittingPayment ? 'Menyimpan...' : 'Simpan Pembayaran' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Penetapan Resmi Diterima -->
    <div
      v-if="showFinalizeModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="showFinalizeModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-base">Penetapan Resmi Diterima</h3>
          <button @click="showFinalizeModal = false" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 leading-relaxed">
            Anda akan menetapkan calon pendaftar <strong>{{ detail.application.full_name }}</strong> secara resmi diterima pada <strong>{{ detail.application.formal_institution_name || detail.application.pondok_institution_name }}</strong>.
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nomor Induk Siswa / Santri (NIS / No. SK)</label>
            <input
              v-model="finalizeForm.official_student_number"
              type="text"
              placeholder="Kosongkan untuk nomor otomatis sistem"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Catatan SK / Keputusan Penetapan</label>
            <textarea
              v-model="finalizeForm.notes"
              rows="3"
              placeholder="Catatan penetapan resmi atau no surat keputusan panitia..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            ></textarea>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            @click="showFinalizeModal = false"
            class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-xs font-medium"
          >
            Batal
          </button>
          <button
            @click="submitFinalize"
            :disabled="finalizing"
            class="px-5 py-2 bg-[#1A4D2E] hover:bg-[#235f3b] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
          >
            {{ finalizing ? 'Menetapkan...' : 'Ya, Tetapkan Resmi' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Pembatalan Penetapan -->
    <div
      v-if="showCancelModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="showCancelModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-rose-700 text-base">Batalkan Penetapan Penerimaan</h3>
          <button @click="showCancelModal = false" class="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <p class="text-slate-600 m-0">
            Tindakan ini akan mengembalikan status pendaftar menjadi DIBATALKAN. Riwayat dan audit trail akan tetap tersimpan.
          </p>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Alasan Pembatalan <span class="text-rose-500">*</span></label>
            <textarea
              v-model="cancelReason"
              rows="3"
              placeholder="Tuliskan alasan pembatalan..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
            ></textarea>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            @click="showCancelModal = false"
            class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-xs font-medium"
          >
            Kembali
          </button>
          <button
            @click="submitCancelAdmission"
            :disabled="cancelling"
            class="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
          >
            {{ cancelling ? 'Membatalkan...' : 'Konfirmasi Batalkan' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
