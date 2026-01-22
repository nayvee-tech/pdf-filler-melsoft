import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '@/lib/supabase';
import companyProfile from '@/data/company_profile.json';
import { v4 as uuidv4 } from 'uuid';

// SCALE factor - must match InteractivePDFEditor and CanvasTemplateDesigner
const SCALE = 1.5;

interface TextLayer {
  id: string;
  text: string;
  x: number;       // Editor coordinates (scaled 1.5x, Y from top)
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  page: number;
  type?: string;
  width?: number;
  height?: number;
}

function editorToPDF(editorX: number, editorY: number, pageHeight: number): { x: number; y: number } {
  const pdfX = editorX / SCALE;
  const pdfY = pageHeight - (editorY / SCALE);
  return { x: pdfX, y: pdfY };
}

export async function POST(request: NextRequest) {
  try {
    const { pdfUrl, textLayers, templateId } = await request.json();

    if (!pdfUrl || !textLayers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Fetch Source PDF (from Supabase Storage or URL)
    // If pdfUrl is a full URL, fetch it. If it's a Supabase path, download it.
    let pdfBytes: ArrayBuffer;

    // For now, assume pdfUrl is valid accessible URL (which it is from our previous step)
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch source PDF: ${response.statusText}`);
    }
    pdfBytes = await response.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Load fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Group text layers by page
    const layersByPage: Record<number, TextLayer[]> = {};
    textLayers.forEach((layer: TextLayer) => {
      if (!layersByPage[layer.page]) {
        layersByPage[layer.page] = [];
      }
      layersByPage[layer.page].push(layer);
    });

    console.log(`📝 Saving ${textLayers.length} layers to PDF...`);

    // Draw text layers
    for (const [pageIndex, layers] of Object.entries(layersByPage)) {
      const page = pdfDoc.getPages()[parseInt(pageIndex)];
      if (!page) continue;

      const { height: pageHeight } = page.getSize();

      for (const layer of layers) {
        const pdfCoord = editorToPDF(layer.x, layer.y, pageHeight);

        let font = helveticaFont;
        if (layer.fontFamily?.includes('Times')) {
          font = layer.bold ? timesBoldFont : timesFont;
        } else if (layer.fontFamily?.includes('Courier')) {
          font = layer.bold ? courierBoldFont : courierFont;
        } else {
          font = layer.bold ? helveticaBoldFont : helveticaFont;
        }

        const hexColor = (layer.color || '#000000').replace('#', '');
        const r = parseInt(hexColor.substring(0, 2), 16) / 255;
        const g = parseInt(hexColor.substring(2, 4), 16) / 255;
        const b = parseInt(hexColor.substring(4, 6), 16) / 255;

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
            console.error('Signature embed error', e);
          }
        } else {
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
          const pdfFontSize = effectiveSize * 0.75;
          const baselineOffset = isSymbol ? pdfFontSize * 0.85 : pdfFontSize;

          page.drawText(layer.text || '', {
            x: pdfCoord.x,
            y: pdfCoord.y - baselineOffset,
            size: pdfFontSize,
            font: effectiveFont,
            color: rgb(r, g, b),
          });
        }
      }
    }

    // Save edited PDF
    const editedPdfBytes = await pdfDoc.save();

    // 2. Upload to Supabase Vault
    const documentId = uuidv4();
    const fileName = `${documentId}.pdf`;
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 3); // 3 Hours expiry

    const { error: uploadError } = await supabase
      .storage
      .from('vault')
      .upload(fileName, editedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Vault upload failed: ${uploadError.message}`);
    }

    // 3. Record in DB with Expiry
    const { error: dbError } = await supabase
      .from('pdf_filler_vault_documents')
      .insert({
        id: documentId,
        filename: fileName,
        file_path: fileName,
        created_at: new Date().toISOString(),
        expires_at: expiryTime.toISOString()
      });

    if (dbError) {
      console.error('Vault DB Error:', dbError);
      // Continue anyway to at least return the file link
    }

    // 4. Generate Signed URL (valid for 3 hours)
    const { data: signedUrlData, error: signError } = await supabase
      .storage
      .from('vault')
      .createSignedUrl(fileName, 3 * 60 * 60);

    if (signError || !signedUrlData) {
      throw new Error('Failed to generate secure link');
    }

    console.log(`✅ Saved to Vault: ${fileName} (Expires: ${expiryTime.toISOString()})`);

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      message: 'PDF saved to secure vault',
      expiresAt: expiryTime.toISOString()
    });
  } catch (error) {
    console.error('Error saving edited PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to save edited PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
