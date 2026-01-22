import { NextRequest, NextResponse } from 'next/server';
import { processPDF, PDFProcessingError } from '@/lib/pdf-processor';
import companyProfile from '@/data/company_profile.json';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Updated processPDF now returns a downloadUrl (Signed URL from Supabase)
    const result = await processPDF(buffer, companyProfile);

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      filename: result.filename,
      downloadUrl: result.downloadUrl,
    });
  } catch (error) {
    console.error('PDF processing error:', error);

    if (error instanceof PDFProcessingError) {
      return NextResponse.json(
        { error: error.userMessage },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '⚠️ Error: The system failed to securely sign and map this document. Please check your connection and try again.' },
      { status: 500 }
    );
  }
}
