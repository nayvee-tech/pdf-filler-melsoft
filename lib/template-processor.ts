import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TemplateMapping, FieldMapping } from './template-detector';
import companyProfile from '@/data/company_profile.json';
import { ratioToEditor, SCALE } from './coordinates';

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  page: number;
  type?: string;
  width?: number;
  height?: number;
  isCustom?: boolean; // Add isCustom flag
  customValue?: string; // Add customValue property
}

export interface TemplateProcessingResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
  templateId?: string;
  textLayers?: TextLayer[];
}

export async function fillPDFWithTemplate(
  pdfBuffer: Buffer,
  templateMapping: TemplateMapping
): Promise<TemplateProcessingResult> {
  try {
    console.log(`📝 Filling PDF using template: ${templateMapping.templateId}`);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fieldData = buildFieldData();
    const textLayers: TextLayer[] = [];

    for (const [fieldName, fieldMappings] of Object.entries(templateMapping.fields)) {
      const mappingsArray = Array.isArray(fieldMappings) ? fieldMappings : [fieldMappings];
      let value = fieldData[fieldName];

      // If no standard value, check if it's a custom field with a stored value
      if (!value && mappingsArray.length > 0) {
        const primary = mappingsArray[0];
        if (primary.isCustom && primary.customValue) {
          value = primary.customValue;
        }
      }

      if (!value) {
        console.log(`⚠️  No data for field: ${fieldName}`);
        continue;
      }



      for (const fieldMapping of mappingsArray) {
        const page = pdfDoc.getPages()[fieldMapping.page];
        if (!page) {
          console.log(`⚠️  Page ${fieldMapping.page} not found for field: ${fieldName}`);
          continue;
        }

        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Create text layer metadata (including signatures and special types)
        // This allows all elements to be editable in the interactive editor
        const textLayer = createTextLayer(
          fieldMapping,
          pageWidth,
          pageHeight,
          value,
          fieldName
        );

        if (textLayer) {
          textLayers.push(textLayer);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer_output = Buffer.from(pdfBytes);

    console.log(`✅ Created ${textLayers.length} text layers for template: ${templateMapping.templateId}`);

    return {
      success: true,
      pdfBuffer: pdfBuffer_output,
      templateId: templateMapping.templateId,
      textLayers
    };
  } catch (error) {
    console.error('Error filling PDF with template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function buildFieldData(): Record<string, string> {
  const profile = companyProfile.companyProfile;

  // Generate today's date in format "15 January 2026"
  const today = new Date();
  const day = today.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();
  const todayFormatted = `${day} ${month} ${year}`;

  return {
    // Date fields
    todayDate: todayFormatted,
    currentDate: todayFormatted,
    date: todayFormatted,

    // Symbols
    tick: profile.symbols.tick,
    checkmark: profile.symbols.checkmark,
    dash: profile.symbols.dash,
    cancel: profile.symbols.cancel,
    cross: profile.symbols.cross,

    // Basic company info
    legalName: profile.basic.legalName,
    bidderName: profile.basic.legalName,
    companyName: profile.basic.legalName,
    registrationNumber: profile.basic.registrationNumber,
    companyType: profile.basic.companyType,
    vatNumber: profile.basic.vatNumber,
    taxPin: profile.basic.taxPin,
    csdNumber: profile.basic.csdNumber,

    // Contact info
    physicalAddress: profile.contact.physicalAddress,
    postalAddress: profile.contact.postalAddress,
    address: profile.contact.physicalAddress,
    telephone: profile.contact.telephone,
    phone: profile.contact.telephone,
    cellphone: profile.contact.cellphone,
    fax: profile.contact.fax,
    email: profile.contact.email,

    // Directors (first director as default)
    directorName: profile.directors[0]?.name || '',
    directorId: profile.directors[0]?.idNumber || '',
    directorPosition: profile.directors[0]?.position || '',
    director1Name: profile.directors[0]?.name || '',
    director2Name: profile.directors[1]?.name || '',

    // Compliance (convert boolean to Yes/No)
    rsaResident: profile.compliance.rsaResident ? 'Yes' : 'No',
    hasBranch: profile.compliance.hasBranch ? 'Yes' : 'No',
    accreditedRep: profile.compliance.accreditedRep ? 'Yes' : 'No',

    // Preferences
    womenOwned: profile.preferences.womenOwnedPercent.toString() + '%',
    youthOwned: profile.preferences.youthOwnedPercent.toString() + '%',
    pwdOwned: profile.preferences.pwdOwnedPercent.toString() + '%',
    pointsClaimed: profile.preferences.pointsClaimed.toString(),

    // Signature placeholder so the loop processes it
    signature: 'Signature',
  };
}


// New function: Create text layer metadata WITHOUT stamping to PDF
// This is used during auto-fill to create editable layers without duplicating text
function createTextLayer(
  fieldMapping: FieldMapping,
  pageWidth: number,
  pageHeight: number,
  text: string,
  fieldName?: string
): TextLayer | null {
  // Use coordinate utility for consistent conversion
  const editorCoord = ratioToEditor(
    { x: fieldMapping.xRatio, y: fieldMapping.yRatio },
    pageWidth,
    pageHeight
  );

  // Check if this is a symbol field and convert to Unicode
  const isSymbol = fieldName && ['tick', 'checkmark', 'dash', 'cancel', 'cross'].includes(fieldName);
  let displayText = text;
  let fontSize = 14; // Set to 14px as requested

  if (isSymbol) {
    // Convert symbol names to Unicode characters
    switch (fieldName) {
      case 'tick':
      case 'checkmark':
        displayText = '✓';
        break;
      case 'dash':
      case 'cancel':
        displayText = '—';
        break;
      case 'cross':
        displayText = '✗';
        break;
    }
    // Symbols use larger font size for maximum visibility
    if (displayText === '—') {
      fontSize = 28; // Extra large for dashes - highly visible
    } else {
      fontSize = 24; // Large for other symbols
    }
  } else if (fieldMapping.maxWidthRatio) {
    // For regular text, calculate appropriate font size
    const maxWidth = fieldMapping.maxWidthRatio * pageWidth * SCALE;
    // Estimate: average character is ~8px wide at 14pt
    const estimatedWidth = text.length * 8;
    if (estimatedWidth > maxWidth) {
      fontSize = Math.max(10, Math.floor(14 * (maxWidth / estimatedWidth)));
    }
  }

  console.log(`✓ Created text layer for ${isSymbol ? 'symbol' : 'text'} at Editor(${editorCoord.x.toFixed(1)}, ${editorCoord.y.toFixed(1)}): "${displayText.substring(0, 30)}${displayText.length > 30 ? '...' : ''}"`);

  // Return text layer data for interactive editor
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: displayText, // Store the actual displayed text (Unicode symbol or original text)
    x: editorCoord.x,
    y: editorCoord.y,
    fontSize,
    fontFamily: 'Helvetica',
    color: fieldMapping.color || '#000000', // Use color from mapping or default to black
    bold: true, // Make all text bold for better visibility
    italic: false,
    page: fieldMapping.page,
    type: fieldMapping.type || 'text',
    width: fieldMapping.widthRatio ? fieldMapping.widthRatio * pageWidth * SCALE : (fieldMapping.type === 'signature' ? 150 : (fieldMapping.type === 'checkbox' ? 20 : undefined)),
    height: fieldMapping.heightRatio ? fieldMapping.heightRatio * pageHeight * SCALE : (fieldMapping.type === 'signature' ? 50 : (fieldMapping.type === 'checkbox' ? 20 : undefined)),
  };
}

async function stampText(
  page: any,
  fieldMapping: FieldMapping,
  pageWidth: number,
  pageHeight: number,
  text: string,
  font: any,
  fieldName?: string
): Promise<TextLayer | null> {
  const x = fieldMapping.xRatio * pageWidth;
  const y = fieldMapping.yRatio * pageHeight;

  // Check if this is a symbol field and convert to Unicode
  const isSymbol = fieldName && ['tick', 'checkmark', 'dash', 'cancel', 'cross'].includes(fieldName);
  let displayText = text;
  let fontSize = 10;

  if (isSymbol) {
    // Convert symbol names to Unicode characters
    switch (fieldName) {
      case 'tick':
      case 'checkmark':
        displayText = '✓';
        break;
      case 'dash':
      case 'cancel':
        displayText = '—';
        break;
      case 'cross':
        displayText = '✗';
        break;
    }
    fontSize = 14; // Larger font for symbols
  } else if (fieldMapping.maxWidthRatio) {
    // For regular text, scale font to fit width (but don't truncate)
    const maxWidth = fieldMapping.maxWidthRatio * pageWidth;

    for (let size = 10; size >= 6; size--) {
      const textWidth = font.widthOfTextAtSize(text, size);
      if (textWidth <= maxWidth) {
        fontSize = size;
        break;
      }
    }
    // Note: Removed truncation logic - let text overflow instead of adding "..."
  }

  page.drawText(displayText, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0, 0, 0)
  });

  console.log(`✓ Stamped ${isSymbol ? 'symbol' : 'text'} at (${x.toFixed(1)}, ${y.toFixed(1)}): "${displayText.substring(0, 30)}${displayText.length > 30 ? '...' : ''}"`);

  // Return text layer data for interactive editor
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: displayText, // Store the actual displayed text (Unicode symbol or original text)
    x,
    y: pageHeight - y, // Convert to canvas coordinates
    fontSize,
    fontFamily: 'Helvetica',
    color: '#000000',
    bold: false,
    italic: false,
    page: fieldMapping.page,
  };
}

function drawSymbol(
  page: any,
  fieldMapping: FieldMapping,
  pageWidth: number,
  pageHeight: number,
  symbolType: string
) {
  const x = fieldMapping.xRatio * pageWidth;
  const y = fieldMapping.yRatio * pageHeight;
  const size = 12; // Symbol size

  if (symbolType === 'tick' || symbolType === 'checkmark') {
    // Draw a checkmark as two lines forming a ✓
    page.drawLine({
      start: { x: x - size * 0.3, y: y },
      end: { x: x, y: y - size * 0.4 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    page.drawLine({
      start: { x: x, y: y - size * 0.4 },
      end: { x: x + size * 0.5, y: y + size * 0.6 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    console.log(`✓ Drew checkmark at (${x.toFixed(1)}, ${y.toFixed(1)})`);
  } else if (symbolType === 'dash' || symbolType === 'cancel') {
    // Draw a horizontal dash —
    page.drawLine({
      start: { x: x - size * 0.4, y: y },
      end: { x: x + size * 0.4, y: y },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    console.log(`✓ Drew dash at (${x.toFixed(1)}, ${y.toFixed(1)})`);
  } else if (symbolType === 'cross') {
    // Draw an X
    page.drawLine({
      start: { x: x - size * 0.3, y: y - size * 0.3 },
      end: { x: x + size * 0.3, y: y + size * 0.3 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    page.drawLine({
      start: { x: x - size * 0.3, y: y + size * 0.3 },
      end: { x: x + size * 0.3, y: y - size * 0.3 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });
    console.log(`✓ Drew cross at (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }
}

async function embedSignature(
  page: any,
  fieldMapping: FieldMapping,
  pageWidth: number,
  pageHeight: number,
  signatureBase64: string
) {
  try {
    const x = fieldMapping.xRatio * pageWidth;
    const y = fieldMapping.yRatio * pageHeight;

    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Buffer.from(base64Data, 'base64');

    const pdfDoc = page.doc;
    const signatureImage = await pdfDoc.embedPng(imageBytes);
    const imageDims = signatureImage.scale(1);

    let drawWidth: number;
    let drawHeight: number;

    if (fieldMapping.widthRatio && fieldMapping.heightRatio) {
      drawWidth = fieldMapping.widthRatio * pageWidth;
      drawHeight = fieldMapping.heightRatio * pageHeight;
    } else if (fieldMapping.widthRatio) {
      drawWidth = fieldMapping.widthRatio * pageWidth;
      const aspectRatio = imageDims.height / imageDims.width;
      drawHeight = drawWidth * aspectRatio;
    } else {
      drawWidth = Math.min(imageDims.width, pageWidth * 0.2);
      const aspectRatio = imageDims.height / imageDims.width;
      drawHeight = drawWidth * aspectRatio;
    }

    page.drawImage(signatureImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight
    });

    console.log(`✓ Embedded signature at (${x.toFixed(1)}, ${y.toFixed(1)}) with size ${drawWidth.toFixed(1)}x${drawHeight.toFixed(1)}`);
  } catch (error) {
    console.error('Error embedding signature:', error);
  }
}
