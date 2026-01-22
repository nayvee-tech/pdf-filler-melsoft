import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentDir = path.join(process.cwd(), 'public', 'temp-docs', id);

    if (fs.existsSync(documentDir)) {
      fs.rmSync(documentDir, { recursive: true, force: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
