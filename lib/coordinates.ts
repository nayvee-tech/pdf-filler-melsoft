// Shared coordinate conversion utilities for PDF template system
// This ensures consistent coordinate handling across Designer, Editor, and PDF saving

export const SCALE = 1.5;

export interface Ratio {
    x: number;
    y: number;
}

export interface Coordinate {
    x: number;
    y: number;
}

/**
 * Convert ratio (0-1) to editor coordinates (1.5x scaled, top-left origin)
 * Used when loading templates into the interactive editor
 */
export function ratioToEditor(
    ratio: Ratio,
    pageWidth: number,
    pageHeight: number
): Coordinate {
    return {
        x: ratio.x * pageWidth * SCALE,
        y: (1 - ratio.y) * pageHeight * SCALE, // Flip Y for canvas (0 at top)
    };
}

/**
 * Convert editor coordinates to PDF coordinates (unscaled, bottom-left origin)
 * Used when saving edited PDFs
 */
export function editorToPDF(
    coord: Coordinate,
    pageHeight: number
): Coordinate {
    const unscaledX = coord.x / SCALE;
    const unscaledY = coord.y / SCALE;
    return {
        x: unscaledX,
        y: pageHeight - unscaledY, // PDF Y is bottom-up
    };
}

/**
 * Convert editor coordinates back to ratios for storage
 * Used when saving templates
 */
export function editorToRatio(
    coord: Coordinate,
    pageWidth: number,
    pageHeight: number
): Ratio {
    return {
        x: (coord.x / SCALE) / pageWidth,
        y: 1 - ((coord.y / SCALE) / pageHeight),
    };
}

/**
 * Calculate the correct Y position for PDF text rendering
 * PDF uses baseline positioning, but editor uses top-left
 * 
 * @param editorY - Y coordinate from editor (top-left, scaled 1.5x)
 * @param pageHeight - PDF page height
 * @param fontSize - Font size in points
 * @returns PDF Y coordinate for text baseline
 */
export function editorYToPDFBaseline(
    editorY: number,
    pageHeight: number,
    fontSize: number
): number {
    // First convert to PDF coordinates (unscaled, bottom-up)
    const pdfCoord = editorToPDF({ x: 0, y: editorY }, pageHeight);

    // PDF drawText uses baseline positioning
    // The baseline is roughly 75-80% down from the top of the text
    // Since editor shows top-left, we need to add the ascent
    // Ascent is approximately 75% of font size for most fonts
    const ascent = fontSize * 0.75;

    return pdfCoord.y + ascent;
}

/**
 * Convert ratio to PDF coordinates (for auto-fill)
 */
export function ratioToPDF(
    ratio: Ratio,
    pageWidth: number,
    pageHeight: number
): Coordinate {
    return {
        x: ratio.x * pageWidth,
        y: ratio.y * pageHeight,
    };
}
