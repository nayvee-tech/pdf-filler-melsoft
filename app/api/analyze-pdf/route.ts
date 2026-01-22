import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import companyProfile from '@/src/data/company_profile.json';
import {
  analyzeWithTextract,
  mapDetectedKeyToProfileValue,
  parseTextractBlocks,
} from '@/lib/textract';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    const documentId = uuidv4();
    const outputDir = path.join(process.cwd(), 'public', 'temp-docs', documentId);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const sourceFilename = 'source.pdf';
    const sourcePath = path.join(outputDir, sourceFilename);
    fs.writeFileSync(sourcePath, Buffer.from(pdfBytes));

    const textract = await analyzeWithTextract(pdfBytes);

    const blocks = textract.Blocks || [];
    const { fields, signatures } = parseTextractBlocks(blocks);

    const mappedFields = fields
      .map((f) => {
        const mapped = mapDetectedKeyToProfileValue(f.keyText, companyProfile);
        if (!mapped) return null;
        return {
          ...f,
          mappedFieldKey: mapped.fieldKey,
          value: mapped.value,
        };
      })
      .filter(Boolean) as Array<
      (typeof fields)[number] & { mappedFieldKey: string; value: string }
    >;

    const lowConfidence = mappedFields.filter((f) => (f.confidence ?? 0) < 80);

    const analysis = {
      id: documentId,
      createdAt: new Date().toISOString(),
      sourceFilename,
      mappedFields,
      signatures,
      warnings: {
        lowConfidenceCount: lowConfidence.length,
        lowConfidenceKeys: lowConfidence.map((f) => ({
          keyText: f.keyText,
          confidence: f.confidence,
          page: f.page,
        })),
      },
    };

    fs.writeFileSync(path.join(outputDir, 'analysis.json'), JSON.stringify(analysis));

    return NextResponse.json({
      success: true,
      documentId,
      sourceUrl: `/temp-docs/${documentId}/${sourceFilename}`,
      filename: file.name,
      mappedFields,
      signatures,
      warnings: analysis.warnings,
    });
  } catch (error) {
    console.error('AWS Textract analyze error:', error);
    return NextResponse.json(
      { error: '⚠️ AWS Connection Error: Failed to analyze document layout.' },
      { status: 500 }
    );
  }
}
