import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

// Force dynamic route
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    try {
        const params = await props.params;
        const segments = params.path;
        if (!segments || segments.length === 0) {
            return new NextResponse('File not specified', { status: 400 });
        }

        // Security: Only allow access to 'temp' directory
        // The URL structure is /api/download/[...path]
        // Example: /api/download/edited/file.pdf -> segments: ['edited', 'file.pdf']

        // Construct valid path within temp directory
        const filePath = join(process.cwd(), 'temp', ...segments);

        // Verify file exists
        if (!existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Security check: ensure path is within temp directory to prevent directory traversal
        const tempDir = join(process.cwd(), 'temp');
        if (!resolve(filePath).startsWith(resolve(tempDir))) {
            return new NextResponse('Access denied', { status: 403 });
        }

        // Read file
        const fileBuffer = await readFile(filePath);

        // Determine content type
        let contentType = 'application/octet-stream';
        if (filePath.endsWith('.pdf')) {
            contentType = 'application/pdf';
        } else if (filePath.endsWith('.png')) {
            contentType = 'image/png';
        }

        const filename = segments[segments.length - 1];

        // Return file
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
