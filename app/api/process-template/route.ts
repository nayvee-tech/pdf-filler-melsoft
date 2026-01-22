import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
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

    // Updated: Save to Supabase Vault instead of local filesystem
    const documentId = uuidv4(); // Use UUID for consistency
    const fileName = `${documentId}.pdf`;
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 3); // 3 Hours expiry

    // 1. Upload to Supabase Vault
    const { error: uploadError } = await supabase
      .storage
      .from('vault')
      .upload(fileName, result.pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase Vault Upload Error:', uploadError);
      throw new Error(`Failed to upload to vault: ${uploadError.message}`);
    }

    // 2. Record in DB with Expiry
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
      console.error('Supabase DB Error:', dbError);
      // Continue, as the file is in storage
    }

    // 3. Generate Signed URL
    const { data: signedUrlData, error: signError } = await supabase
      .storage
      .from('vault')
      .createSignedUrl(fileName, 3 * 60 * 60); // 3 hours

    if (signError || !signedUrlData) {
      throw new Error('Failed to generate download link');
    }

    const downloadUrl = signedUrlData.signedUrl;

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
