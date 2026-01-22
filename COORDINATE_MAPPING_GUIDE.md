# Coordinate Mapping Guide

## Understanding PDF Coordinates

PDF coordinates work differently than typical screen coordinates:

- **Origin (0,0)**: Bottom-left corner of the page
- **X-axis**: Increases from left to right
- **Y-axis**: Increases from bottom to top

However, in our system, we use **top-down Y coordinates** for easier mapping, and the system automatically converts them.

## Coordinate System

```
Page Layout (Letter size: 612 x 792 points)

Top of page (y = 0)
┌─────────────────────────────────────┐
│                                     │
│  Company Name (x: 150, y: 180)      │
│                                     │
│  VAT Number (x: 150, y: 420)        │
│                                     │
│                                     │
│  Signature (x: 400, y: 750)         │
└─────────────────────────────────────┘
Bottom of page (y = 792)
```

## Field Coordinate Structure

```typescript
{
  x: number;          // Horizontal position from left edge
  y: number;          // Vertical position from top edge
  page: number;       // Page number (0-indexed)
  fontSize?: number;  // Font size (default: 10)
  maxWidth?: number;  // Maximum width before truncation
  isCheckbox?: boolean; // If true, places "X" for boolean values
}
```

## How to Find Coordinates

### Method 1: Using Adobe Acrobat
1. Open PDF in Adobe Acrobat
2. Go to Tools → Measure
3. Click on the field location
4. Note the coordinates (convert from bottom-left to top-down)

### Method 2: Trial and Error
1. Start with estimated coordinates
2. Process a test PDF
3. Adjust coordinates based on where text appears
4. Repeat until perfect

### Method 3: PDF Analysis Tools
Use tools like `pdf-lib` or `pdfplumber` to extract form field positions programmatically.

## Common Form Sections

### Header Section (y: 100-250)
- Company name
- Trading name
- Registration number

### Contact Section (y: 250-400)
- Postal address
- Physical address
- Phone, fax, email

### Compliance Section (y: 400-550)
- VAT number
- Tax compliance
- BEE level and status (with checkboxes)

### Banking Section (y: 550-700)
- Bank name
- Account number
- Branch code
- Account type

### Signature Section (y: 700-800)
- Signature line
- Date
- Signatory name and title

## Checkbox Handling

For YES/NO checkboxes:

```typescript
'bee_status_yes': { x: 120, y: 570, page: 0, fontSize: 12, isCheckbox: true },
'bee_status_no': { x: 180, y: 570, page: 0, fontSize: 12, isCheckbox: true },
```

In `company_profile.json`, set boolean values:
```json
{
  "compliance": {
    "beeStatus": "Compliant"  // Will set bee_status_yes to true
  }
}
```

## Tips for Accurate Mapping

1. **Font Size**: Government forms typically use 10pt Courier
2. **Spacing**: Leave 30-40 points between fields vertically
3. **Margins**: Standard forms have ~50-100pt margins
4. **Alignment**: Most fields align at x: 150 for left column
5. **Multi-column**: Right column typically starts at x: 350-400
6. **Text Truncation**: Set `maxWidth` to prevent overflow

## Example: Complete Form Mapping

```typescript
export const EXAMPLE_FORM_MAPPING: FormMapping = {
  // Header
  'company_name': { x: 150, y: 180, page: 0, fontSize: 10, maxWidth: 400 },
  'registration_number': { x: 150, y: 210, page: 0, fontSize: 10, maxWidth: 200 },
  
  // Contact
  'postal_address': { x: 150, y: 280, page: 0, fontSize: 10, maxWidth: 400 },
  'telephone': { x: 150, y: 340, page: 0, fontSize: 10, maxWidth: 200 },
  'email': { x: 150, y: 370, page: 0, fontSize: 10, maxWidth: 300 },
  
  // Compliance
  'vat_number': { x: 150, y: 450, page: 0, fontSize: 10, maxWidth: 200 },
  'bee_level': { x: 250, y: 510, page: 0, fontSize: 10, maxWidth: 100 },
  'bee_compliant_yes': { x: 120, y: 540, page: 0, fontSize: 12, isCheckbox: true },
  'bee_compliant_no': { x: 180, y: 540, page: 0, fontSize: 12, isCheckbox: true },
  
  // Banking
  'bank_name': { x: 150, y: 620, page: 0, fontSize: 10, maxWidth: 300 },
  'account_number': { x: 150, y: 650, page: 0, fontSize: 10, maxWidth: 200 },
  
  // Signature
  'signature_date': { x: 400, y: 750, page: 0, fontSize: 10, maxWidth: 150 },
  'signatory_name': { x: 150, y: 780, page: 0, fontSize: 10, maxWidth: 300 },
};
```

## Troubleshooting

**Text appears too high/low:**
- Adjust Y coordinate in increments of 10-20 points

**Text appears too far left/right:**
- Adjust X coordinate in increments of 10-20 points

**Text is cut off:**
- Increase `maxWidth` value
- Or reduce font size

**Checkbox "X" not aligned:**
- Fine-tune X and Y by 1-2 points
- Adjust `fontSize` for checkbox (typically 11-13)

**Text overlaps form lines:**
- Reduce `fontSize` slightly (9pt instead of 10pt)
- Adjust Y coordinate to center in the field

## Testing Your Mappings

1. Create a test PDF with the form
2. Process it through the system
3. Review in the preview modal
4. Note any misalignments
5. Update coordinates in `mapping_logic.ts`
6. Repeat until perfect

## AI Fallback

If you don't have time to map coordinates manually, the system will use AI to generate them automatically. However, manual mappings are always more accurate for frequently-used forms.
