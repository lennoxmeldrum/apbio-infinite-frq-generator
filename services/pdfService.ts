import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { GeneratedFRQ, AssessmentResult } from '../types';
import PrintableContent from '../components/PrintableContent';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Get formatted sub-unit string for header/filename
export const getSubUnitsString = (selected: string[], actual?: string[]): string => {
  const topicsToDisplay = actual && actual.length > 0 ? actual : selected;

  if (!topicsToDisplay || topicsToDisplay.length === 0) return 'random';
  if (topicsToDisplay.length === 1) return `topic ${topicsToDisplay[0]}`;

  // Sort naturally to keep things tidy (e.g. 1.1, 1.2, 1.10)
  const sorted = [...topicsToDisplay].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  return `topics ${sorted.join(', ')}`;
};

// Generate filename for PDF (user-facing download filename — deterministic).
export const generatePDFFilename = (frq: GeneratedFRQ): string => {
  const { frqTypeShort, selectedSubTopics, actualSubTopics } = frq.metadata;
  const subUnitsStr = getSubUnitsString(selectedSubTopics, actualSubTopics);
  return `AP BIO FRQ - ${frqTypeShort} - ${subUnitsStr}.pdf`;
};

// Generate archive filename for Firebase Storage — adds a UTC timestamp
// suffix (YYYYMMDD-HHmmss-ms) so identical selections never collide and
// silently overwrite one another in the archive bucket. The user-facing
// download filename is unchanged; only the storage path is made unique.
export const generateArchiveFilename = (frq: GeneratedFRQ): string => {
  const base = generatePDFFilename(frq).replace(/\.pdf$/i, '');
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const stamp =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}` +
    `-${pad(now.getUTCMilliseconds(), 3)}`;
  return `${base} - ${stamp}.pdf`;
};

const KATEX_FONT_FAMILIES = [
  'KaTeX_Main',
  'KaTeX_Math',
  'KaTeX_Main-Bold',
  'KaTeX_Size1',
  'KaTeX_Size2',
  'KaTeX_Size3',
  'KaTeX_Size4',
];

const loadKatexFonts = async () => {
  try {
    // Request the most common KaTeX faces so layout is stable before capture
    await Promise.all(
      KATEX_FONT_FAMILIES.map((family) =>
        document.fonts.load(`400 18px "${family}"`)
      )
    );
  } catch (e) {
    console.warn('Could not preload KaTeX fonts', e);
  }
};

// Convert Base64 data URI to Blob URL (html2canvas handles these better)
const dataURItoBlob = (dataURI: string): Blob => {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

// Ultra-robust helper to ensure all images are fully loaded and decoded
const waitForImages = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) {
    console.log('No images found in this section');
    return;
  }

  console.log(`Found ${images.length} images to wait for`);

  const promises = images.map(async (img, index) => {
    try {
      // CRITICAL FIX: Convert Base64 data URIs to Blob URLs
      // html2canvas has issues with large Base64 strings
      if (img.src.startsWith('data:')) {
        console.log(`Converting image ${index + 1} from data URI to Blob URL...`);
        const blob = dataURItoBlob(img.src);
        const blobUrl = URL.createObjectURL(blob);

        // Wait for new blob URL to load
        await new Promise<void>((resolve) => {
          const newImg = img.cloneNode() as HTMLImageElement;
          newImg.onload = () => {
            // Replace the data URI with blob URL
            img.src = blobUrl;
            console.log(`Image ${index + 1} converted to Blob URL`);
            resolve();
          };
          newImg.onerror = () => {
            console.warn(`Failed to convert image ${index + 1}`);
            resolve();
          };
          newImg.src = blobUrl;
        });
      }

      // Use the decode() API if available
      if ('decode' in img) {
        console.log(`Decoding image ${index + 1}...`);
        await img.decode();
        console.log(`Image ${index + 1} decoded successfully`);
      } else {
        // Fallback for older browsers
        if (img.complete && img.naturalWidth > 0) {
          console.log(`Image ${index + 1} already complete`);
          await new Promise(r => setTimeout(r, 100));
        } else {
          console.log(`Waiting for image ${index + 1} to load...`);
          await new Promise<void>((resolve) => {
            img.onload = () => {
              console.log(`Image ${index + 1} loaded`);
              resolve();
            };
            img.onerror = () => {
              console.warn(`Image ${index + 1} failed to load`);
              resolve();
            };
          });
        }
      }
    } catch (error) {
      console.warn(`Error with image ${index + 1}:`, error);
    }
  });

  await Promise.all(promises);

  // CRITICAL: Extra delay to let browser actually PAINT the decoded images
  console.log('All images processed, waiting for paint...');
  await new Promise(r => setTimeout(r, 500));
  console.log('Paint complete');
};

export interface PDFGenerationOptions {
  includeSubmissionFeedback: boolean;
  includeChatHistory: boolean;
}

// Main PDF generation function using html2canvas and jsPDF
export const generatePDF = async (
  frq: GeneratedFRQ,
  result: AssessmentResult | null,
  chatMessages: ChatMessage[],
  options: PDFGenerationOptions = { includeSubmissionFeedback: true, includeChatHistory: true }
): Promise<Blob> => {
  // Create a temporary container for rendering
  const container = document.createElement('div');
  // Position container on-screen but hidden with opacity to ensure proper rendering (display:none breaks layout)
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '8.5in'; // Standard letter width for accurate layout reflow
  container.style.zIndex = '-1000';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  try {
    // Attempt to extract existing KaTeX CSS to ensure fonts are picked up
    const katexStyles = Array.from(document.styleSheets).find(sheet => {
      try {
        return sheet.href && sheet.href.includes('katex');
      } catch (e) {
        return false;
      }
    });

    let katexCSS = '';
    if (katexStyles) {
      try {
        const rules = Array.from(katexStyles.cssRules || []);
        katexCSS = rules.map(rule => rule.cssText).join('\n');
        // Fix relative font URLs to absolute CDN URLs
        katexCSS = katexCSS
          .replace(/url\((["']?)\.\.\/fonts\//g, 'url($1https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/')
          .replace(/url\((["']?)fonts\//g, 'url($1https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/')
          .replace(/url\((["']?)\/fonts\//g, 'url($1https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/');
      } catch (e) {
        console.warn('Could not extract KaTeX CSS:', e);
      }
    }

    const root = createRoot(container);

    // Wrap rendering in a Promise
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(PrintableContent, {
          frq,
          result,
          chatMessages,
          includeSubmissionFeedback: options.includeSubmissionFeedback,
          includeChatHistory: options.includeChatHistory,
        })
      );

      // 1. Inject KaTeX CSS
      if (katexCSS) {
        const style = document.createElement('style');
        style.textContent = katexCSS;
        container.appendChild(style);
      }

      // 2. Inject Fixes for PDF Generation
      // We use !important to override any styles in PrintableContent.tsx and KaTeX defaults
      const fractionFixCSS = document.createElement('style');
      fractionFixCSS.textContent = `
        /* FIX FRACTION RENDERING IN HTML2CANVAS
           The border-bottom method often renders as 0px or a hairline in canvas.
           We force a block with a set height and background color.
        */
        .katex .frac-line {
          border: none !important;
          border-bottom: none !important;
          background-color: #000000 !important;
          height: 1.2px !important; /* Slightly thinner for polish */
          min-height: 1.2px !important;
          opacity: 1 !important;
          display: block !important;
          width: 100% !important;
        }

        /* Ensure the fraction stack doesn't collapse */
        .katex .mfrac .vlist-t2 {
          vertical-align: middle !important;
        }

        /* Fix Sqrt lines similarly */
        .katex .sqrt .sqrt-line {
          background-color: #000000 !important;
          height: 1.2px !important;
          border: none !important;
        }

        /* Fix overlines */
        .katex .overline .overline-line {
          background-color: #000000 !important;
          height: 1.2px !important;
          border: none !important;
        }
      `;
      container.appendChild(fractionFixCSS);

      // Wait for layout and fonts
      setTimeout(async () => {
        try {
          await loadKatexFonts();
          await document.fonts.ready;

          // Force reflow
          container.style.display = 'none';
          //Trigger reflow
          void container.offsetHeight;
          container.style.display = 'block';
        } catch (e) {
          console.warn('Loading check failed:', e);
        }
        // Extra delay for KaTeX layout calculation stability
        setTimeout(() => resolve(), 2000);
      }, 500);
    });

    // Make visible for capture (opacity 0 -> 1)
    container.style.opacity = '1';

    // CRITICAL: Wait for browser to actually paint the visible container
    // This ensures Base64 images start rendering before we query for sections
    await new Promise(r => setTimeout(r, 1000));
    console.log('Container now visible, starting section capture...');

    // Identify sections
    const sections = container.querySelectorAll('[data-pdf-section]');

    // Initialize PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // 10mm margins
    const contentMaxWidth = pageWidth - (margin * 2);

    // FIX CUT-OFF TEXT: Define a safety buffer.
    // We calculate fit based on a slightly shorter height to ensure
    // no rounding errors cause the bottom edge to clip.
    // Increased to 5mm to handle equation rendering better
    const SAFETY_BUFFER_MM = 5;
    const contentMaxHeight = pageHeight - (margin * 2);
    const effectiveMaxHeight = contentMaxHeight - SAFETY_BUFFER_MM;

    // If no sections found, capture everything as one (fallback)
    const elementsToCapture = sections.length > 0 ? sections : [container];

    for (let i = 0; i < elementsToCapture.length; i++) {
      const element = elementsToCapture[i] as HTMLElement;

      // CRITICAL FIX: Wait for images in THIS SPECIFIC SECTION before capturing
      // This ensures images on separate pages (like scoring-guide-images) are fully loaded
      console.log(`Waiting for images in section ${i + 1}...`);
      await waitForImages(element);
      console.log(`Images loaded for section ${i + 1}`);

      // CRITICAL: Extra delay after blob conversion for html2canvas to register the new src
      console.log('Waiting extra time for html2canvas to see blob URLs...');
      await new Promise(r => setTimeout(r, 1000));
      console.log('Ready to capture');

      // --- NEW FIX: NEUTRALIZE PAGE BREAKS DURING CAPTURE ---
      // Save original styles
      const originalPageBreakBefore = element.style.pageBreakBefore;
      const originalMarginTop = element.style.marginTop;
      
      // Temporarily strip styles that might push content off the canvas
      element.style.pageBreakBefore = 'auto';
      element.style.marginTop = '0'; // Ensure it starts at the top
      // --------------------------------------------------------

      // Capture the element
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for crisp text
        useCORS: false, // Blob URLs don't need CORS
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging to see what html2canvas is doing
        imageTimeout: 0, // Don't timeout on images
        onclone: (clonedDoc) => {
          console.log('html2canvas cloned document');
          const clonedImgs = clonedDoc.querySelectorAll('img');
          console.log(`Found ${clonedImgs.length} images in cloned document`);
          
          // Force layout stability in the clone
          clonedImgs.forEach((img: any) => {
             img.style.display = 'block'; 
          });
        }
      });

      // Restore original styles
      element.style.pageBreakBefore = originalPageBreakBefore;
      element.style.marginTop = originalMarginTop;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Calculate dimensions in mm
      // html2canvas creates a canvas scaled by window.devicePixelRatio * scale option.
      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;

      // Calculate aspect ratio
      const ratio = imgWidthPx / imgHeightPx;

      // Determine fit:
      // 1. Calculate width needed to fit margins
      let finalWidth = contentMaxWidth;
      let finalHeight = finalWidth / ratio;

      // 2. If height exceeds effective page height, scale down further to fit
      // Use effectiveMaxHeight (with safety buffer) instead of absolute max height
      if (finalHeight > effectiveMaxHeight) {
        finalHeight = effectiveMaxHeight;
        finalWidth = finalHeight * ratio;
      }

      // Add page (skip for first iteration)
      if (i > 0) {
        pdf.addPage();
      }

      // Add image to PDF
      pdf.addImage(imgData, 'JPEG', margin, margin, finalWidth, finalHeight);
    }

    const pdfBlob = pdf.output('blob');

    // Clean up
    root.unmount();
    document.body.removeChild(container);

    return pdfBlob;
  } catch (error) {
    console.error('PDF generation error:', error);
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw error;
  }
};

// Generate PDF for cloud storage (question + scoring guide only)
export const generateStoragePDF = async (frq: GeneratedFRQ): Promise<Blob> => {
  return generatePDF(frq, null, [], {
    includeSubmissionFeedback: false,
    includeChatHistory: false,
  });
};

// Trigger browser download
export const downloadPDF = async (
  frq: GeneratedFRQ,
  result: AssessmentResult | null,
  chatMessages: ChatMessage[]
): Promise<void> => {
  const blob = await generatePDF(frq, result, chatMessages);
  const filename = generatePDFFilename(frq);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
