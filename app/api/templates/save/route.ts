import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let templateId: string;
    let mappingData: any;
    let pdfFile: File | null = null;
    let pdfUrl: string = '';

    // Handle JSON data from canvas designer (usually just updating mapping)
    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      templateId = jsonData.templateId;
      mappingData = {
        templateId: jsonData.templateId,
        pageSize: jsonData.pageSize || 'A4',
        fields: jsonData.fields
      };

      // Try to get existing PDF URL if not provided
      const { data: existing } = await supabase
        .from('pdf_filler_templates')
        .select('pdf_url')
        .eq('id', templateId)
        .single();

      if (existing) {
        pdfUrl = existing.pdf_url;
      }
    }
    // Handle FormData (Active Designer Flow)
    else {
      const formData = await request.formData();
      templateId = formData.get('templateId') as string;
      const mappingJson = formData.get('mapping') as string;
      pdfFile = formData.get('pdf') as File;

      if (!mappingJson) {
        return NextResponse.json(
          { error: 'Missing mapping data' },
          { status: 400 }
        );
      }

      mappingData = JSON.parse(mappingJson);
    }

    if (!templateId || !mappingData) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId and mapping' },
        { status: 400 }
      );
    }

    // 1. Upload PDF to Supabase Storage (if provided)
    if (pdfFile) {
      const fileBuffer = await pdfFile.arrayBuffer();
      const fileName = `${templateId}/${Date.now()}_source.pdf`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('templates')
        .upload(fileName, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase Storage Error:', uploadError);
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      // Get public URL (or signed URL if private, but usually templates are public read)
      const { data: publicUrlData } = supabase
        .storage
        .from('templates')
        .getPublicUrl(fileName);

      pdfUrl = publicUrlData.publicUrl;
    }

    // 2. Save Metadata to Database
    const { error: dbError } = await supabase
      .from('pdf_filler_templates')
      .upsert({
        id: templateId,
        name: templateId, // Default name to ID if not separate
        mapping: mappingData,
        pdf_url: pdfUrl,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      throw new Error(`Failed to save template metadata: ${dbError.message}`);
    }

    console.log(`✅ Template saved to Supabase: ${templateId} with ${Object.keys(mappingData.fields).length} fields`);

    return NextResponse.json({
      success: true,
      templateId,
      message: 'Template saved successfully',
      fieldCount: Object.keys(mappingData.fields).length
    });
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      {
        error: 'Failed to save template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
