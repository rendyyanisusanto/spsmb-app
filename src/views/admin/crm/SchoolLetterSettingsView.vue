<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import {
  getActiveLetterSettings,
  updateLetterSettings
} from '@/services/crmSchoolService';

import BaseLoading from '@/components/ui/BaseLoading.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import LetterWysiwygEditor from '@/components/admin/LetterWysiwygEditor.vue';
import { resolveStorageUrl } from '@/utils/imageUrl';

import {
  FileText,
  Save,
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  PenTool,
  Copy,
  Eye,
  HelpCircle,
  FileCheck
} from 'lucide-vue-next';

const router = useRouter();
const { user, hasRole } = useAuth();

// --- Permissions Check ---
const canEdit = computed(() => hasRole(['SUPER_ADMIN', 'ADMIN_SPSMB']));

// --- States ---
const isLoading = ref(true);
const isSaving = ref(false);
const saveSuccessMessage = ref('');
const errorMessage = ref('');
const copiedPlaceholder = ref('');

const form = reactive({
  id: null,
  setting_name: 'Template Standar Surat Permohonan',
  school_name: '',
  school_address: '',
  school_phone: '',
  school_email: '',
  school_website: '',
  letterhead_image_path: '',
  letterhead_logo_path: '',
  letterhead_extra_text: '',
  letter_number_prefix: 'SPMB/PRES',
  letter_number_format: '{num}/{prefix}/{month_rom}/{year}',
  letter_body_template: '',
  closing_text: 'Hormat kami,',
  principal_name: '',
  principal_title: '',
  principal_nip: '',
  principal_signature_path: '',
  spmb_chair_name: '',
  spmb_chair_title: '',
  spmb_chair_nip: '',
  spmb_chair_signature_path: '',
  default_city: 'Malang'
});

// File upload states
const letterheadImageFile = ref(null);
const letterheadImagePreview = ref('');
const removeLetterheadImage = ref(false);

const logoFile = ref(null);
const logoPreview = ref('');

const principalSigFile = ref(null);
const principalSigPreview = ref('');

const spmbChairSigFile = ref(null);
const spmbChairSigPreview = ref('');

// Supported Placeholders Documentation
const availablePlaceholders = [
  { tag: '{{nama_sekolah_tujuan}}', desc: 'Nama lengkap sekolah sasaran (contoh: SMP Negeri 1 Pakis)' },
  { tag: '{{nama_kepala_sekolah_tujuan}}', desc: 'Nama kepala sekolah atau kontak person tujuan' },
  { tag: '{{alamat_sekolah_tujuan}}', desc: 'Alamat lengkap beserta kecamatan dan kabupaten' },
  { tag: '{{tanggal_surat}}', desc: 'Tanggal surat dalam bahasa Indonesia (contoh: 27 Oktober 2026)' },
  { tag: '{{nomor_surat}}', desc: 'Nomor resmi surat yang digenerate otomatis' },
  { tag: '{{kota_sekolah_tujuan}}', desc: 'Kabupaten atau Kota sekolah sasaran' },
  { tag: '{{telepon_sekolah_tujuan}}', desc: 'Nomor kontak / telepon sekolah' },
  { tag: '{{kontak_person_tujuan}}', desc: 'Nama guru BK / kontak person yang dihubungi' },
  { tag: '{{jabatan_kontak_tujuan}}', desc: 'Jabatan kontak person di sekolah' },
  { tag: '{{nama_lembaga}}', desc: 'Nama lembaga penyelenggara SPMB' },
  { tag: '{{kota_terbit}}', desc: 'Kota tempat surat diterbitkan' }
];

// --- Helpers ---
const copyPlaceholder = (tag) => {
  navigator.clipboard.writeText(tag);
  copiedPlaceholder.value = tag;
  setTimeout(() => {
    copiedPlaceholder.value = '';
  }, 2000);
};

// File handlers
const onLetterheadImageSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file gambar kop surat maksimal 5MB.');
    return;
  }
  letterheadImageFile.value = file;
  letterheadImagePreview.value = URL.createObjectURL(file);
  removeLetterheadImage.value = false;
};

