import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const tempDocsDir = path.join(process.cwd(), 'public', 'temp-docs');

    if (!fs.existsSync(tempDocsDir)) {
      return NextResponse.json({ documents: [] });
    }

    const folders = fs.readdirSync(tempDocsDir);
    const documents = [];

    for (const folder of folders) {
      const metadataPath = path.join(tempDocsDir, folder, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          
          const expiresAt = new Date(metadata.expiresAt);
          if (expiresAt > new Date()) {
            documents.push(metadata);
          }
        } catch (error) {
          console.error(`Failed to read metadata for ${folder}:`, error);
        }
      }
    }

    documents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
