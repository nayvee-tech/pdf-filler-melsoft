import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { detectTemplate, loadTemplateMapping } from '@/lib/template-detector';
import { fillPDFWithTemplate } from '@/lib/template-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const manualTemplateId = formData.get('templateId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    console.log(`📄 Processing PDF: ${file.name}`);

    // Use manually selected template if provided, otherwise auto-detect
    let templateId: string | null;
    if (manualTemplateId) {
      // Decode the template ID to handle URL-encoded characters like spaces
      const decodedTemplateId = decodeURIComponent(manualTemplateId);
      console.log(`✓ Using manually selected template: ${decodedTemplateId}`);
      templateId = decodedTemplateId;
    } else {
      console.log('⚙ Auto-detecting template...');
      templateId = await detectTemplate(pdfBuffer, file.name);
    }

    if (!templateId) {
      return NextResponse.json({
        success: false,
        templateDetected: false,
        message: 'No template mapping found for this PDF'
      });
    }

    console.log(`Loading template mapping for: ${templateId}`);
    const templateMapping = await loadTemplateMapping(templateId);

    if (!templateMapping) {
      console.error(`Template mapping not found for: ${templateId}`);
      return NextResponse.json({
        success: false,
        templateDetected: false,
        message: 'Template detected but mapping could not be loaded'
      });
    }

    const result = await fillPDFWithTemplate(pdfBuffer, templateMapping);

    if (!result.success || !result.pdfBuffer) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fill PDF'
      }, { status: 500 });
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const docDir = join(process.cwd(), 'public', 'temp-docs', documentId);

    if (!existsSync(docDir)) {
      await mkdir(docDir, { recursive: true });
    }

    const outputPath = join(docDir, 'filled.pdf');
    await writeFile(outputPath, result.pdfBuffer);

    const downloadUrl = `/temp-docs/${documentId}/filled.pdf`;

    console.log(`✅ PDF processed successfully using template: ${templateId}`);

    return NextResponse.json({
      success: true,
      templateDetected: true,
      templateId,
      downloadUrl,
      textLayers: result.textLayers || [],
      message: `PDF filled using template: ${templateId}`
    });
  } catch (error) {
    console.error('Error processing PDF with template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