const handleRemoveLetterheadImage = () => {
  letterheadImageFile.value = null;
  letterheadImagePreview.value = '';
  form.letterhead_image_path = '';
  removeLetterheadImage.value = true;
};

const onLogoSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    alert('Ukuran file logo maksimal 3MB.');
    return;
  }
  logoFile.value = file;
  logoPreview.value = URL.createObjectURL(file);
};

const onPrincipalSigSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    alert('Ukuran file tanda tangan maksimal 3MB.');
    return;
  }
  principalSigFile.value = file;
  principalSigPreview.value = URL.createObjectURL(file);
};

const onSpmbChairSigSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    alert('Ukuran file tanda tangan maksimal 3MB.');
    return;
  }
  spmbChairSigFile.value = file;
  spmbChairSigPreview.value = URL.createObjectURL(file);
};

// --- Live Preview Computed Content ---
const liveRenderedBody = computed(() => {
  if (!form.letter_body_template) return '<p class="text-slate-400 italic">Isi surat belum dikonfigurasi.</p>';

  const dummyValues = {
    nama_sekolah_tujuan: 'SMP Negeri 1 Pakis',
    nama_kepala_sekolah_tujuan: 'Drs. H. Mulyadi, M.Pd.',
    alamat_sekolah_tujuan: 'Jl. Raya Pakis No. 10, Pakis, Kab. Malang',
    tanggal_surat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    nomor_surat: `001/${form.letter_number_prefix || 'SPMB/PRES'}/X/${new Date().getFullYear()}`,
    kota_sekolah_tujuan: 'Kabupaten Malang',
    telepon_sekolah_tujuan: '081234567890',
    kontak_person_tujuan: 'Ibu Rahma (Guru BK)',
    jabatan_kontak_tujuan: 'Guru BK',
    nama_lembaga: form.school_name || 'Pesantren Modern & Sekolah Islam Terpadu',
    kota_terbit: form.default_city || 'Malang'
  };

  let rendered = form.letter_body_template;
  for (const [key, val] of Object.entries(dummyValues)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), val);
  }
  return rendered;
});

// --- Fetch Settings ---
const fetchSettings = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const res = await getActiveLetterSettings();
    if (res && res.data) {
      Object.assign(form, res.data);
    }
  } catch (error) {
    errorMessage.value = error.message || 'Gagal memuat pengaturan surat.';
  } finally {
    isLoading.value = false;
  }
};

