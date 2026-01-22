# Template Designer Guide

## Architecture Change

**IMPORTANT:** The app architecture has been changed. Template-based mapping is now the **PRIMARY** approach, with AWS Textract as an **OPTIONAL FALLBACK**.

## How It Works

### 1. Template Designer (Admin Only)

Access the Template Designer at `/template-designer` (requires authentication).

**Features:**
- Upload PDF templates
- Click anywhere on the PDF to map fields
- Assign field names (bidderName, vatNumber, signature, etc.)
- Save coordinates as ratios (not pixels) for accuracy
- Reuse templates for instant PDF filling

### 2. Template Detection

When a user uploads a PDF:

1. **Filename Match**: Checks if filename contains template ID (e.g., "SBD4", "DM755")
2. **Content Fingerprint**: Extracts text and matches against known keywords
3. **Template Found**: Loads saved mapping and fills PDF instantly
4. **No Template**: Shows options to either:
   - Map as new template (admin)
   - Use AWS Textract AI detection (fallback)

### 3. Template Storage

Templates are stored in `/templates/{templateId}/`:
- `mapping.json` - Field coordinate mappings
- `source.pdf` - Original template file

**Mapping Schema:**
```json
{
  "templateId": "SBD4",
  "pageSize": "A4",
  "fields": {
    "bidderName": {
      "page": 0,
      "xRatio": 0.22,
      "yRatio": 0.74,
      "maxWidthRatio": 0.4,
      "type": "text"
    },
    "signature": {
      "page": 0,
      "xRatio": 0.60,
      "yRatio": 0.18,
      "widthRatio": 0.25,
      "heightRatio": 0.08,
      "type": "signature"
    }
  }
}
```

## Creating a Template

### Step 1: Access Template Designer
1. Log in to the app
2. Navigate to `/template-designer`

### Step 2: Upload Template PDF
1. Click "Click to upload PDF template"
2. Select your PDF form

### Step 3: Map Fields
1. Click anywhere on the PDF where a field should be placed
2. In the modal, select:
   - **Field Name**: Choose from dropdown or enter custom name
   - **Field Type**: Text or Signature
   - **Max Width Ratio** (for text): Optional, limits text width (0-1)
   - **Width/Height Ratio** (for signature): Optional, defines signature box size

### Step 4: Save Template
1. Enter a **Template ID** (e.g., "SBD4", "DM755")
2. Review mapped fields in the sidebar
3. Click "Save Template"

## Using Templates

### Normal User Flow

1. **Upload PDF**: Drag and drop or select PDF
2. **Auto-Detection**: App checks for matching template
3. **Instant Fill**: If template found, PDF is filled immediately
4. **Preview**: Review filled PDF
5. **Download**: Confirm and download

### No Template Found

If no template is detected, user sees two options:

1. **Map Template** (Admin): Create new template mapping
2. **Auto-detect with AI**: Use AWS Textract (costs apply)

## Field Mapping

### Available Field Names

Pre-defined fields that map to company profile:
- `bidderName` / `companyName`
- `vatNumber`
- `registrationNumber`
- `address`
- `email`
- `phone`
- `contactPerson`
- `bankName`
- `accountNumber`
- `branchCode`
- `city`
- `postalCode`
- `province`
- `country`
- `website`
- `signature`

### Custom Fields

You can also create custom field names for template-specific requirements.

## Coordinate System

**CRITICAL:** All coordinates are stored as **ratios** (0-1), not pixels.

### Why Ratios?

- **Resolution Independent**: Works regardless of PDF viewer zoom level
- **Accurate Placement**: Coordinates scale with page dimensions
- **Portable**: Same mapping works across different rendering sizes

### Conversion Formula

```typescript
// Click to Ratio (when mapping)
xRatio = clickX / canvasWidth
yRatio = 1 - (clickY / canvasHeight)  // Y-axis is inverted

// Ratio to PDF Points (when filling)
x = xRatio * pageWidth
y = yRatio * pageHeight
```

## Template Detection Keywords

Current fingerprints (can be extended):

```typescript
{
  'SBD4': ['SBD 4', 'DECLARATION OF INTEREST', 'BIDDER\'S DISCLOSURE'],
  'SBD1': ['SBD 1', 'INVITATION TO BID', 'PART A'],
  'DM755': ['DM 755', 'APPLICATION FOR REGISTRATION'],
  'SABS': ['SABS', 'SOUTH AFRICAN BUREAU OF STANDARDS'],
  'TOURISM': ['TOURISM', 'TOURIST GUIDE']
}
```

## API Endpoints

### Template Management

**Save Template**
```
POST /api/templates/save
Body: FormData {
  templateId: string
  mapping: JSON string
  pdf: File
}
```

**Load Template**
```
GET /api/templates/load?templateId={id}
Response: { success: true, mapping: TemplateMapping }
```

### PDF Processing

**Template-Based Processing**
```
POST /api/process-template
Body: FormData { file: PDF }
Response: {
  success: true,
  templateDetected: true,
  templateId: string,
  downloadUrl: string
}
```

**Textract Fallback** (if no template)
```
POST /api/analyze-pdf
Body: FormData { file: PDF }
Response: { documentId, sourceUrl, mappedFields, warnings }
```

## Benefits of Template Approach

### 1. **Zero Cost**
- No AWS Textract API calls for known templates
- Instant processing

### 2. **100% Accuracy**
- Fixed coordinates = perfect placement
- No AI confidence issues

### 3. **Speed**
- Instant fill (< 1 second)
- No network latency for AI processing

### 4. **Reliability**
- Works offline (after template is saved)
- No dependency on external AI services

### 5. **Control**
- Admin defines exact field positions
- Consistent results every time

## Migration from Textract-First

The old Textract-first approach is preserved in:
- `/app/page_old_textract.tsx` (backup)
- `/api/analyze-pdf` (still available as fallback)
- `/api/sign-pdf` (still available for AI-detected PDFs)

## Troubleshooting

### Template Not Detected

**Check:**
1. Template ID matches filename or content keywords
2. `mapping.json` exists in `/templates/{templateId}/`
3. Template fingerprint keywords are present in PDF text

### Fields Not Filling Correctly

**Check:**
1. Field names in mapping match company profile structure
2. Coordinates are stored as ratios (0-1), not pixels
3. Page numbers are 0-indexed

### Signature Not Appearing

**Check:**
1. Field type is set to `"signature"`
2. `widthRatio` and `heightRatio` are defined
3. Company profile has valid base64 signature

## Best Practices

1. **Test Templates**: Upload and preview after creating template
2. **Use Descriptive IDs**: Template IDs should match form names
3. **Document Fields**: Keep track of which fields are mapped
4. **Backup Mappings**: Save `mapping.json` files externally
5. **Update Fingerprints**: Add keywords for better detection

## Future Enhancements

- Template versioning
- Bulk template import/export
- Visual field highlighting in designer
- Template cloning
- Multi-page template support
- Conditional field mapping
