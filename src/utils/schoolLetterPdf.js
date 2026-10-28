import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Pre-convert an image to a base64 data URL
 * Uses fetch blob first (handles CORS static assets cleanly), with Image+canvas fallback.
 * Ensures html-to-image never triggers cross-origin or fetch failures inside SVG foreignObject.
 */
const convertImageToBase64 = async (imgSrc) => {
  if (!imgSrc || typeof imgSrc !== 'string' || imgSrc.startsWith('data:')) {
    return imgSrc;
  }

  // 1. Try fetching directly as blob
  try {
    const res = await fetch(imgSrc, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(imgSrc);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    // Fall back to Image + Canvas
  }

  // 2. Fallback to Image + Canvas
  return new Promise((resolve) => {
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';

    tempImg.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = tempImg.naturalWidth || tempImg.width || 300;
        canvas.height = tempImg.naturalHeight || tempImg.height || 100;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempImg, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(imgSrc);
      }
    };

    tempImg.onerror = () => {
      resolve(imgSrc);
    };

    tempImg.src = imgSrc;
  });
};

/**
 * Creates a clean, isolated clone of the letter DOM element:
 * 1. Sanitizes Microsoft Word / Office XML tags (like <o:p>, <w:...>) that break browser SVG XML parsers
 * 2. Inlines all images as Base64 Data URLs so no network fetches or tainted canvases happen
 * 3. Mounts offscreen with standard A4 letter dimensions and Times New Roman 12pt
 * IMPORTANT: Clone is positioned fixed at (0, 0) with z-index: -99999 so SVG foreignObject
 * renders content at (0, 0) instead of being shifted offscreen (which caused blank PDFs).
 */
const createCleanLetterClone = async (letterElement) => {
  const clone = letterElement.cloneNode(true);

  // 1. Sanitize any Word/Office XML tags with colons (e.g. <o:p>)
  const allNodes = Array.from(clone.querySelectorAll('*'));
  for (const node of allNodes) {
    if (node.tagName && node.tagName.includes(':')) {
      while (node.firstChild) {
        node.parentNode.insertBefore(node.firstChild, node);
      }
      node.remove();
    }
  }

  // Strip Word comments and conditional comments
  clone.innerHTML = clone.innerHTML
    .replace(/<\/?\w+:\w+[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');

  // 2. Pre-convert all images in clone to Base64
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (img.src && !img.src.startsWith('data:')) {
        img.src = await convertImageToBase64(img.src);
      }
    })
  );

  // 3. Style clone for offscreen rendering
  // Must be positioned at left: 0, top: 0 so inside SVG foreignObject it is at (0, 0)
  clone.style.position = 'fixed';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.width = '210mm';
  clone.style.minHeight = '297mm';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#000000';
  clone.style.fontFamily = "'Times New Roman', Times, serif";
  clone.style.fontSize = '12pt';
  clone.style.lineHeight = '1.5';
  clone.style.zIndex = '-99999';
  clone.style.pointerEvents = 'none';
  clone.style.boxSizing = 'border-box';
  clone.style.margin = '0';

  document.body.appendChild(clone);
  return clone;
};

/**
 * Download a letter DOM element as an A4 PDF document
 * Uses html-to-image with pre-inlined assets to natively support modern CSS (oklch, Tailwind CSS v4)
 * @param {HTMLElement|{value: HTMLElement}} letterElement - The DOM element containing the rendered A4 letter
 * @param {string} filename - Suggested filename for the download
 */
export const downloadLetterAsPdf = async (letterElement, filename = 'Surat_Permohonan_Presentasi.pdf') => {
  const el = letterElement?.value || letterElement;
  if (!el || !(el instanceof HTMLElement)) {
    throw new Error('Elemen surat tidak ditemukan untuk dirender ke PDF.');
  }

  const cleanClone = await createCleanLetterClone(el);

  const targetWidth = cleanClone.offsetWidth || 794;
  const targetHeight = cleanClone.offsetHeight || 1123;

  const pngOptions = {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    skipFonts: true,
    fontEmbedCSS: '',
    cacheBust: false,
    width: targetWidth,
    height: targetHeight,
    onImageErrorHandler: () => '',
    filter: (node) => {
      if (node.nodeName && node.nodeName.includes(':')) {
        return false;
      }
      return true;
    }
  };

  let dataUrl;
  try {
    dataUrl = await toPng(cleanClone, pngOptions);
  } catch (primaryError) {
    console.warn('Percobaan pertama toPng gagal, mencoba mode fallback...', primaryError);
    try {
      dataUrl = await toPng(cleanClone, {
        ...pngOptions,
        pixelRatio: 1.5,
        quality: 0.92
      });
    } catch (fallbackError) {
      const errDetail = fallbackError instanceof Error
        ? fallbackError.message
        : (fallbackError?.type ? `Error render: ${fallbackError.type}` : 'Gagal memproses gambar');
      throw new Error(errDetail);
    }
  } finally {
    if (cleanClone && cleanClone.parentNode) {
      cleanClone.parentNode.removeChild(cleanClone);
    }
  }

  // Calculate natural aspect ratio
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = (e) => reject(new Error('Gagal memproses gambar surat untuk PDF: ' + (e?.message || 'Decode error')));
    img.src = dataUrl;
  });

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = 210;
  const pageHeight = 297;
  const totalPdfHeight = (img.height * pdfWidth) / img.width;

  if (totalPdfHeight <= pageHeight) {
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, totalPdfHeight);
  } else if (totalPdfHeight <= pageHeight + 15) {
    // If it only overflows slightly (within 15mm), fit onto 1 single page cleanly
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pageHeight);
  } else {
    // Multi-page slicing
    let heightLeft = totalPdfHeight;
    let position = 0;

    pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, totalPdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, totalPdfHeight);
      heightLeft -= pageHeight;
    }
  }

  pdf.save(filename);
};

