import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import companyProfile from '@/data/company_profile.json';

// SCALE factor - must match InteractivePDFEditor and CanvasTemplateDesigner
const SCALE = 1.5;

function editorToPDF(editorX: number, editorY: number, pageHeight: number): { x: number; y: number } {
  const pdfX = editorX / SCALE;
  const pdfY = pageHeight - (editorY / SCALE);
  return { x: pdfX, y: pdfY };
}

export async function POST(request: NextRequest) {
  try {
    const { pdfUrl, layers } = await request.json();

    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 });
    }

    let pdfBytes: any;

    if (pdfUrl.startsWith('http')) {
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF');
      }
      pdfBytes = await pdfResponse.arrayBuffer();
    } else {
      const filePath = pdfUrl.startsWith('/temp-docs')
        ? `${process.cwd()}/public${pdfUrl}`
        : `${process.cwd()}${pdfUrl}`;
      const fs = await import('fs/promises');
      pdfBytes = await fs.readFile(filePath);
    }
    // Fix: Cast ArrayBuffer to Uint8Array for PDFDocument.load
    const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBytes as any));

    // Load fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Group layers by page
    // Note: 'layers' here comes from InteractivePDFEditor textLayers
    const layersByPage: Record<number, any[]> = {};
    (layers || []).forEach((layer: any) => {
      if (!layersByPage[layer.page]) {
        layersByPage[layer.page] = [];
      }
      layersByPage[layer.page].push(layer);
    });

    // Process each page
    for (const [pageIndexStr, pageLayers] of Object.entries(layersByPage)) {
      const pageIndex = parseInt(pageIndexStr);
      const pages = pdfDoc.getPages();

      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { height: pageHeight } = page.getSize();

        for (const layer of pageLayers) {
          // SINGLE coordinate conversion point
          const pdfCoord = editorToPDF(layer.x, layer.y, pageHeight);

          // Determine font
          let font = helveticaFont;
          if (layer.fontFamily?.includes('Times')) {
            font = layer.bold ? timesBoldFont : timesFont;
          } else if (layer.fontFamily?.includes('Courier')) {
            font = layer.bold ? courierBoldFont : courierFont;
          } else {
            font = layer.bold ? helveticaBoldFont : helveticaFont;
          }

          // Determine color
          let r = 0, g = 0, b = 0;
          if (layer.color && layer.color.startsWith('#')) {
            const hexColor = layer.color.replace('#', '');
            r = parseInt(hexColor.substring(0, 2), 16) / 255;
            g = parseInt(hexColor.substring(2, 4), 16) / 255;
            b = parseInt(hexColor.substring(4, 6), 16) / 255;
          }

          if (layer.type === 'signature') {
            try {
              const base64Data = companyProfile.signature.base64.replace(/^data:image\/\w+;base64,/, '');
              const imageBytes = Buffer.from(base64Data, 'base64');
              const signatureImage = await pdfDoc.embedPng(imageBytes);

              const drawWidth = (layer.width || 150) / SCALE;
              const drawHeight = (layer.height || 50) / SCALE;

              page.drawImage(signatureImage, {
                x: pdfCoord.x,
                y: pdfCoord.y - drawHeight,
                width: drawWidth,
                height: drawHeight
              });
            } catch (e) {
              console.error('Signature error', e);
            }
          } else if (layer.type === 'checkbox') {
            // Handle checkboxes similar to text or custom drawing
            // For now, let's treat them as symbols if checked
            if (layer.checked) {
              const effectiveSize = 24;
              const pdfFontSize = effectiveSize * 0.75;
              page.drawText('✓', {
                x: pdfCoord.x,
                y: pdfCoord.y - pdfFontSize,
                size: pdfFontSize,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
              });
            }
          } else {
            // Text handling
            const isSymbol = ['✓', '✗', '—', '-', 'X', 'x'].includes(layer.text?.trim() || '');
            let effectiveFont = font;
            let effectiveSize = layer.fontSize || 14;

            if (isSymbol) {
              effectiveFont = helveticaBoldFont;
              if (layer.text?.trim() === '—' || layer.text?.trim() === '-') {
                effectiveSize = Math.max(effectiveSize, 28);
              } else {
                effectiveSize = Math.max(effectiveSize, 24);
              }
            }

            const pdfFontSize = effectiveSize * 0.75; // px -> pt conversion
            // Center symbols vertically (0.85 offset), standard text uses normal baseline (0.75-0.8)
            const baselineOffset = isSymbol ? pdfFontSize * 0.85 : pdfFontSize;

            if (layer.text) {
              page.drawText(layer.text, {
                x: pdfCoord.x,
                y: pdfCoord.y - baselineOffset,
                size: pdfFontSize,
                font: effectiveFont,
                color: rgb(r, g, b),
              });
            }
          }
        }
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Convert Uint8Array to Buffer for NextResponse
    const pdfBuffer = Buffer.from(modifiedPdfBytes);

    // Return the PDF as a blob
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="edited-document.pdf"',
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
