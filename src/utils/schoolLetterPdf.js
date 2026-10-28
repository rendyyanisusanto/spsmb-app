import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Download a letter DOM element as an A4 PDF document
 * Uses html-to-image to natively support modern CSS (oklch, Tailwind CSS v4)
 * @param {HTMLElement} letterElement - The DOM element containing the rendered A4 letter
 * @param {string} filename - Suggested filename for the download
 */
/**
 * Pre-convert an image to a base64 data URL via canvas
 * Ensures html-to-image never triggers cross-origin or fetch failures inside SVG foreignObject
 */
const convertImageToBase64 = (imgSrc) => {
  return new Promise((resolve) => {
    if (!imgSrc || imgSrc.startsWith('data:')) {
      return resolve(imgSrc);
    }

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
 * 2. Inlines all images as Base64 Data URLs so no network fetches are needed in foreignObject
 * 3. Mounts offscreen with standard A4 letter dimensions and Times New Roman 12pt
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
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = '210mm';
  clone.style.minHeight = '297mm';
  clone.style.backgroundColor = '#ffffff';
  clone.style.fontFamily = "'Times New Roman', Times, serif";
  clone.style.fontSize = '12pt';
  clone.style.lineHeight = '1.5';
  clone.style.zIndex = '-9999';

  document.body.appendChild(clone);
  return clone;
};

/**
 * Download a letter DOM element as an A4 PDF document
 * Uses html-to-image with pre-inlined assets to natively support modern CSS (oklch, Tailwind CSS v4)
 * @param {HTMLElement} letterElement - The DOM element containing the rendered A4 letter
 * @param {string} filename - Suggested filename for the download
 */
export const downloadLetterAsPdf = async (letterElement, filename = 'Surat_Permohonan_Presentasi.pdf') => {
  if (!letterElement) {
    throw new Error('Elemen surat tidak ditemukan untuk dirender ke PDF.');
  }

  const cleanClone = await createCleanLetterClone(letterElement);

  const pngOptions = {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    skipFonts: true,
    fontEmbedCSS: '',
    cacheBust: false,
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
  const pdfHeight = (img.height * pdfWidth) / img.width;

  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));
  pdf.save(filename);
};

/**
 * Open print window for a letter DOM element
 * @param {HTMLElement} letterElement
 */
export const printLetterElement = (letterElement) => {
  if (!letterElement) return;

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
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 12pt;
          }
          .letter-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="letter-container">
          ${letterElement.innerHTML}
        </div>
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
