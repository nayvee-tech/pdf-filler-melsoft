# Enhancement Roadmap

## ✅ Completed (Just Now)

### 1. PDF.js Worker Fix
- **Fixed**: Changed PDFPreviewModal to use local worker (`/pdf.worker.js`) instead of unpkg CDN
- **Result**: No more "Failed to fetch dynamically imported module" errors

### 2. Today's Date Field Support
- **Added**: `todayDate`, `currentDate`, `date` fields
- **Format**: "15 January 2026" (auto-generated using JavaScript)
- **Usage**: Select these fields in Template Designer, they auto-fill with current date when PDF is processed

### 3. Backward Compatibility
- **Fixed**: Old template format (single object) now automatically converts to new format (array)
- **Result**: All existing templates work with new system

---

## 🚧 In Progress / To Do

### Priority 1: Template Management

#### A. Delete Templates
**Status**: Not started
**Requirements**:
- Add delete button on Templates page (`/templates`)
- Add delete button on each template card
- Create API endpoint `/api/templates/delete`
- Confirm dialog before deletion
- Remove template folder and files

#### B. Edit Templates
**Status**: Not started
**Requirements**:
- Add "Edit" button on Templates page
- Redirect to Template Designer with pre-loaded template
- Load existing mapping.json and source.pdf
- Allow adding/removing coordinates
- Save updates to same template ID

---

### Priority 2: Template Designer Enhancements

#### A. Visual Field Highlighting
**Status**: Not started
**Requirements**:
- Show colored rectangles on PDF where fields are mapped
- Display field name label on each highlighted area
- Different colors for different field types (text, signature, date)
- Hover to see field details
- Click to edit or remove individual coordinate

#### B. Full-Width PDF Preview
**Status**: Not started
**Requirements**:
- Fix PDF canvas to show full page width
- Add zoom controls (zoom in/out/fit)
- Ensure no parts of PDF are cut off
- Responsive scaling for different screen sizes

#### C. Remove Individual Coordinates
**Status**: Not started
**Requirements**:
- Add "X" button on each coordinate in the field list
- Allow removing single coordinate without deleting entire field
- Update mapping.json when coordinate removed

---

### Priority 3: Filled PDF Preview

#### A. Fix Preview Modal
**Status**: Not started
**Requirements**:
- PDFPreviewModal should display filled PDF before download
- Currently only works after download
- Debug why preview fails to load
- Ensure temp-docs files are accessible

---

### Priority 4: Admin Panel for Company Profile

#### A. Company Profile Editor
**Status**: Not started
**Requirements**:
- Create `/admin/company-profile` page
- Load current company_profile.json
- Editable form for all fields:
  - Basic info (name, registration, VAT, etc.)
  - Contact info (address, phone, email, etc.)
  - Directors (add/remove/edit)
  - Compliance checkboxes
  - BEE preferences
- Save button updates company_profile.json

#### B. Dynamic Field Creation
**Status**: Not started
**Requirements**:
- "Add Custom Field" button
- Form to create new field:
  - Field name (e.g., "projectNumber")
  - Field value (e.g., "12345")
  - Category selection (Basic Info, Contact, Directors, etc.)
- Save to company_profile.json under new "customFields" section
- Auto-update Template Designer dropdown with new fields

---

### Priority 5: YES/NO Checkbox Fields

#### A. Strikethrough Support
**Status**: Not started
**Requirements**:
- New field type: "checkbox"
- Template Designer: mark field as "YES" or "NO" checkbox
- When filling PDF:
  - If value is "Yes", draw text "YES" and strikethrough "NO"
  - If value is "No", draw text "NO" and strikethrough "YES"
- Use pdf-lib to draw line through text

**Example**:
```
Template has: "YES / NO"
If rsaResident = true, result: "YES / N̶O̶"
If rsaResident = false, result: "Y̶E̶S̶ / NO"
```

---

## 📋 Implementation Order

1. **Fix PDF.js Worker** ✅ DONE
2. **Add Date Fields** ✅ DONE
3. **Fix Full-Width PDF Preview** (High Priority)
4. **Add Visual Field Highlighting** (High Priority)
5. **Fix Filled PDF Preview Modal** (High Priority)
6. **Add Template Delete** (Medium Priority)
7. **Add Template Edit** (Medium Priority)
8. **Create Admin Panel** (Medium Priority)
9. **Add Dynamic Field Creation** (Medium Priority)
10. **Implement YES/NO Strikethrough** (Low Priority)

---

## 🔧 Technical Notes

### File Locations
- Company Profile: `data/company_profile.json`
- Templates: `templates/{templateId}/mapping.json`
- Template Designer: `app/template-designer/page.tsx`
- Template Processor: `lib/template-processor.ts`
- PDF Preview Modal: `components/PDFPreviewModal.tsx`

### Current Issues
- ✅ PDF.js worker error - FIXED
- ✅ Import path for company profile - FIXED
- ✅ Backward compatibility for old templates - FIXED
- ⚠️ PDF preview cuts off content - NEEDS FIX
- ⚠️ Filled PDF preview doesn't show - NEEDS FIX

---

## 🎯 Next Steps

**Immediate (Next Session):**
1. Fix full-width PDF preview in Template Designer
2. Add visual field highlighting with labels
3. Fix filled PDF preview modal

**Short Term:**
1. Template CRUD operations (delete, edit)
2. Admin panel for company profile editing

**Long Term:**
1. Dynamic field creation system
2. YES/NO checkbox with strikethrough
3. Advanced field types (dates with different formats, calculations, etc.)
