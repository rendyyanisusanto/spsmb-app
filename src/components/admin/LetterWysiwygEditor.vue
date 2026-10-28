<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Undo2,
  Redo2,
  RemoveFormatting,
  Code,
  Tag,
  Copy
} from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholders: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Ketikkan isi surat di sini...'
  }
});

const emit = defineEmits(['update:modelValue']);

const editorRef = ref(null);
const isCodeView = ref(false);
const rawHtml = ref('');
const savedSelection = ref(null);

const activeStates = ref({
  bold: false,
  italic: false,
  underline: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  justifyFull: false,
  insertUnorderedList: false,
  insertOrderedList: false
});

const saveSelection = () => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && editorRef.value && editorRef.value.contains(sel.anchorNode)) {
    savedSelection.value = sel.getRangeAt(0).cloneRange();
    updateActiveStates();
  }
};

const updateActiveStates = () => {
  try {
    activeStates.value.bold = document.queryCommandState('bold');
    activeStates.value.italic = document.queryCommandState('italic');
    activeStates.value.underline = document.queryCommandState('underline');
    activeStates.value.justifyLeft = document.queryCommandState('justifyLeft');
    activeStates.value.justifyCenter = document.queryCommandState('justifyCenter');
    activeStates.value.justifyRight = document.queryCommandState('justifyRight');
    activeStates.value.justifyFull = document.queryCommandState('justifyFull');
    activeStates.value.insertUnorderedList = document.queryCommandState('insertUnorderedList');
    activeStates.value.insertOrderedList = document.queryCommandState('insertOrderedList');
  } catch (e) {
    // queryCommandState may throw in certain edge contexts
  }
};

const exec = (command, value = null) => {
  if (isCodeView.value) return;
  if (!editorRef.value) return;

  editorRef.value.focus();
  if (savedSelection.value) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelection.value);
  }

  document.execCommand(command, false, value);
  handleInput();
  saveSelection();
};

const handleInput = () => {
  if (!editorRef.value) return;
  const html = editorRef.value.innerHTML;
  rawHtml.value = html;
  emit('update:modelValue', html);
};

const handleRawHtmlInput = (e) => {
  const html = e.target.value;
  rawHtml.value = html;
  if (editorRef.value) {
    editorRef.value.innerHTML = html;
  }
  emit('update:modelValue', html);
};

const handlePaste = (e) => {
  e.preventDefault();
  const html = e.clipboardData?.getData('text/html');
  const text = e.clipboardData?.getData('text/plain');

  if (html) {
    // Strip Word/Office XML namespace tags, comments, conditional comments
    const cleanedHtml = html
      .replace(/<\/?\w+:\w+[^>]*>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');
    document.execCommand('insertHTML', false, cleanedHtml);
  } else if (text) {
    document.execCommand('insertText', false, text);
  }
  handleInput();
  saveSelection();
};

const toggleCodeView = () => {
  if (isCodeView.value) {
    // Leaving code view
    if (editorRef.value) {
      editorRef.value.innerHTML = rawHtml.value;
    }
    isCodeView.value = false;
  } else {
    // Entering code view
    if (editorRef.value) {
      rawHtml.value = editorRef.value.innerHTML;
    }
    isCodeView.value = true;
  }
};

const insertTag = (tag) => {
  if (isCodeView.value) {
    rawHtml.value += tag;
    if (editorRef.value) editorRef.value.innerHTML = rawHtml.value;
    emit('update:modelValue', rawHtml.value);
    return;
  }

  if (!editorRef.value) return;
  editorRef.value.focus();

  if (savedSelection.value) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelection.value);
  }

  document.execCommand('insertText', false, tag);
  handleInput();
  saveSelection();
};

watch(() => props.modelValue, (newVal) => {
  if (editorRef.value && newVal !== editorRef.value.innerHTML && !isCodeView.value) {
    editorRef.value.innerHTML = newVal || '';
    rawHtml.value = newVal || '';
  }
});

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || '';
    rawHtml.value = props.modelValue || '';
  }
  document.addEventListener('selectionchange', saveSelection);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', saveSelection);
});
</script>

