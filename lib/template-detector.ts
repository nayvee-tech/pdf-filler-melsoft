import { supabase } from '@/lib/supabase';

export type FieldType = 'text' | 'signature' | 'checkbox' | 'date' | 'select' | 'radio' | 'symbol';

export interface FieldMapping {
  page: number;
  xRatio: number;
  yRatio: number;
  maxWidthRatio?: number;
  widthRatio?: number;
  heightRatio?: number;
  options?: string[];
  required?: boolean;
  type: FieldType;
  color?: string;
  isCustom?: boolean;
  customValue?: string;
}

export interface TemplateMapping {
  templateId: string;
  pageSize: string;
  fields: Record<string, FieldMapping | FieldMapping[]>;
}

// Fingerprints for manual detection hints (optional, can be moved to DB later)
const TEMPLATE_FINGERPRINTS: Record<string, string[]> = {
  'SBD4': ['sbd4', 'sbd 4', 'declaration of interest'],
  'SBD1': ['sbd1', 'sbd 1', 'invitation to bid'],
  'DM755': ['dm755', 'dm 755', 'application for registration'],
  'SABS': ['sabs', 'south african bureau of standards'],
  'TOURISM': ['tourism', 'tourist guide']
};

export async function detectTemplate(pdfBuffer: Buffer, filename?: string): Promise<string | null> {
  // 1. Try filename matching against DB records first
  if (filename) {
    const filenameLower = filename.toLowerCase();

    // Fetch all template names/ids to compare
    const { data: templates } = await supabase
      .from('pdf_filler_templates')
      .select('id, name');

    if (templates) {
      for (const t of templates) {
        // Simple check: if filename contains template ID or name
        if (filenameLower.includes(t.id.toLowerCase()) ||
          (t.name && filenameLower.includes(t.name.toLowerCase()))) {
          console.log(`✓ Template detected by filename match: ${t.id}`);
          return t.id;
        }
      }
    }

    // Fallback to hardcoded fingerprints
    // ... (existing logic)
  }

  return null;
}

export async function checkTemplateExists(templateId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('pdf_filler_templates')
      .select('*', { count: 'exact', head: true })
      .eq('id', templateId);

    return !!count && count > 0;
  } catch (e) {
    console.error('Error checking template existence:', e);
    return false;
  }
}

export async function loadTemplateMapping(templateId: string): Promise<TemplateMapping | null> {
  try {
    const { data: template, error } = await supabase
      .from('pdf_filler_templates')
      .select('mapping')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      console.error(`Template mapping not found for ${templateId}`);
      return null;
    }

    const mapping = template.mapping as TemplateMapping;

    // Backward compatibility: Convert old single-object format to array format
    for (const [fieldName, fieldMapping] of Object.entries(mapping.fields)) {
      if (!Array.isArray(fieldMapping)) {
        // Convert single object to array
        mapping.fields[fieldName] = [fieldMapping];
      }
    }

    console.log(`✓ Loaded template mapping from DB: ${templateId} with ${Object.keys(mapping.fields).length} fields`);
    return mapping;
  } catch (error) {
    console.error(`Error loading template mapping for ${templateId}:`, error);
    return null;
  }
}

export async function listAvailableTemplates(): Promise<string[]> {
  try {
    const { data: templates } = await supabase
      .from('pdf_filler_templates')
      .select('id');

    return templates ? templates.map(t => t.id) : [];
  } catch (e) {
    console.error('Error listing templates', e);
    return [];
  }
}