// --- Save Settings ---
const handleSaveSettings = async () => {
  if (!canEdit.value) {
    alert('Anda tidak memiliki hak akses untuk mengubah pengaturan surat.');
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';
  saveSuccessMessage.value = '';

  try {
    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if (form[key] !== null && form[key] !== undefined) {
        formData.append(key, form[key]);
      }
    });

    if (letterheadImageFile.value) {
      formData.append('letterhead_image', letterheadImageFile.value);
    }
    if (removeLetterheadImage.value) {
      formData.append('remove_letterhead_image', 'true');
    }
    if (logoFile.value) {
      formData.append('logo', logoFile.value);
    }
    if (principalSigFile.value) {
      formData.append('principal_signature', principalSigFile.value);
    }
    if (spmbChairSigFile.value) {
      formData.append('spmb_chair_signature', spmbChairSigFile.value);
    }

    const res = await updateLetterSettings(formData);
    if (res && res.data) {
      Object.assign(form, res.data);
      letterheadImageFile.value = null;
      letterheadImagePreview.value = '';
      removeLetterheadImage.value = false;
      logoFile.value = null;
      principalSigFile.value = null;
      spmbChairSigFile.value = null;
    }

    saveSuccessMessage.value = 'Pengaturan surat dan penandatangan berhasil disimpan.';
    setTimeout(() => {
      saveSuccessMessage.value = '';
    }, 4000);
  } catch (error) {
    errorMessage.value = error.message || 'Gagal menyimpan pengaturan surat.';
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto pb-12">
    <!-- Header Page -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div class="flex items-center gap-3.5">
        <button
          type="button"
          @click="router.push('/admin/crm/schools')"
          class="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Kembali ke Daftar Target"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>

        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200">
              Konfigurasi CRM
            </span>
            <span class="text-xs text-slate-400">• Role Admin & Super Admin</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Pengaturan Surat Permohonan Presentasi
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Konfigurasikan template surat resmi, logo kop lembaga, penomoran, penandatangan, dan pratinjau sebelum penerbitan.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <BaseButton
          type="button"
          variant="primary"
          class="flex items-center gap-2 shadow-sm"
          :isLoading="isSaving"
          :disabled="!canEdit || isSaving"
          @click="handleSaveSettings"
        >
          <Save class="w-4 h-4" />
          Simpan Pengaturan
        </BaseButton>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="saveSuccessMessage" class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <span>{{ saveSuccessMessage }}</span>
    </div>

    <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
      <AlertTriangle class="w-5 h-5 text-rose-600 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-16">
      <BaseLoading text="Memuat konfigurasi surat..." />
    </div>

    <!-- Main Content Form & Preview -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Form Settings (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        <!-- Card 1: Gambar Kop Surat Resmi (Utama) -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
              <Building2 class="w-5 h-5 text-blue-600" />
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">
                  1. Kop Surat Resmi Lembaga (Gambar Header)
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kop surat ditampilkan langsung sebagai gambar utuh di bagian paling atas lembar surat.
                </p>
              </div>
            </div>
          </div>

          <!-- Banner Upload & Preview Area -->
          <div class="space-y-3">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              File Gambar Kop Surat <span class="text-blue-500 font-normal">(Disarankan memanjang horizontal / banner A4, maks. 5MB)</span>
            </label>

            <!-- Preview Banner Box (If image uploaded / exists) -->
            <div
              v-if="letterheadImagePreview || form.letterhead_image_path"
              class="relative rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 p-4 transition-all"
            >
              <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-xs border border-slate-200/80 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                <img
                  :src="resolveStorageUrl(letterheadImagePreview || form.letterhead_image_path)"
                  alt="Preview Kop Surat"
                  class="w-full max-h-40 object-contain"
                />
              </div>

              <div class="mt-3 flex items-center justify-between flex-wrap gap-2">
                <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 class="w-4 h-4" />
                  Gambar kop surat aktif
                </span>

                <div class="flex items-center gap-2">
                  <label class="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer shadow-2xs transition flex items-center gap-1.5">
                    <Upload class="w-3.5 h-3.5 text-slate-500" />
                    Ganti Gambar
                    <input type="file" accept="image/*" class="hidden" @change="onLetterheadImageSelected" />
                  </label>

                  <button
                    type="button"
                    @click="handleRemoveLetterheadImage"
                    class="px-3 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition border border-rose-200 dark:border-rose-800 cursor-pointer"
                  >
                    Hapus Kop
                  </button>
                </div>
              </div>
            </div>

            <!-- Upload Dropzone (If no image yet) -->
            <div
              v-else
              class="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/60 dark:bg-slate-800/40 p-8 text-center transition"
            >
              <div class="mx-auto w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Upload class="w-6 h-6" />
              </div>
              <div class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Unggah File Gambar Kop Surat
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Format PNG, JPG, JPEG, atau WEBP. Siapkan gambar kop surat yang memuat logo, nama yayasan/sekolah, alamat, kontak, dan garis resmi.
              </p>
              <div class="mt-4">
                <label class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition">
                  <Upload class="w-4 h-4" />
                  Pilih Gambar Kop Surat
                  <input type="file" accept="image/*" class="hidden" @change="onLetterheadImageSelected" />
                </label>
              </div>
            </div>
          </div>

          <!-- Collapsible: Data Teks Cadangan / Identitas Lembaga (Optional) -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
            <details class="group">
              <summary class="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer list-none py-2 hover:text-slate-900 dark:hover:text-white transition">
                <span>Data Teks Identitas Lembaga (Opsional / Placeholder &amp; Kop Teks Cadangan)</span>
                <span class="text-slate-400 group-open:rotate-180 transition-transform duration-200">▼</span>
              </summary>
              <div class="grid grid-cols-1 gap-3.5 pt-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nama Lembaga Penyelenggara SPMB
                  </label>
                  <input
                    v-model="form.school_name"
                    type="text"
                    placeholder="Contoh: Pondok Pesantren & SMK Terpadu Asy-Syadzili"
                    class="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Alamat Lengkap Lembaga
                  </label>
                  <textarea
                    v-model="form.school_address"
                    rows="2"
                    placeholder="Contoh: Jl. Raya Asy-Syadzili No. 1, Sumberpasir, Kec. Pakis, Kab. Malang, Jawa Timur 65154"
                    class="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  ></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Telepon Lembaga
                    </label>
                    <input
                      v-model="form.school_phone"
                      type="text"
                      placeholder="0341-791000"
                      class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Email Resmi
                    </label>
                    <input
                      v-model="form.school_email"
                      type="email"
                      placeholder="info@asy-syadzili.sch.id"
                      class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Website Lembaga
                    </label>
                    <input
                      v-model="form.school_website"
                      type="text"
                      placeholder="https://asy-syadzili.sch.id"
                      class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <!-- Upload Logo Cadangan jika tanpa kop gambar -->
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        v-if="logoPreview || form.letterhead_logo_path"
                        :src="resolveStorageUrl(logoPreview || form.letterhead_logo_path)"
                        alt="Logo Kop"
                        class="w-full h-full object-contain p-1"
                      />
                      <Building2 v-else class="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <div class="text-xs font-medium text-slate-800 dark:text-slate-200">Logo Ikon Cadangan</div>
                      <div class="text-[11px] text-slate-400">Digunakan jika kop surat gambar tidak dipasang</div>
                    </div>
                  </div>

                  <label class="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-700 dark:text-slate-200 shadow-2xs">
                    Pilih Logo
                    <input type="file" accept="image/*" class="hidden" @change="onLogoSelected" />
                  </label>
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- Card 2: Format Nomor & Tanggal Surat -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Calendar class="w-5 h-5 text-indigo-600" />
            <h2 class="text-base font-bold text-slate-900 dark:text-white">
              2. Format Nomor & Kota Surat
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prefix Kode Surat
              </label>
              <input
                v-model="form.letter_number_prefix"
                type="text"
                placeholder="SPMB/PRES"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Format Penomoran
              </label>
              <input
                v-model="form.letter_number_format"
                type="text"
                placeholder="{num}/{prefix}/{month_rom}/{year}"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kota Penerbitan Surat
              </label>
              <input
                v-model="form.default_city"
                type="text"
                placeholder="Malang"
                class="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        </div>

        <!-- Card 3: Template Isi Surat (WYSIWYG Editor Times New Roman 12pt) -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
              <FileText class="w-5 h-5 text-emerald-600" />
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">
                  3. Template Isi Surat (Editor WYSIWYG)
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Standar font resmi: <strong>Times New Roman 12pt</strong> dengan spasi 1.5. Gunakan toolbar untuk formatting dan tombol tag untuk menyisipkan data dinamis.
                </p>
              </div>
            </div>
          </div>

          <!-- WYSIWYG Editor Component -->
          <div>
            <LetterWysiwygEditor
              v-model="form.letter_body_template"
              :placeholders="availablePlaceholders"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Teks Penutup (Sebelum tanda tangan)
            </label>
            <input
              v-model="form.closing_text"
              type="text"
              placeholder="Hormat kami,"
              class="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <!-- Card 4: Penandatangan (Dual Signers) -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <PenTool class="w-5 h-5 text-amber-600" />
            <h2 class="text-base font-bold text-slate-900 dark:text-white">
              4. Data Penandatangan Surat (Dua Pihak Bersebelahan)
            </h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Pihak 1: Kepala Lembaga / Sekolah -->
            <div class="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-700">
                <span>Pihak 1: Kepala Lembaga / Pengasuh</span>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap & Gelar</label>
                <input
                  v-model="form.principal_name"
                  type="text"
                  placeholder="KH. Abdul Munir, M.Ag."
                  class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Jabatan Resmi</label>
                <input
                  v-model="form.principal_title"
                  type="text"
                  placeholder="Pengasuh Pesantren / Kepala Sekolah"
                  class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">NIP / NIY (Opsional)</label>
                <input
                  v-model="form.principal_nip"
                  type="text"
                  placeholder="NIP / NIY jika ada"
                  class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <!-- Upload Tanda Tangan Pihak 1 -->
              <div class="pt-1 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div class="w-12 h-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md flex items-center justify-center overflow-hidden">
                    <img
                      v-if="principalSigPreview || form.principal_signature_path"
                      :src="resolveStorageUrl(principalSigPreview || form.principal_signature_path)"
                      alt="TTD Pimpinan"
                      class="w-full h-full object-contain p-0.5"
                    />
                    <PenTool v-else class="w-4 h-4 text-slate-300" />
                  </div>
                  <span class="text-[11px] text-slate-500">File Tanda Tangan & Stempel</span>
                </div>
                <label class="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 shadow-2xs">
                  Upload
                  <input type="file" accept="image/*" class="hidden" @change="onPrincipalSigSelected" />
                </label>
              </div>
            </div>

            <!-- Pihak 2: Ketua Panitia SPMB -->
            <div class="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-700">
                <span>Pihak 2: Ketua Panitia SPMB</span>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap & Gelar</label>
                <input
                  v-model="form.spmb_chair_name"
                  type="text"
                  placeholder="Ust. Ahmad Fauzi, S.Pd."
                  class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Jabatan Resmi</label>
                <input
                  v-model="form.spmb_chair_title"
                  type="text"
                  placeholder="Ketua Panitia SPMB 2026/2027"
                  class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">NIP / NIY (Opsional)</label>
                <input
                  v-model="form.spmb_chair_nip"
                  type="text"
                  placeholder="NIP / NIY jika ada"
                  class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <!-- Upload Tanda Tangan Pihak 2 -->
              <div class="pt-1 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div class="w-12 h-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md flex items-center justify-center overflow-hidden">
                    <img
                      v-if="spmbChairSigPreview || form.spmb_chair_signature_path"
                      :src="resolveStorageUrl(spmbChairSigPreview || form.spmb_chair_signature_path)"
                      alt="TTD Ketua SPMB"
                      class="w-full h-full object-contain p-0.5"
                    />
                    <PenTool v-else class="w-4 h-4 text-slate-300" />
                  </div>
                  <span class="text-[11px] text-slate-500">File Tanda Tangan & Stempel</span>
                </div>
                <label class="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 shadow-2xs">
                  Upload
                  <input type="file" accept="image/*" class="hidden" @change="onSpmbChairSigSelected" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end">
          <BaseButton
            type="button"
            variant="primary"
            class="flex items-center gap-2 shadow-sm"
            :isLoading="isSaving"
            :disabled="!canEdit || isSaving"
            @click="handleSaveSettings"
          >
            <Save class="w-4 h-4" />
            Simpan Seluruh Pengaturan Surat
          </BaseButton>
        </div>
      </div>

      <!-- Right Column: Live A4 Visual Preview (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <div class="sticky top-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Eye class="w-4 h-4 text-blue-600" />
              Pratinjau Live Lembar Surat A4
            </span>
            <span class="text-[11px] text-slate-400">Contoh data sekolah dummy</span>
          </div>

          <!-- Paper Container with Times New Roman 12pt -->
          <div
            class="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md max-h-[85vh] overflow-y-auto leading-normal"
            style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;"
          >
            <!-- Kop Surat: Gambar Kop Utama jika diupload -->
            <div v-if="letterheadImagePreview || form.letterhead_image_path" class="mb-4">
              <img
                :src="resolveStorageUrl(letterheadImagePreview || form.letterhead_image_path)"
                alt="Kop Surat Resmi"
                class="w-full object-contain max-h-36 mx-auto"
              />
            </div>

            <!-- Kop Surat: Fallback Teks Standar jika belum ada gambar kop -->
            <div v-else class="mb-4">
              <div class="flex items-center gap-4 pb-3 border-b-2 border-slate-900">
                <div v-if="logoPreview || form.letterhead_logo_path" class="w-16 h-16 shrink-0 flex items-center justify-center">
                  <img :src="resolveStorageUrl(logoPreview || form.letterhead_logo_path)" alt="Logo" class="max-w-full max-h-full object-contain" />
                </div>
                <div class="text-center flex-1">
                  <div class="font-bold text-sm tracking-wide uppercase text-slate-950 font-sans">
                    {{ form.school_name || 'NAMA LEMBAGA PENDIDIKAN' }}
                  </div>
                  <div class="text-[10px] text-slate-600 font-sans mt-0.5">
                    PANITIA SELEKSI PENERIMAAN SANTRI / SISWA BARU (SPMB)
                  </div>
                  <div class="text-[9px] text-slate-500 font-sans mt-0.5">
                    {{ form.school_address || 'Alamat lembaga belum diisi' }}
                  </div>
                  <div class="text-[9px] text-slate-500 font-sans">
                    Telp: {{ form.school_phone || '-' }} • Email: {{ form.school_email || '-' }} • Web: {{ form.school_website || '-' }}
                  </div>
                </div>
              </div>
              <div class="border-b border-slate-900 mt-0.5"></div>
            </div>

            <!-- Header Surat (Nomor, Hal, Tanggal) -->
            <div class="flex justify-between items-start mb-6" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              <table class="border-collapse p-0 m-0" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
                <tbody>
                  <tr>
                    <td class="pr-2 align-top font-normal">Nomor</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-normal">001/{{ form.letter_number_prefix || 'SPMB/PRES' }}/X/{{ new Date().getFullYear() }}</td>
                  </tr>
                  <tr>
                    <td class="pr-2 align-top font-normal">Lampiran</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-normal">1 (Satu) Berkas Brosur</td>
                  </tr>
                  <tr>
                    <td class="pr-2 align-top font-normal">Hal</td>
                    <td class="pr-2 align-top">:</td>
                    <td class="align-top font-semibold">Permohonan Izin Presentasi SPMB</td>
                  </tr>
                </tbody>
              </table>
              <div class="text-right" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
                {{ form.default_city || 'Malang' }}, {{ new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}
              </div>
            </div>

            <!-- Letter Body with Times New Roman 12pt -->
            <div class="space-y-4 my-6 leading-normal live-rendered-letter-body" v-html="liveRenderedBody" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;"></div>

            <!-- Closing -->
            <div class="mt-6 mb-6" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              {{ form.closing_text || 'Hormat kami,' }}
            </div>

            <!-- Dual Signatures Block -->
            <div class="grid grid-cols-2 gap-8 text-center pt-2" style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;">
              <!-- Signer 1 -->
              <div>
                <div class="text-slate-900 mb-1">
                  {{ form.principal_title || 'Kepala Sekolah' }},
                </div>
                <div class="h-16 flex items-center justify-center my-1">
                  <img
                    v-if="principalSigPreview || form.principal_signature_path"
                    :src="resolveStorageUrl(principalSigPreview || form.principal_signature_path)"
                    alt="TTD 1"
                    class="max-h-14 max-w-full object-contain"
                  />
                  <div v-else class="text-xs text-slate-300 italic font-serif">(Tanda Tangan)</div>
                </div>
                <div class="font-bold underline text-slate-900">
                  {{ form.principal_name || '(Nama Kepala Sekolah)' }}
                </div>
                <div v-if="form.principal_nip" class="text-slate-900 mt-0.5">
                  NIP. {{ form.principal_nip }}
                </div>
              </div>

              <!-- Signer 2 -->
              <div>
                <div class="text-slate-900 mb-1">
                  {{ form.spmb_chair_title || 'Ketua Panitia SPMB' }},
                </div>
                <div class="h-16 flex items-center justify-center my-1">
                  <img
                    v-if="spmbChairSigPreview || form.spmb_chair_signature_path"
                    :src="resolveStorageUrl(spmbChairSigPreview || form.spmb_chair_signature_path)"
                    alt="TTD 2"
                    class="max-h-14 max-w-full object-contain"
                  />
                  <div v-else class="text-xs text-slate-300 italic font-serif">(Tanda Tangan)</div>
                </div>
                <div class="font-bold underline text-slate-900">
                  {{ form.spmb_chair_name || '(Nama Ketua SPMB)' }}
                </div>
                <div v-if="form.spmb_chair_nip" class="text-slate-900 mt-0.5">
                  NIP. {{ form.spmb_chair_nip }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