/**
 * Open print window for a letter DOM element with complete standalone CSS styling
 * Ensures signatures are side-by-side, images are fully loaded, and formatting is pixel-perfect.
 * @param {HTMLElement|{value: HTMLElement}} letterElement
 */
export const printLetterElement = (letterElement) => {
  const el = letterElement?.value || letterElement;
  if (!el || !(el instanceof HTMLElement)) {
    alert('Elemen surat tidak ditemukan untuk dicetak.');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    alert('Pop-up terblokir. Harap izinkan pop-up untuk mencetak surat.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Surat Permohonan Presentasi</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 20mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 12pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .letter-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
          }
          img {
            max-width: 100%;
            height: auto;
            display: inline-block;
          }
          .no-print {
            display: none !important;
          }

          /* Two-Column Signature & Grid Layout */
          .grid, .grid-cols-2 {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin-top: 16px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .grid-cols-2 > div {
            flex: 1 1 0% !important;
            width: 48% !important;
            max-width: 48% !important;
            text-align: center !important;
          }

          /* Flexbox Utilities */
          .flex {
            display: flex !important;
          }
          .items-center {
            align-items: center !important;
          }
          .items-start {
            align-items: flex-start !important;
          }
          .justify-center {
            justify-content: center !important;
          }
          .justify-between {
            justify-content: space-between !important;
          }
          .gap-5 {
            gap: 1.25rem !important;
          }
          .gap-8 {
            gap: 2rem !important;
          }
          .flex-1 {
            flex: 1 1 0% !important;
          }
          .shrink-0 {
            flex-shrink: 0 !important;
          }

          /* Typography & Alignment */
          .text-center {
            text-align: center !important;
          }
          .text-right {
            text-align: right !important;
          }
          .font-bold {
            font-weight: bold !important;
          }
          .underline {
            text-decoration: underline !important;
          }
          .italic {
            font-style: italic !important;
          }
          .uppercase {
            text-transform: uppercase !important;
          }
          .tracking-wide {
            letter-spacing: 0.025em !important;
          }
          .font-sans {
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .font-serif {
            font-family: 'Times New Roman', Times, serif !important;
          }
          .text-base { font-size: 13pt !important; }
          .text-xs { font-size: 10pt !important; }
          .text-\\[10px\\] { font-size: 9pt !important; }
          .text-\\[9px\\] { font-size: 8pt !important; }

          /* Signature Box & Image Dimensions */
          .h-20 {
            height: 75px !important;
            min-height: 75px !important;
          }
          .h-16 {
            height: 60px !important;
            min-height: 60px !important;
          }
          .max-h-16 {
            max-height: 60px !important;
          }
          .max-h-14 {
            max-height: 52px !important;
          }
          .max-h-36 {
            max-height: 120px !important;
          }
          .w-20 {
            width: 75px !important;
          }
          .object-contain {
            object-fit: contain !important;
          }
          .mx-auto {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .w-full {
            width: 100% !important;
          }

          /* Margins & Spacing */
          .mb-1 { margin-bottom: 4px !important; }
          .my-1 { margin-top: 4px !important; margin-bottom: 4px !important; }
          .mt-0\\.5 { margin-top: 2px !important; }
          .mb-4 { margin-bottom: 12px !important; }
          .mb-5 { margin-bottom: 16px !important; }
          .mb-6 { margin-bottom: 20px !important; }
          .my-6 { margin-top: 16px !important; margin-bottom: 16px !important; }
          .mt-6 { margin-top: 20px !important; }
          .pt-2 { padding-top: 8px !important; }
          .pb-3 { padding-bottom: 10px !important; }
          .pr-2 { padding-right: 8px !important; }
          .space-y-4 > * + * { margin-top: 14px !important; }

          /* Borders */
          .border-b-2 { border-bottom: 2px solid #000 !important; }
          .border-b { border-bottom: 1px solid #000 !important; }
          .border-slate-900 { border-color: #000 !important; }

          /* Colors */
          .text-slate-950, .text-slate-900 { color: #000 !important; }
          .text-slate-700 { color: #333 !important; }
          .text-slate-600 { color: #444 !important; }
          .text-slate-500 { color: #666 !important; }
          .text-slate-300 { color: #bbb !important; }

          /* Tables */
          table {
            border-collapse: collapse;
          }
          td.align-top {
            vertical-align: top;
          }
        </style>
      </head>
      <body>
        <div class="letter-container">
          ${el.innerHTML}
        </div>
        <script>
          window.onload = function() {
            var images = Array.from(document.images);
            var loadedCount = 0;
            var total = images.length;
            
            function triggerPrint() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 300);
            }
            
            if (total === 0) {
              triggerPrint();
            } else {
              images.forEach(function(img) {
                if (img.complete) {
                  loadedCount++;
                  if (loadedCount === total) triggerPrint();
                } else {
                  img.addEventListener('load', function() {
                    loadedCount++;
                    if (loadedCount === total) triggerPrint();
                  });
                  img.addEventListener('error', function() {
                    loadedCount++;
                    if (loadedCount === total) triggerPrint();
                  });
                }
              });
              // Fallback safety timeout if an image event is swallowed
              setTimeout(triggerPrint, 1800);
            }
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export default {
  downloadLetterAsPdf,
  printLetterElement
};
