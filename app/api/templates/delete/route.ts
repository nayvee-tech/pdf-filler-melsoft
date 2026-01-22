import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // 1. Delete from DB
    const { error: dbError } = await supabase
      .from('pdf_filler_templates')
      .delete()
      .eq('id', templateId);

    if (dbError) {
      throw dbError;
    }

    // 2. (Optional) Cleanup Storage - Attempt to delete source PDF
    // We try to list files in the folder and delete them
    const { data: files } = await supabase
      .storage
      .from('templates')
      .list(templateId);

    if (files && files.length > 0) {
      const paths = files.map(f => `${templateId}/${f.name}`);
      await supabase.storage.from('templates').remove(paths);
    }

    console.log(`✅ Deleted template: ${templateId}`);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