<template>
  <div class="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
    <!-- Toolbar -->
    <div class="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 p-2 flex flex-wrap items-center gap-1 text-slate-700 dark:text-slate-200">
      <!-- Font Family & Size Indicator -->
      <div class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs mr-1">
        <span class="font-serif">Times New Roman</span>
        <span class="text-slate-300 dark:text-slate-500">|</span>
        <span class="text-[11px] text-blue-600 dark:text-blue-400">12pt</span>
      </div>

      <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <!-- Text Formatting -->
      <button
        type="button"
        title="Tebal (Ctrl+B)"
        @click="exec('bold')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.bold ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <Bold class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Miring (Ctrl+I)"
        @click="exec('italic')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.italic ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <Italic class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Garis Bawah (Ctrl+U)"
        @click="exec('underline')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.underline ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <Underline class="w-4 h-4" />
      </button>

      <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <!-- Alignments -->
      <button
        type="button"
        title="Rata Kiri"
        @click="exec('justifyLeft')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.justifyLeft ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <AlignLeft class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Rata Tengah"
        @click="exec('justifyCenter')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.justifyCenter ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <AlignCenter class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Rata Kanan"
        @click="exec('justifyRight')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.justifyRight ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <AlignRight class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Rata Kanan-Kiri (Justify Standar Surat)"
        @click="exec('justifyFull')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.justifyFull ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <AlignJustify class="w-4 h-4" />
      </button>

      <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <!-- Lists -->
      <button
        type="button"
        title="Daftar Butir (Bullet)"
        @click="exec('insertUnorderedList')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.insertUnorderedList ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <List class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Daftar Nomor"
        @click="exec('insertOrderedList')"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="activeStates.insertOrderedList ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        <ListOrdered class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Kurangi Indentasi"
        @click="exec('outdent')"
        class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
      >
        <Outdent class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Tambah Indentasi"
        @click="exec('indent')"
        class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
      >
        <Indent class="w-4 h-4" />
      </button>

      <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

      <!-- Undo / Redo / Clear -->
      <button
        type="button"
        title="Urungkan (Ctrl+Z)"
        @click="exec('undo')"
        class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
      >
        <Undo2 class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Ulangi (Ctrl+Y)"
        @click="exec('redo')"
        class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
      >
        <Redo2 class="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Hapus Format Teks"
        @click="exec('removeFormat')"
        class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
      >
        <RemoveFormatting class="w-4 h-4" />
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <!-- Toggle Code View -->
        <button
          type="button"
          :title="isCodeView ? 'Kembali ke Tampilan Visual' : 'Lihat / Edit Kode HTML'"
          @click="toggleCodeView"
          class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          :class="isCodeView ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100'"
        >
          <Code class="w-3.5 h-3.5" />
          <span>{{ isCodeView ? 'Mode Visual' : 'HTML' }}</span>
        </button>
      </div>
    </div>

    <!-- Quick Placeholder Dropdown Toolbar -->
    <div v-if="placeholders.length > 0" class="bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 px-3 py-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span class="text-[11px] font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1 mr-1">
        <Tag class="w-3 h-3 text-blue-600" />
        Sisipkan Tag:
      </span>
      <button
        v-for="p in placeholders"
        :key="p.tag"
        type="button"
        @mousedown.prevent="insertTag(p.tag)"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-400 transition cursor-pointer"
        :title="`Klik untuk menyisipkan ${p.tag} di posisi kursor (${p.desc})`"
      >
        <span>{{ p.tag }}</span>
      </button>
    </div>

    <!-- Editing Area -->
    <div class="relative min-h-[340px] max-h-[600px] overflow-y-auto p-6 bg-white dark:bg-slate-900">
      <!-- WYSIWYG Visual Editor -->
      <div
        v-show="!isCodeView"
        ref="editorRef"
        contenteditable="true"
        @input="handleInput"
        @paste="handlePaste"
        @mouseup="saveSelection"
        @keyup="saveSelection"
        class="focus:outline-none min-h-[300px] text-slate-900 dark:text-slate-100 leading-normal wysiwyg-letter-content"
        style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5;"
      ></div>

      <!-- Raw HTML Editor Textarea -->
      <textarea
        v-show="isCodeView"
        :value="rawHtml"
        @input="handleRawHtmlInput"
        class="w-full h-full min-h-[300px] font-mono text-xs p-3 bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl focus:outline-none leading-relaxed"
        placeholder="Edit kode HTML di sini..."
      ></textarea>
    </div>

    <!-- Footer Stats -->
    <div class="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
      <div>
        <span>Standar Resmi: </span>
        <strong class="text-slate-700 dark:text-slate-300 font-serif">Times New Roman 12pt</strong>
        <span class="ml-2">• Spasi 1.5</span>
      </div>
      <div class="text-[10px] text-slate-400">
        Klik tag placeholder di atas untuk menyisipkan otomatis ke surat
      </div>
    </div>
  </div>
</template>

<style scoped>
.wysiwyg-letter-content :deep(p) {
  margin-bottom: 0.85em;
}
.wysiwyg-letter-content :deep(p:last-child) {
  margin-bottom: 0;
}
.wysiwyg-letter-content :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.85em;
}
.wysiwyg-letter-content :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.85em;
}
.wysiwyg-letter-content :deep(li) {
  margin-bottom: 0.25em;
}
</style>
