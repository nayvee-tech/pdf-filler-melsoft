import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import companyProfile from '@/src/data/company_profile.json';

type NudgeRatios = Record<string, { dxRatio: number; dyRatio: number }>;

function clampNumber(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      documentId?: string;
      nudges?: NudgeRatios;
    };

    const documentId = body.documentId;
    const nudges = body.nudges || {};

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const outputDir = path.join(process.cwd(), 'public', 'temp-docs', documentId);
    const analysisPath = path.join(outputDir, 'analysis.json');
    const sourcePath = path.join(outputDir, 'source.pdf');

    if (!fs.existsSync(outputDir) || !fs.existsSync(analysisPath) || !fs.existsSync(sourcePath)) {
      return NextResponse.json({ error: 'Document not found or not analyzed yet' }, { status: 404 });
    }

    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8')) as {
      mappedFields: Array<{
        id: string;
        page: number;
        keyText: string;
        confidence: number;
        boundingBox: { Left: number; Top: number; Width: number; Height: number };
        mappedFieldKey: string;
        value: string;
      }>;
      signatures: Array<{
        id: string;
        page: number;
        confidence: number;
        boundingBox: { Left: number; Top: number; Width: number; Height: number };
      }>;
    };

    const sourceBytes = fs.readFileSync(sourcePath);
    const pdfDoc = await PDFDocument.load(sourceBytes);

    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const field of analysis.mappedFields || []) {
      const pageIndex = Math.max(0, (field.page ?? 1) - 1);
      if (pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const bb = field.boundingBox;
      if (!bb) continue;

      const nudge = nudges[field.id] || { dxRatio: 0, dyRatio: 0 };
      const dx = clampNumber(nudge.dxRatio) * pageWidth;
      const dy = clampNumber(nudge.dyRatio) * pageHeight;

      const boxX = bb.Left * pageWidth;
      const boxTopFromTop = bb.Top * pageHeight;
      const boxW = bb.Width * pageWidth;
      const boxH = bb.Height * pageHeight;

      let fontSize = 10;
      const maxWidth = Math.max(10, boxW - 4);

      let displayText = String(field.value ?? '').trim();
      if (!displayText) continue;

      let textWidth = font.widthOfTextAtSize(displayText, fontSize);
      if (textWidth > maxWidth) {
        fontSize = 8;
        textWidth = font.widthOfTextAtSize(displayText, fontSize);

        if (textWidth > maxWidth) {
          while (textWidth > maxWidth && displayText.length > 0) {
            displayText = displayText.slice(0, -1);
            textWidth = font.widthOfTextAtSize(displayText + '...', fontSize);
          }
          displayText += '...';
        }
      }

      const x = boxX + 2 + dx;
      const yBottom = pageHeight - boxTopFromTop - boxH;
      const y = yBottom + 2 - dy;

      page.drawText(displayText, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    const signatureBase64 = companyProfile.signature?.base64;
    if (signatureBase64 && signatureBase64.includes('base64,')) {
      const signatureCandidates = (analysis.signatures || [])
        .slice()
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

      const sigBlock = signatureCandidates[0];

      if (sigBlock) {
        const pageIndex = Math.max(0, (sigBlock.page ?? 1) - 1);
        if (pageIndex < pages.length) {
          const page = pages[pageIndex];
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const bb = sigBlock.boundingBox;
          const imgBytes = Buffer.from(signatureBase64.split('base64,')[1], 'base64');
          const img = await pdfDoc.embedPng(imgBytes);

          const boxX = bb.Left * pageWidth;
          const boxTopFromTop = bb.Top * pageHeight;
          const boxW = bb.Width * pageWidth;
          const boxH = bb.Height * pageHeight;

          const yBottom = pageHeight - boxTopFromTop - boxH;

          page.drawImage(img, {
            x: boxX,
            y: yBottom,
            width: boxW,
            height: boxH,
          });
        }
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();

    const filename = `SIGNED_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, Buffer.from(modifiedPdfBytes));

    return NextResponse.json({
      success: true,
      documentId,
      filename,
      downloadUrl: `/temp-docs/${documentId}/${filename}`,
    });
  } catch (error) {
    console.error('AWS Textract sign error:', error);
    return NextResponse.json(
      { error: '⚠️ AWS Connection Error: Failed to analyze document layout.' },
      { status: 500 }
    );
  }
}
