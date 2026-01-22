import { NextRequest, NextResponse } from 'next/server';
import { detectTemplate } from '@/lib/template-detector';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const pdfFile = formData.get('pdf') as File;

        if (!pdfFile) {
            return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await pdfFile.arrayBuffer());
        const templateId = await detectTemplate(buffer, pdfFile.name);

        return NextResponse.json({ templateId });
    } catch (error) {
        console.error('Error in template detection:', error);
        return NextResponse.json({ error: 'Failed to detect template' }, { status: 500 });
    }
}
