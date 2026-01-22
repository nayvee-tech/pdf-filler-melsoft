# SBD/RFQ Automation System

A high-end, single-tenant Next.js application for automating SBD (Standard Bidding Documents) and RFQ (Request for Quotation) form processing using AI.

## Features

- **Template Designer** for creating fixed-coordinate PDF mappings (admin-only)
- **Instant PDF filling** using saved templates (zero cost, 100% accuracy)
- **Template auto-detection** via filename and content fingerprinting
- **AWS Textract fallback** for unknown PDFs (optional AI detection)
- **Drag-and-drop PDF upload** with visual feedback
- **Preview with field highlights** showing detected/mapped fields
- **Nudge controls** to manually adjust AI-detected field positions/left/right before final signing
- **✍️ Signature Placement**: Automatically overlays the base64 signature onto Textract-detected signature boxes
- **🔒 Secure Authentication**: Password-protected access with cookie-based sessions
- **📁 Document Vault**: Temporary storage with automatic 3-hour expiration
- **♻️ Auto-Cleanup**: Automated cron job removes expired documents
- **📱 Fully Responsive**: Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **Animations**: Framer Motion
- **PDF Processing**: pdf-lib
- **Document Analysis**: AWS Textract (`AnalyzeDocumentCommand`)
- **Auto-Cleanup**: node-cron
- **Language**: TypeScript

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Application Access Password
APP_PASSWORD=your_secure_password_here

# AWS Credentials (Textract)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=af-south-1
```

Your AWS identity must have permission:

- `textract:AnalyzeDocument`

### 3. Configure Company Profile

Edit `src/data/company_profile.json` with your company information:

```json
{
  "company": {
    "name": "Your Company Name",
    "registrationNumber": "...",
    "vatNumber": "...",
    ...
  },
  "signature": {
    "name": "Signatory Name",
    "title": "Position",
    "base64": "data:image/png;base64,..."
  }
}
```

**To add your signature:**
1. Create a transparent PNG of your signature
2. Convert to base64: https://base64.guru/converter/encode/image
3. Paste the full data URI into the `signature.base64` field

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your `APP_PASSWORD`.

## Application Structure

```
├── app/
│   ├── page.tsx              # Upload page with drag-and-drop
│   ├── profile/              # Company profile viewer
│   ├── vault/                # Document vault
│   ├── login/                # Authentication page
│   └── api/
│       ├── auth/             # Login/logout endpoints
│       ├── analyze-pdf/      # Textract analysis endpoint (returns detected boxes)
│       ├── sign-pdf/         # Signs/stamps using detected boxes + nudges
│       ├── process-pdf/      # Legacy endpoint
│       └── vault/            # Document management
├── components/
│   ├── Navigation.tsx        # Main navigation bar
│   └── ui/                   # Shadcn UI components
├── lib/
│   ├── auth.ts               # Authentication utilities
│   ├── pdf-processor.ts      # Legacy processor (kept temporarily)
│   ├── textract.ts           # Textract helper + block parsing
│   ├── cleanup-cron.ts       # Auto-cleanup cron job
│   └── utils.ts              # Utility functions
├── src/data/
│   └── company_profile.json  # Company information
└── public/temp-docs/         # Temporary document storage
```

## How It Works

1. **Upload**: User drops a PDF
2. **Analyze (AWS Textract)**: Textract detects key/value fields and signature boxes
3. **Preview**: The PDF is shown with subtle yellow highlights over detected fields
4. **Nudge**: User can nudge a selected field by 5px to correct scan/layout quirks
5. **Sign & Stamp**: Server stamps company profile values into the detected boxes and overlays signature into detected signature box
6. **Confirm & Download**: Download happens only after confirmation
7. **Storage/Cleanup**: Signed and source PDFs are stored temporarily and cleaned up by cron

## Smart Coordinate Mapping

The system uses intelligent coordinate mapping to ensure text is placed exactly where it should be:

### Known Forms (Predefined Coordinates)

The system recognizes these forms and uses precise, pre-tested coordinates:

- **SBD1 (Department of Tourism)**: Standard bidding document with predefined field positions
- **RFP 201891 (SABS)**: South African Bureau of Standards RFP form

### Unknown Forms (AI-Powered)

For forms not in the database, GPT-4o-mini analyzes the PDF and generates coordinate mappings in real-time.

### Adding New Form Mappings

To add a new known form, edit `lib/mapping_logic.ts`:

```typescript
export const YOUR_FORM_MAPPING: FormMapping = {
  'company_name': { x: 150, y: 180, page: 0, fontSize: 10, maxWidth: 400 },
  'vat_number': { x: 150, y: 420, page: 0, fontSize: 10, maxWidth: 200 },
  // Add more fields...
};
```

Then update the `detectFormType()` function to recognize your form.

## Security Features

- Password-protected access gate
- HTTP-only secure cookies
- No database (all data in JSON files)
- Automatic file expiration (3 hours)
- Middleware-based route protection

## Customization

### Colors

Edit `app/globals.css` to change the color scheme:

```css
:root {
  --primary: #0F172A;      /* Deep Navy */
  --secondary: #D4AF37;    /* Success Gold */
  --accent: #059669;       /* Professional Emerald */
  --background: #F8FAFC;   /* Off-white */
}
```

### Animations

Animations are configured in individual components using Framer Motion. Key animations:
- Fade in & slide up on page load
- Pulse effect on upload drop-zone
- Smooth progress bar during processing
- Confetti on successful completion

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Ensure these are set in your production environment:
- `APP_PASSWORD`: Strong, unique password
- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Set to `production`

### Important Notes

- Ensure `public/temp-docs/` directory has write permissions
- Cron job runs automatically on server start
- Documents are deleted after 3 hours for security
- No persistent database required

## Troubleshooting

**Login not working?**
- Check that `APP_PASSWORD` is set in `.env.local`
- Clear browser cookies and try again

**PDF processing fails?**
- Verify `OPENAI_API_KEY` is valid and has credits
- Check that PDF is under 10MB
- Ensure PDF is not password-protected

**Documents not appearing in vault?**
- Check `public/temp-docs/` directory permissions
- Verify cron job is running (check server logs)

## License

Proprietary - Melsoft Solutions (Pty) Ltd

## Support

For support, contact: info@melsoft.co.za
