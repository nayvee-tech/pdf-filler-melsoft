import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: templates, error } = await supabase
      .from('pdf_filler_templates')
      .select('id, name, mapping, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const formattedTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      pageSize: t.mapping?.pageSize || 'A4',
      fieldCount: Object.keys(t.mapping?.fields || {}).length,
      fields: Object.keys(t.mapping?.fields || {}),
      createdAt: t.created_at // Expose created_at for sorting
    }));

    return NextResponse.json({
      templates: formattedTemplates
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}
